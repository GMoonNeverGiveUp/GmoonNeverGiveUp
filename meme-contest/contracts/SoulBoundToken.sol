// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SoulBoundToken is ERC721, Ownable {
    uint256 private _tokenIdCounter;
    mapping(address => bool) private _hasMinted;
    mapping(uint256 => uint256) public reputationPoints; // Token ID to reputation points
    mapping(uint256 => uint8) public profileMode; // Token ID to profile mode (0: Basic, 1: Medium, 2: Advanced)

    constructor() ERC721("NGU Soul Bound Token", "NGUSBT") Ownable(msg.sender) {
        _tokenIdCounter = 0;
    }

    function mint(address to, uint8 initialMode) public onlyOwner {
        require(!_hasMinted[to], "Address has already minted an SBT");
        _tokenIdCounter += 1;
        uint256 tokenId = _tokenIdCounter;
        _mint(to, tokenId);
        _hasMinted[to] = true;
        profileMode[tokenId] = initialMode; // Set initial profile mode
        reputationPoints[tokenId] = 0; // Initialize reputation
    }

    function updateReputation(uint256 tokenId, uint256 points) public onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        reputationPoints[tokenId] += points;
    }

    function upgradeProfile(uint256 tokenId, uint8 newMode) public onlyOwner {
        require(newMode > profileMode[tokenId], "Cannot downgrade profile mode");
        uint256 requiredReputation = getRequiredReputation(newMode);
        require(reputationPoints[tokenId] >= requiredReputation, "Insufficient reputation");
        profileMode[tokenId] = newMode;
    }

    function getRequiredReputation(uint8 mode) internal pure returns (uint256) {
        if (mode == 1) return 1000; // 1000 points for Medium
        if (mode == 2) return 5000; // 5000 points for Advanced
        return 0;
    }

    function transferFrom(address from, address to, uint256 tokenId) public override {
        revert("SoulBoundToken: Tokens are non-transferable");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override {
        revert("SoulBoundToken: Tokens are non-transferable");
    }
}