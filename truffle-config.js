require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  networks: {
    gravityalpha: {
      provider: () =>
        new HDWalletProvider({
          privateKeys: [process.env.PRIVATE_KEY],
          providerOrUrl: process.env.RPC_URL,
        }),
      network_id: '1625',
      gas: 15000000,       // Increased gas limit from 5,000,000 to 15,000,000
      gasPrice: 20000000000, // 20 Gwei
    },
  },
  compilers: {
    solc: {
      version: '0.8.20',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
};
