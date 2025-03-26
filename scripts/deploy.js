const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy SoulBoundToken first
  const SoulBoundToken = await hre.ethers.getContractFactory("SoulBoundToken");
  const sbt = await SoulBoundToken.deploy();
  await sbt.waitForDeployment();
  console.log("SoulBoundToken deployed to:", await sbt.getAddress());

  // Deploy MemeContest with SBT address
  const MemeContest = await hre.ethers.getContractFactory("MemeContest");
  const memeContest = await MemeContest.deploy(await sbt.getAddress());
  await memeContest.waitForDeployment();
  console.log("MemeContest deployed to:", await memeContest.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });