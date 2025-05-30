import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // 1️⃣ Deploy MemeNFT
  const MemeNFT = await ethers.getContractFactory("MemeNFT");
  const memeNFT = await MemeNFT.deploy();
  await memeNFT.deployed(); 
  console.log("MemeNFT deployed at:", memeNFT.address);

  // 2️⃣ Deploy MemeVoting (requires $NGU token address)
  const nguToken = process.env.NGU_TOKEN_ADDR!;
  if (!nguToken) throw new Error("Missing NGU_TOKEN_ADDR in .env");
  const MemeVoting = await ethers.getContractFactory("MemeVoting");
  const memeVoting = await MemeVoting.deploy(nguToken);
  await memeVoting.deployed();
  console.log("MemeVoting deployed at:", memeVoting.address);

  // 3️⃣ Deploy Reputation
  const Reputation = await ethers.getContractFactory("Reputation");
  const reputation = await Reputation.deploy();
  await reputation.deployed();
  console.log("Reputation deployed at:", reputation.address);

  // 4️⃣ Save addresses to JSON (optional)
  const fs = require("fs");
  const addresses = {
    MemeNFT: memeNFT.address,
    MemeVoting: memeVoting.address,
    Reputation: reputation.address
  };
  fs.writeFileSync("deployed-addresses.json", JSON.stringify(addresses, null, 2));
  console.log("✅ Deployment addresses saved to deployed-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
