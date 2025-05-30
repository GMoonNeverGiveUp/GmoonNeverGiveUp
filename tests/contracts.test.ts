// tests/contracts.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"))
import { parseEther } from "ethers";

describe("MemeNFT & MemeVoting integration", function () {
  let owner: any;
  let user: any;
  let voter: any;
  let memeNFT: any;
  let memeVoting: any;

  beforeEach(async function () {
    [owner, user, voter] = await ethers.getSigners();

    // Deploy the NFT
    const NFT     = await ethers.getContractFactory("MemeNFT");
    memeNFT       = await NFT.deploy();
    await memeNFT.waitForDeployment();

    // Deploy the Voting contract, pointing at the NFT
    const Voting  = await ethers.getContractFactory("MemeVoting");
    memeVoting    = await Voting.deploy(memeNFT.target /* or args */);
    await memeVoting.waitForDeployment();

    // Give the voting contract permission to mint on the NFT
    const MINTER_ROLE = memeNFT.MINTER_ROLE
    await memeNFT.grantRole(MINTER_ROLE, memeVoting.address);

    // Mint token #1 to `user`
    await memeNFT.connect(owner).mintFreeSBT(user.address, "QmTestHash");
  });

  it("mints an SBT and returns correct tokenURI", async function () {
    expect(await memeNFT.balanceOf(user.address)).to.equal(1);
    expect(await memeNFT.tokenURI(1)).to.contain("QmTestHash");
  });

  it("allows voting and emits Voted + tracks totalVotes", async function () {
    const amount = parseEther("1");
    await expect(memeVoting.connect(owner).vote(1, amount))
      .to.emit(memeVoting, "Voted")
      .withArgs(owner.address, 1, amount);
    expect(await memeVoting.totalVotes(1)).to.equal(amount);
  });

  it("prevents non-NFT-owners from impulse", async function () {
    const amount = parseEther("1");
    await expect(memeVoting.connect(voter).impulse(1, amount))
      .to.be.revertedWith("NotTokenOwner");
  });

  it("allows NFT owner to impulse and emits Impressed + tracks totalImpulses", async function () {
    const amount = parseEther("2");
    await expect(memeVoting.connect(user).impulse(1, amount))
      .to.emit(memeVoting, "Impressed")
      .withArgs(user.address, 1, amount);
    expect(await memeVoting.totalImpulses(1)).to.equal(amount);
  });
});
