// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SoulBoundToken is ERC721, Ownable {
    mapping(uint256 => uint256) public reputationPoints;

    constructor() ERC721("NGU Soul Bound Token", "NGUSBT") Ownable(msg.sender) {
        // No storage writes
    }

    function mint(address to) public onlyOwner {
        uint256 tokenId = uint256(keccak256(abi.encodePacked(to)));
        require(ownerOf(tokenId) == address(0), "Token already minted for this address");
        _mint(to, tokenId);
    }

    function updateReputation(uint256 tokenId, uint256 points) public onlyOwner {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        reputationPoints[tokenId] += points;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "SoulBoundToken: Token is non-transferable");
        return super._update(to, tokenId, auth);
    }

    // Updated to 'pure' as it does not read from state.
    function userTokenId(address user) public pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(user)));
    }
}
