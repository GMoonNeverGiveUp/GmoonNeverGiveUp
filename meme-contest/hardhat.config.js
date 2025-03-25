require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    gravityalpha: {
      url: process.env.RPC_URL || "https://your.gravityalpha.rpc.endpoint",
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};