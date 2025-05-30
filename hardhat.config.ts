// hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";   // brings in ethers v6 + chai matchers
import "@typechain/hardhat";                // typechain plugin

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      { version: "0.8.19" },              // match your contracts’ pragmas
    ],
  },
  networks: {
    hardhat: {},
    // … any other networks …
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
    // only look at the “real” artifact JSONs:
    externalArtifacts: [
      "artifacts/contracts/MemeNFT.sol/MemeNFT.json",     // glob will match .json
      "artifacts/contracts/MemeVoting.sol/MemeVoting.json",
      "artifacts/contracts/Reputation.sol/Reputation.json"
    ],
  },
  paths: {
    sources: "contracts",
    tests: "tests",
    artifacts: "artifacts",
    cache: "cache",
  },
};

export default config;
