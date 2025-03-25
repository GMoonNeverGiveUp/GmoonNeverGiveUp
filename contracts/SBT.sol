// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SoulBoundToken is ERC721, Ownable {
    uint256 private _tokenIdCounter;
    mapping(address => bool) private _hasMinted;

    constructor() ERC721("NGU Soul Bound Token", "NGUSBT") Ownable(msg.sender) {
        _tokenIdCounter = 0;
    }

    function mint(address to) public onlyOwner {
        require(!_hasMinted[to], "Address has already minted an SBT");
        _tokenIdCounter += 1;
        _mint(to, _tokenIdCounter);
        _hasMinted[to] = true;
    }

    function transferFrom(address /* from */, address /* to */, uint256 /* tokenId */) public pure override {
        revert("SoulBoundToken: Tokens are non-transferable");
    }

    function safeTransferFrom(address /* from */, address /* to */, uint256 /* tokenId */, bytes memory /* data */) public pure override {
        revert("SoulBoundToken: Tokens are non-transferable");
    }

    function hasSBT(address user) public view returns (bool) {
        return _hasMinted[user];
    }
}