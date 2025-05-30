import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  // Ensure NGU token address is provided via env
  const nguToken = process.env.NGU_TOKEN_ADDR;
  if (!nguToken) {
    throw new Error("Missing NGU_TOKEN_ADDR in environment");
  }

  console.log("Deploying MemeVoting with NGU token at", nguToken);
  const MemeVoting = await ethers.getContractFactory("MemeVoting");
  const memeVoting = await MemeVoting.deploy(nguToken);
  await memeVoting.deployed();

  console.log("MemeVoting deployed to:", memeVoting.address);

  // Update deployed-addresses.json
  const addressesPath = path.resolve(__dirname, "../deployed-addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  addresses.MemeVoting = memeVoting.address;
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));

  console.log("deployed-addresses.json updated");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
