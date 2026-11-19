// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AirdropGate} from "../src/AirdropGate.sol";
import {MockAgentId} from "./mocks/MockAgentId.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract AirdropGateTest is Test {
    AirdropGate public gate;
    MockAgentId public agentId;
    MockERC20 public token;

    address public creator = address(0xC0EA7E0);
    address public holder1 = address(0xA11CE);
    address public holder2 = address(0xB0B);
    address public holder3 = address(0xC10C); // Agent ID holder, NOT in the allowlist
    address public nonHolder = address(0xDEAD);

    uint256 public constant AMOUNT = 100;
    uint256 public constant MAX_CLAIMS = 2;
    uint256 public deadline;

    bytes32 public leaf1;
    bytes32 public leaf2;
    bytes32 public allowlistRoot;

    function setUp() public {
        agentId = new MockAgentId();
        token = new MockERC20();
        gate = new AirdropGate(address(agentId));
        deadline = block.timestamp + 7 days;

        // Agent IDs for the two allowlist members + one outsider holder.
        agentId.mint(holder1);
        agentId.mint(holder2);
        agentId.mint(holder3);

        // Funding for the creator.
        token.mint(creator, 1_000_000);
        vm.prank(creator);
        token.approve(address(gate), type(uint256).max);

        // Two-leaf allowlist tree [holder1, holder2], sorted pairs (OZ MerkleProof).
        leaf1 = keccak256(abi.encodePacked(holder1));
        leaf2 = keccak256(abi.encodePacked(holder2));
        allowlistRoot = leaf1 < leaf2
            ? keccak256(abi.encodePacked(leaf1, leaf2))
            : keccak256(abi.encodePacked(leaf2, leaf1));
    }

    // -- helpers ----------------------------------------------------------

    function _createAllowlistCampaign() internal returns (uint256 id) {
        vm.prank(creator);
        id = gate.createCampaign(address(token), allowlistRoot, AMOUNT, deadline, MAX_CLAIMS);
    }

    function _createOpenCampaign() internal returns (uint256 id) {
        vm.prank(creator);
        id = gate.createCampaign(address(token), bytes32(0), AMOUNT, deadline, MAX_CLAIMS);
    }

    function _proofForHolder1() internal view returns (bytes32[] memory proof) {
        proof = new bytes32[](1);
        proof[0] = leaf2;
    }

    function _proofForHolder2() internal view returns (bytes32[] memory proof) {
        proof = new bytes32[](1);
        proof[0] = leaf1;
    }

    // -- createCampaign ---------------------------------------------------

    function testCreateCampaignPullsExactFunding() public {
        uint256 creatorBefore = token.balanceOf(creator);

        vm.expectEmit(true, true, true, true, address(gate));
        emit AirdropGate.CampaignCreated(0, creator, address(token), allowlistRoot, AMOUNT, deadline, MAX_CLAIMS);

        vm.prank(creator);
        uint256 id = gate.createCampaign(address(token), allowlistRoot, AMOUNT, deadline, MAX_CLAIMS);

        assertEq(id, 0);
        assertEq(gate.campaignCount(), 1);
        assertEq(token.balanceOf(address(gate)), AMOUNT * MAX_CLAIMS);
        assertEq(token.balanceOf(creator), creatorBefore - AMOUNT * MAX_CLAIMS);

        (
            address cCreator,
            address cToken,
            bytes32 cRoot,
            uint256 cAmount,
            uint256 cDeadline,
            uint256 cMax,
            uint256 cClaimed,
            uint256 cFunded,
            bool cCancelled
        ) = gate.campaigns(0);
        assertEq(cCreator, creator);
        assertEq(cToken, address(token));
        assertEq(cRoot, allowlistRoot);
        assertEq(cAmount, AMOUNT);
        assertEq(cDeadline, deadline);
        assertEq(cMax, MAX_CLAIMS);
        assertEq(cClaimed, 0);
        assertEq(cFunded, AMOUNT * MAX_CLAIMS);
        assertFalse(cCancelled);
    }

    function testCreateCampaignRevertsOnZeroAmount() public {
        vm.prank(creator);
        vm.expectRevert(AirdropGate.InvalidAmount.selector);
        gate.createCampaign(address(token), allowlistRoot, 0, deadline, MAX_CLAIMS);
    }

    function testCreateCampaignRevertsOnZeroMaxClaims() public {
        vm.prank(creator);
        vm.expectRevert(AirdropGate.InvalidMaxClaims.selector);
        gate.createCampaign(address(token), allowlistRoot, AMOUNT, deadline, 0);
    }

    function testCreateCampaignRevertsOnPastDeadline() public {
        vm.prank(creator);
        vm.expectRevert(AirdropGate.InvalidDeadline.selector);
        gate.createCampaign(address(token), allowlistRoot, AMOUNT, block.timestamp, MAX_CLAIMS);
    }

    function testCreateCampaignRevertsOnZeroToken() public {
        vm.prank(creator);
        vm.expectRevert(AirdropGate.InvalidToken.selector);
        gate.createCampaign(address(0), allowlistRoot, AMOUNT, deadline, MAX_CLAIMS);
    }

    function testCreateCampaignRevertsWithoutAllowance() public {
        address poor = address(0x9009);
        token.mint(poor, 1000);
        vm.prank(poor);
        vm.expectRevert();
        gate.createCampaign(address(token), allowlistRoot, AMOUNT, deadline, MAX_CLAIMS);
    }

    // -- claim: happy paths -----------------------------------------------

    function testAllowlistHappyPath() public {
        uint256 id = _createAllowlistCampaign();

        vm.expectEmit(true, true, false, true, address(gate));
        emit AirdropGate.Claimed(id, holder1, AMOUNT);

        vm.prank(holder1);
        gate.claim(id, _proofForHolder1());

        assertEq(token.balanceOf(holder1), AMOUNT);
        assertTrue(gate.hasClaimed(id, holder1));
        assertEq(gate.remaining(id), MAX_CLAIMS - 1);

        // Second member claims too.
        vm.prank(holder2);
        gate.claim(id, _proofForHolder2());
        assertEq(token.balanceOf(holder2), AMOUNT);
        assertEq(gate.remaining(id), 0);
    }

    function testOpenCampaignAnyAgentHolder() public {
        uint256 id = _createOpenCampaign();

        vm.prank(holder3); // holder, not in any list — open campaign needs no proof
        gate.claim(id, new bytes32[](0));
        assertEq(token.balanceOf(holder3), AMOUNT);

        vm.prank(holder1);
        gate.claim(id, new bytes32[](0));
        assertEq(token.balanceOf(holder1), AMOUNT);
    }

    // -- claim: reverts ---------------------------------------------------

    function testNonHolderReverts() public {
        uint256 id = _createOpenCampaign();
        vm.prank(nonHolder);
        vm.expectRevert(AirdropGate.NotAgentIdHolder.selector);
        gate.claim(id, new bytes32[](0));
    }

    function testNonHolderRevertsOnAllowlistToo() public {
        uint256 id = _createAllowlistCampaign();
        vm.prank(nonHolder);
        vm.expectRevert(AirdropGate.NotAgentIdHolder.selector);
        gate.claim(id, _proofForHolder1());
    }

    function testDoubleClaimReverts() public {
        uint256 id = _createAllowlistCampaign();
        vm.prank(holder1);
        gate.claim(id, _proofForHolder1());

        vm.prank(holder1);
        vm.expectRevert(AirdropGate.AlreadyClaimed.selector);
        gate.claim(id, _proofForHolder1());
    }

    function testWrongProofReverts() public {
        uint256 id = _createAllowlistCampaign();
        // holder1 submits holder2's proof (leaf1 instead of leaf2).
        vm.prank(holder1);
        vm.expectRevert(AirdropGate.InvalidProof.selector);
        gate.claim(id, _proofForHolder2());

        // Empty proof also fails for an allowlist campaign.
        vm.prank(holder1);
        vm.expectRevert(AirdropGate.InvalidProof.selector);
        gate.claim(id, new bytes32[](0));
    }

    function testNonMemberReverts() public {
        uint256 id = _createAllowlistCampaign();
        // holder3 holds an Agent ID but is not in the tree; any proof fails.
        vm.prank(holder3);
        vm.expectRevert(AirdropGate.InvalidProof.selector);
        gate.claim(id, _proofForHolder1());
    }

    function testAfterDeadlineReverts() public {
        uint256 id = _createAllowlistCampaign();
        vm.warp(deadline + 1);
        vm.prank(holder1);
        vm.expectRevert(AirdropGate.ClaimPeriodEnded.selector);
        gate.claim(id, _proofForHolder1());
    }

    function testClaimAtExactDeadlineSucceeds() public {
        uint256 id = _createAllowlistCampaign();
        vm.warp(deadline);
        vm.prank(holder1);
        gate.claim(id, _proofForHolder1());
        assertEq(token.balanceOf(holder1), AMOUNT);
    }

    function testCancelBlocksClaims() public {
        uint256 id = _createAllowlistCampaign();
        vm.prank(creator);
        gate.cancelCampaign(id);

        assertEq(gate.remaining(id), 0);

        vm.prank(holder1);
        vm.expectRevert(AirdropGate.CampaignIsCancelled.selector);
        gate.claim(id, _proofForHolder1());
    }

    function testMaxClaimsReached() public {
        uint256 id = _createAllowlistCampaign();
        vm.prank(holder1);
        gate.claim(id, _proofForHolder1());
        vm.prank(holder2);
        gate.claim(id, _proofForHolder2());

        // holder3 is a holder but the campaign is full.
        vm.prank(holder3);
        vm.expectRevert(AirdropGate.MaxClaimsReached.selector);
        gate.claim(id, new bytes32[](0));
    }

    function testClaimNonexistentCampaignReverts() public {
        vm.prank(holder1);
        vm.expectRevert(AirdropGate.CampaignNotFound.selector);
        gate.claim(999, new bytes32[](0));
    }

    // -- cancel -----------------------------------------------------------

    function testCancelOnlyCreator() public {
        uint256 id = _createAllowlistCampaign();
        vm.prank(holder1);
        vm.expectRevert(AirdropGate.NotCreator.selector);
        gate.cancelCampaign(id);
    }

    function testCancelAfterDeadlineReverts() public {
        uint256 id = _createAllowlistCampaign();
        vm.warp(deadline + 1);
        vm.prank(creator);
        vm.expectRevert(AirdropGate.CancelPeriodEnded.selector);
        gate.cancelCampaign(id);
    }

    function testCancelTwiceReverts() public {
        uint256 id = _createAllowlistCampaign();
        vm.prank(creator);
        gate.cancelCampaign(id);
        vm.prank(creator);
        vm.expectRevert(AirdropGate.CampaignIsCancelled.selector);
        gate.cancelCampaign(id);
    }

    // -- reclaim ----------------------------------------------------------

    function testReclaimOnlyAfterDeadlineOrCancelAndOnlyCreator() public {
        uint256 id = _createAllowlistCampaign();

        // Too early, not cancelled.
        vm.prank(creator);
        vm.expectRevert(AirdropGate.NotReclaimable.selector);
        gate.reclaim(id);

        // Non-creator can never reclaim.
        vm.warp(deadline + 1);
        vm.prank(holder1);
        vm.expectRevert(AirdropGate.NotCreator.selector);
        gate.reclaim(id);
    }

    function testReclaimAmountMathExact() public {
        uint256 id = _createAllowlistCampaign();
        uint256 creatorBefore = token.balanceOf(creator);

        // One of two claims taken (100 of 200 funded).
        vm.prank(holder1);
        gate.claim(id, _proofForHolder1());

        vm.warp(deadline + 1);

        vm.expectEmit(true, true, false, true, address(gate));
        emit AirdropGate.Reclaimed(id, creator, AMOUNT * (MAX_CLAIMS - 1));

        vm.prank(creator);
        gate.reclaim(id);

        assertEq(token.balanceOf(creator), creatorBefore + AMOUNT * (MAX_CLAIMS - 1));
        assertEq(token.balanceOf(address(gate)), 0); // claimed 100 left at claim time, unclaimed 100 left at reclaim
    }

    function testReclaimAfterCancelBeforeDeadline() public {
        uint256 id = _createAllowlistCampaign();
        uint256 creatorBefore = token.balanceOf(creator);

        vm.prank(creator);
        gate.cancelCampaign(id);

        vm.prank(creator);
        gate.reclaim(id);

        assertEq(token.balanceOf(creator), creatorBefore + AMOUNT * MAX_CLAIMS);
        assertEq(token.balanceOf(address(gate)), 0);
    }

    function testReclaimNothingToReclaim() public {
        uint256 id = _createAllowlistCampaign();
        vm.prank(holder1);
        gate.claim(id, _proofForHolder1());
        vm.prank(holder2);
        gate.claim(id, _proofForHolder2());

        vm.warp(deadline + 1);
        vm.prank(creator);
        vm.expectRevert(AirdropGate.NothingToReclaim.selector);
        gate.reclaim(id);
    }

    function testReclaimTwiceReverts() public {
        uint256 id = _createAllowlistCampaign();
        vm.prank(holder1);
        gate.claim(id, _proofForHolder1());
        vm.warp(deadline + 1);
        vm.prank(creator);
        gate.reclaim(id);
        // Second reclaim: unclaimed is now 0.
        vm.prank(creator);
        vm.expectRevert(AirdropGate.NothingToReclaim.selector);
        gate.reclaim(id);
    }

    // -- views ------------------------------------------------------------

    function testViews() public {
        uint256 id = _createAllowlistCampaign();
        assertTrue(gate.isAgentIdHolder(holder1));
        assertTrue(gate.isAgentIdHolder(holder2));
        assertFalse(gate.isAgentIdHolder(nonHolder));
        assertFalse(gate.hasClaimed(id, holder1));
        assertEq(gate.remaining(id), MAX_CLAIMS);
        assertEq(gate.campaignCount(), 1);
    }
}
