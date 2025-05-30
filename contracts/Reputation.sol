// contracts/Reputation.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title On‐chain Reputation Engine
/// @notice Allows only-owner (backend/controller) to assign points
contract Reputation is Ownable {
    mapping(address => uint256) private _scores;

    event PointsAdded(address indexed user, uint256 points);

    /// @notice Add reputation points to a user
    function addPoints(address user, uint256 points) external onlyOwner {
        _scores[user] += points;
        emit PointsAdded(user, points);
    }

    /// @notice Query current reputation score
    function getPoints(address user) external view returns (uint256) {
        return _scores[user];
    }
}
