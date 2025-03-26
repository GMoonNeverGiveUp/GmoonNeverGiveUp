// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SoulBoundToken is ERC721, ERC721Enumerable, Ownable {
    uint256 private _tokenIdCounter;
    mapping(address => bool) private _hasMinted;
    mapping(uint256 => uint256) public reputationPoints;

    constructor() ERC721("NGU Soul Bound Token", "NGUSBT") Ownable(msg.sender) {
        _tokenIdCounter = 0;
    }

    function mint(address to) public onlyOwner {
        require(!_hasMinted[to], "Address has already minted an SBT");
        _tokenIdCounter += 1;
        _mint(to, _tokenIdCounter);
        _hasMinted[to] = true;
    }

    function updateReputation(uint256 tokenId, uint256 points) public onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        reputationPoints[tokenId] += points;
    }

    // Override required by ERC721Enumerable
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "SoulBoundToken: Token is non-transferable");
        return super._update(to, tokenId, auth);
    }

    // Override required by ERC721Enumerable
    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    // Override required by ERC721Enumerable
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}