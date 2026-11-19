// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AirdropGate
/// @notice Airdrop claims gated by Agent ID (SPACE ID, ERC-721, non-transferable).
/// @dev A project funds a campaign; only wallets holding an Agent ID can claim,
/// one claim per wallet. Two campaign kinds:
///   - Allowlist: merkleRoot != 0, claimer must be in the merkle tree.
///   - Open: merkleRoot == 0, any Agent ID holder may claim.
/// The contract is ownerless. Each campaign's creator can only cancel their own
/// campaign (before its deadline) and reclaim its unclaimed funds (after the
/// deadline passes or after cancelling). No pause, no upgrade proxy, no admin.
contract AirdropGate is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice The Agent ID ERC-721 contract. Immutable, set once at deploy.
    address public immutable agentId;

    struct Campaign {
        address creator;
        address token;
        bytes32 merkleRoot; // bytes32(0) = open campaign
        uint256 amountPerClaim;
        uint256 deadline; // unix timestamp, claims allowed while block.timestamp <= deadline
        uint256 maxClaims;
        uint256 claimedCount;
        uint256 funded; // total tokens pulled from the creator at creation
        bool cancelled;
    }

    uint256 public campaignCount;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => bool)) public claimed;

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        address indexed token,
        bytes32 merkleRoot,
        uint256 amountPerClaim,
        uint256 deadline,
        uint256 maxClaims
    );
    event Claimed(uint256 indexed campaignId, address indexed claimer, uint256 amount);
    event CampaignCancelled(uint256 indexed campaignId, address indexed creator);
    event Reclaimed(uint256 indexed campaignId, address indexed creator, uint256 amount);

    error InvalidToken();
    error InvalidAmount();
    error InvalidMaxClaims();
    error InvalidDeadline();
    error CampaignNotFound();
    error CampaignIsCancelled();
    error ClaimPeriodEnded();
    error CancelPeriodEnded();
    error MaxClaimsReached();
    error AlreadyClaimed();
    error NotAgentIdHolder();
    error InvalidProof();
    error NotCreator();
    error NotReclaimable();
    error NothingToReclaim();

    constructor(address _agentId) {
        if (_agentId == address(0)) revert InvalidToken();
        agentId = _agentId;
    }

    /// @notice Create a campaign, pulling amountPerClaim * maxClaims tokens from the caller.
    /// @param token ERC-20 token to distribute. Caller must approve this contract first.
    /// @param merkleRoot Allowlist root, or bytes32(0) for an open campaign.
    /// @param amountPerClaim Tokens each claimer receives.
    /// @param deadline Unix timestamp; claims allowed while block.timestamp <= deadline.
    /// @param maxClaims Maximum number of claims for this campaign.
    /// @return campaignId The new campaign's id.
    function createCampaign(
        address token,
        bytes32 merkleRoot,
        uint256 amountPerClaim,
        uint256 deadline,
        uint256 maxClaims
    ) external returns (uint256 campaignId) {
        if (token == address(0)) revert InvalidToken();
        if (amountPerClaim == 0) revert InvalidAmount();
        if (maxClaims == 0) revert InvalidMaxClaims();
        if (deadline <= block.timestamp) revert InvalidDeadline();

        uint256 total = amountPerClaim * maxClaims;
        campaignId = campaignCount;
        campaignCount++;

        campaigns[campaignId] = Campaign({
            creator: msg.sender,
            token: token,
            merkleRoot: merkleRoot,
            amountPerClaim: amountPerClaim,
            deadline: deadline,
            maxClaims: maxClaims,
            claimedCount: 0,
            funded: total,
            cancelled: false
        });

        IERC20(token).safeTransferFrom(msg.sender, address(this), total);

        emit CampaignCreated(
            campaignId, msg.sender, token, merkleRoot, amountPerClaim, deadline, maxClaims
        );
    }

    /// @notice Claim from a campaign. Caller must hold an Agent ID and (for allowlist
    /// campaigns) prove membership with a merkle proof of keccak256(abi.encodePacked(msg.sender)).
    /// @param campaignId The campaign to claim from.
    /// @param proof Merkle proof; empty for open campaigns.
    function claim(uint256 campaignId, bytes32[] calldata proof) external nonReentrant {
        Campaign storage c = campaigns[campaignId];
        if (campaignId >= campaignCount) revert CampaignNotFound();
        if (c.cancelled) revert CampaignIsCancelled();
        if (block.timestamp > c.deadline) revert ClaimPeriodEnded();
        if (c.claimedCount >= c.maxClaims) revert MaxClaimsReached();
        if (claimed[campaignId][msg.sender]) revert AlreadyClaimed();
        if (!isAgentIdHolder(msg.sender)) revert NotAgentIdHolder();
        if (c.merkleRoot != bytes32(0)) {
            bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
            if (!MerkleProof.verify(proof, c.merkleRoot, leaf)) revert InvalidProof();
        }

        claimed[campaignId][msg.sender] = true;
        c.claimedCount++;

        IERC20(c.token).safeTransfer(msg.sender, c.amountPerClaim);

        emit Claimed(campaignId, msg.sender, c.amountPerClaim);
    }

    /// @notice Cancel your own campaign before its deadline. Claims stop immediately;
    /// unclaimed funds become reclaimable.
    function cancelCampaign(uint256 campaignId) external {
        Campaign storage c = campaigns[campaignId];
        if (campaignId >= campaignCount) revert CampaignNotFound();
        if (msg.sender != c.creator) revert NotCreator();
        if (c.cancelled) revert CampaignIsCancelled();
        if (block.timestamp > c.deadline) revert CancelPeriodEnded();

        c.cancelled = true;

        emit CampaignCancelled(campaignId, msg.sender);
    }

    /// @notice Reclaim your campaign's unclaimed funds. Only the creator, only after
    /// the deadline has passed or the campaign was cancelled.
    function reclaim(uint256 campaignId) external nonReentrant {
        Campaign storage c = campaigns[campaignId];
        if (campaignId >= campaignCount) revert CampaignNotFound();
        if (msg.sender != c.creator) revert NotCreator();
        if (!c.cancelled && block.timestamp <= c.deadline) revert NotReclaimable();

        uint256 unclaimed = c.funded - c.claimedCount * c.amountPerClaim;
        if (unclaimed == 0) revert NothingToReclaim();

        c.funded = c.claimedCount * c.amountPerClaim;

        IERC20(c.token).safeTransfer(msg.sender, unclaimed);

        emit Reclaimed(campaignId, msg.sender, unclaimed);
    }

    /// @notice True if `account` holds at least one Agent ID.
    function isAgentIdHolder(address account) public view returns (bool) {
        return IERC721(agentId).balanceOf(account) > 0;
    }

    /// @notice True if `account` already claimed from `campaignId`.
    function hasClaimed(uint256 campaignId, address account) external view returns (bool) {
        return claimed[campaignId][account];
    }

    /// @notice Unclaimed slots left in a campaign. 0 once cancelled.
    function remaining(uint256 campaignId) external view returns (uint256) {
        Campaign storage c = campaigns[campaignId];
        if (campaignId >= campaignCount) revert CampaignNotFound();
        if (c.cancelled) return 0;
        return c.maxClaims - c.claimedCount;
    }
}
