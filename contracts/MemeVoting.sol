// contracts/MemeVoting.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Meme Voting with $NGU ERC20 token (hardened)
/// @notice now supports treasury withdrawals and on‐chain burns
contract MemeVoting is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable nguToken;
    uint256 public minVoteAmount    = 100 * 1e18;      // 100 $NGU
    uint256 public minImpulseAmount = 500 * 1e18;      // 500 $NGU

    /// @notice total tokens staked per meme
    mapping(uint256 => uint256) public totalVotes;
    mapping(uint256 => uint256) public totalImpulses;

    /// @dev emitted when tokens are withdrawn from this contract
    event TokensWithdrawn(address indexed to, uint256 amount);
    /// @dev emitted when tokens are burned (sent to zero address)
    event TokensBurned(uint256 amount);
    /// @dev existing events
    event VoteCast(address indexed voter, uint256 indexed memeId, uint256 amount);
    event Impulsed(address indexed sponsor, uint256 indexed memeId, uint256 amount);

    constructor(address _nguToken) {
        require(_nguToken != address(0), "MemeVoting: zero token address");
        nguToken = IERC20(_nguToken);
    }

    /// @notice Stake $NGU to vote on a meme
    function vote(uint256 memeId, uint256 amount) external nonReentrant {
        require(amount >= minVoteAmount, "MemeVoting: amount below minVote");
        nguToken.safeTransferFrom(msg.sender, address(this), amount);
        totalVotes[memeId] += amount;
        emit VoteCast(msg.sender, memeId, amount);
    }

    /// @notice Stake $NGU to impulse/promote a meme
    function impulse(uint256 memeId, uint256 amount) external nonReentrant {
        require(amount >= minImpulseAmount, "MemeVoting: amount below minImpulse");
        nguToken.safeTransferFrom(msg.sender, address(this), amount);
        totalImpulses[memeId] += amount;
        emit Impulsed(msg.sender, memeId, amount);
    }

    /// @notice Owner can withdraw accumulated tokens for distribution
    function withdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "MemeVoting: zero recipient");
        require(amount > 0, "MemeVoting: zero amount");
        nguToken.safeTransfer(to, amount);
        emit TokensWithdrawn(to, amount);
    }

    /// @notice Owner can burn tokens held in this contract
    function burn(uint256 amount) external onlyOwner {
        require(amount > 0, "MemeVoting: zero amount");
        nguToken.safeTransfer(address(0), amount);
        emit TokensBurned(amount);
    }

    /// @notice Adjust minimum vote threshold
    function setMinVote(uint256 newMin) external onlyOwner {
        require(newMin > 0, "MemeVoting: newMin zero");
        minVoteAmount = newMin;
    }

    /// @notice Adjust minimum impulse threshold
    function setMinImpulse(uint256 newMin) external onlyOwner {
        require(newMin > 0, "MemeVoting: newMin zero");
        minImpulseAmount = newMin;
    }

    /// @dev storage gap for future upgrades
    uint256[50] private __gap;
}
