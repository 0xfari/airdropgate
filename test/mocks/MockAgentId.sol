// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @notice Minimal stand-in for the SPACE ID Agent ID contract (ERC-721).
contract MockAgentId is ERC721 {
    uint256 private _nextId;

    constructor() ERC721("Agent ID", "AI") {}

    function mint(address to) external returns (uint256 tokenId) {
        tokenId = ++_nextId;
        _mint(to, tokenId);
    }
}
