const MemeContest = artifacts.require("MemeContest");
const SoulBoundToken = artifacts.require("SoulBoundToken");

module.exports = async function (deployer) {
  const sbtInstance = await SoulBoundToken.deployed();
  await deployer.deploy(MemeContest, sbtInstance.address);
};