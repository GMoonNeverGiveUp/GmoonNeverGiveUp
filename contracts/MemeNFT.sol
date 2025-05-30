// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title NGU Meme NFT – SBT + Collectibles
/// @notice Soulbound Token for on-chain reputation + optional collectible minting
contract MemeNFT is ERC721URIStorage, AccessControl {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @dev marks an SBT as non-transferable
    mapping(uint256 => bool) private _soulbound;

    event SBTMinted(address indexed to, uint256 indexed tokenId, string uri);
    event CollectibleMinted(address indexed to, uint256 indexed tokenId, string uri);

    constructor() ERC721("NGU Meme", "NGUM") {
        // grant deployer admin & minter roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /// @notice Mint a free Soulbound NFT
    function mintFreeSBT(address to, string calldata uri)
        external
        onlyRole(MINTER_ROLE)
        returns (uint256)
    {
        _tokenIds.increment();
        uint256 id = _tokenIds.current();

        _safeMint(to, id);
        _setTokenURI(id, uri);
        _soulbound[id] = true;

        emit SBTMinted(to, id, uri);
        return id;
    }

    /// @notice Mint a transferable collectible NFT
    function mintCollectible(address to, string calldata uri)
        external
        onlyRole(MINTER_ROLE)
        returns (uint256)
    {
        _tokenIds.increment();
        uint256 id = _tokenIds.current();

        _safeMint(to, id);
        _setTokenURI(id, uri);

        emit CollectibleMinted(to, id, uri);
        return id;
    }

    /// @dev Prevent transfers of soulbound tokens
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 /*batchSize*/
    ) internal override {
        require(
            !_soulbound[tokenId] || from == address(0),
            "MemeNFT: SBT is non-transferable"
        );
        super._beforeTokenTransfer(from, to, tokenId, 1);
    }

    /// @notice Disable approvals on soulbound tokens
    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert("MemeNFT: soulbound tokens cannot be approved");
    }

    /// @notice Disable operator approvals on soulbound tokens
    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert("MemeNFT: soulbound tokens cannot be approved");
    }

    // ← storage gap for future upgrades
    uint256[50] private __gap;
}
