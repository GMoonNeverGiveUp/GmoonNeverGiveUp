// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SoulBoundToken.sol"; // Assumes SBT contract is in the same directory

contract MemeContest is Ownable {
    SoulBoundToken public sbtContract;
    uint256 public contestStartTime;
    uint256 public contestEndTime;
    uint256 public constant CONTEST_DURATION = 7 days;

    struct Meme {
        uint256 tokenId; // SBT token ID of the creator
        string ipfsHash;
        uint256 voteCount;
        bool isWinner;
    }

    Meme[] public memes;
    mapping(address => uint256) public votesCast; // Tracks votes per user

    event MemeSubmitted(uint256 indexed tokenId, address indexed creator, string ipfsHash);
    event Voted(uint256 indexed memeId, address indexed voter);
    event ContestWinner(uint256 indexed memeId, address indexed winner);

    constructor(address _sbtAddress) Ownable(msg.sender) {
        sbtContract = SoulBoundToken(_sbtAddress);
        contestStartTime = block.timestamp;
        contestEndTime = contestStartTime + CONTEST_DURATION;
    }

    // Submit a meme (only Galactic G users with SBT)
    function submitMeme(string memory _ipfsHash) public {
        require(block.timestamp < contestEndTime, "Contest has ended");
        uint256 tokenId = sbtContract.tokenOfOwnerByIndex(msg.sender, 0); // Assumes one SBT per user
        require(sbtContract.profileMode(tokenId) >= 0, "Must have an SBT to submit");
        memes.push(Meme(tokenId, _ipfsHash, 0, false));
        emit MemeSubmitted(tokenId, msg.sender, _ipfsHash);
    }

    // Vote for a meme (only Spectator users with SBT)
    function voteForMeme(uint256 _memeId) public {
        require(block.timestamp < contestEndTime, "Contest has ended");
        require(_memeId < memes.length, "Invalid meme ID");
        uint256 tokenId = sbtContract.tokenOfOwnerByIndex(msg.sender, 0);
        require(sbtContract.profileMode(tokenId) >= 0, "Must have an SBT to vote");
        require(votesCast[msg.sender] < 1, "Already voted"); // Limit to one vote per contest
        memes[_memeId].voteCount += 1;
        votesCast[msg.sender] += 1;
        emit Voted(_memeId, msg.sender);
    }

    // End the contest and select winner (only owner)
    function endContest() public onlyOwner {
        require(block.timestamp >= contestEndTime, "Contest is still ongoing");
        uint256 winningMemeId = findWinningMeme();
        memes[winningMemeId].isWinner = true;
        address winner = sbtContract.ownerOf(memes[winningMemeId].tokenId);
        emit ContestWinner(winningMemeId, winner);
        // Reset for next contest
        contestStartTime = block.timestamp;
        contestEndTime = contestStartTime + CONTEST_DURATION;
        delete memes;
    }

    // Helper function to find the meme with the most votes
    function findWinningMeme() internal view returns (uint256) {
        uint256 maxVotes = 0;
        uint256 winningId = 0;
        for (uint256 i = 0; i < memes.length; i++) {
            if (memes[i].voteCount > maxVotes) {
                maxVotes = memes[i].voteCount;
                winningId = i;
            }
        }
        return winningId;
    }
}