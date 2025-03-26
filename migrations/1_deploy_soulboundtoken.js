const SoulBoundToken = artifacts.require("SoulBoundToken");

module.exports = async function (deployer) {
  // Deploy with an increased gas limit of 15,000,000
  await deployer.deploy(SoulBoundToken, { gas: 15000000 });
};
