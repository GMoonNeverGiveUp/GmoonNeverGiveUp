// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MemeContest is ERC721URIStorage, Ownable {
    using SafeERC20 for IERC20;

    // NGU token instance used for fee payments
    IERC20 public nguToken;

    // Fee settings for various actions (denominated in smallest NGU token units)
    uint256 public creationFee;    // Fee for meme creation (if needed)
    uint256 public mintingFee;     // Fee for minting a meme NFT
    uint256 public submissionFee;  // Fee for submitting a meme to contest
    uint256 public voteFee;        // Fee per vote

    // Counter for meme token IDs
    uint256 public currentTokenId;

    // Structure to store meme details
    struct Meme {
        uint256 tokenId;
        address creator;
        string memeURI;
        uint256 voteCount;
        bool minted;    // Indicates whether the NFT has been minted
        bool submitted; // Indicates if the meme has been submitted to contest
    }

    // Mapping from tokenId to Meme data
    mapping(uint256 => Meme) public memes;

    // Whitelist for Galactic G users (must be added via admin/Discord verification)
    mapping(address => bool) public isGalacticG;

    // Events for logging activities
    event MemeSubmitted(uint256 indexed tokenId, address indexed creator, string memeURI);
    event MemeMinted(uint256 indexed tokenId, address indexed creator);
    event MemeVoted(uint256 indexed tokenId, address indexed voter, uint256 voteCount);

    /**
     * @dev Constructor sets the NGU token address and default fee amounts.
     * Adjust the fee values based on NGU token decimals (commonly 18 decimals).
     */
    constructor(IERC20 _nguToken) ERC721("NGU Meme", "NGUM") Ownable(msg.sender) {
        nguToken = _nguToken;
        // Example fee settings (adjust as needed)
        creationFee    = 10 * (10 ** 18); // e.g. 10 NGU tokens
        mintingFee     = 5  * (10 ** 18); // e.g. 5 NGU tokens
        submissionFee  = 2  * (10 ** 18); // e.g. 2 NGU tokens
        voteFee        = 1  * (10 ** 18); // e.g. 1 NGU token per vote
        currentTokenId = 0;
    }

    /**
     * @dev Modifier to restrict functions to Galactic G role holders.
     */
    modifier onlyGalacticGRole() {
        require(isGalacticG[msg.sender], "Only Galactic G role owners allowed");
        _;
    }

    /**
     * @dev Owner can add or remove addresses that have the Galactic G role.
     */
    function addGalacticG(address _user) external onlyOwner {
        isGalacticG[_user] = true;
    }
    
    function removeGalacticG(address _user) external onlyOwner {
        isGalacticG[_user] = false;
    }

    /**
     * @dev Owner function to update fee amounts.
     */
    function setFees(
        uint256 _creationFee,
        uint256 _mintingFee,
        uint256 _submissionFee,
        uint256 _voteFee
    ) external onlyOwner {
        creationFee    = _creationFee;
        mintingFee     = _mintingFee;
        submissionFee  = _submissionFee;
        voteFee        = _voteFee;
    }

    /**
     * @dev Submit a meme for contest participation.
     * The caller must pay the submission fee in NGU tokens.
     * Only whitelisted Galactic G users can submit memes.
     */
    function submitMeme(string calldata memeURI) external onlyGalacticGRole {
        // Transfer submission fee from the user to this contract
        nguToken.safeTransferFrom(msg.sender, address(this), submissionFee);

        // Increment token counter and store meme details
        currentTokenId++;
        memes[currentTokenId] = Meme({
            tokenId: currentTokenId,
            creator: msg.sender,
            memeURI: memeURI,
            voteCount: 0,
            minted: false,
            submitted: true
        });

        emit MemeSubmitted(currentTokenId, msg.sender, memeURI);
    }

    /**
     * @dev Mint an NFT for a submitted meme.
     * The caller must be the original creator and pay the minting fee.
     */
    function mintMeme(uint256 memeId) external onlyGalacticGRole {
        Meme storage meme = memes[memeId];
        require(meme.creator == msg.sender, "Only creator can mint");
        require(meme.submitted, "Meme not submitted");
        require(!meme.minted, "Meme already minted");

        // Transfer minting fee in NGU tokens
        nguToken.safeTransferFrom(msg.sender, address(this), mintingFee);

        // Mint the NFT and assign its URI
        _safeMint(msg.sender, memeId);
        _setTokenURI(memeId, meme.memeURI);
        meme.minted = true;

        emit MemeMinted(memeId, msg.sender);
    }

    /**
     * @dev Vote on a submitted meme by paying the vote fee.
     * Each call increases the meme's vote count by one.
     */
    function voteMeme(uint256 memeId) external onlyGalacticGRole {
        // Transfer vote fee from the voter
        nguToken.safeTransferFrom(msg.sender, address(this), voteFee);
        Meme storage meme = memes[memeId];
        require(meme.submitted, "Meme not submitted");

        // Increment vote count
        meme.voteCount += 1;

        emit MemeVoted(memeId, msg.sender, meme.voteCount);
    }

    /**
     * @dev Admin function to distribute rewards from collected fees.
     */
    function distributeRewards(address[] calldata winners, uint256[] calldata rewards) external onlyOwner {
        require(winners.length == rewards.length, "Mismatched array lengths");

        uint256 totalReward;
        for (uint256 i = 0; i < winners.length; i++) {
            totalReward += rewards[i];
        }
        require(nguToken.balanceOf(address(this)) >= totalReward, "Insufficient balance for rewards");

        for (uint256 i = 0; i < winners.length; i++) {
            nguToken.safeTransfer(winners[i], rewards[i]);
        }
    }

    /**
     * @dev Owner can withdraw accumulated NGU tokens (fees) from the contract.
     */
    function withdrawFees(uint256 amount) external onlyOwner {
        nguToken.safeTransfer(owner(), amount);
    }
}