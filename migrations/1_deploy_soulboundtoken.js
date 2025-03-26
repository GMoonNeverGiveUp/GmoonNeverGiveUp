const SoulBoundToken = artifacts.require("SoulBoundToken");

module.exports = async function (deployer) {
  await deployer.deploy(SoulBoundToken);
};