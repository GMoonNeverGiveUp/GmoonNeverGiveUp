// scripts/aiWorker.js
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { judgeComplexity } from "./complexityJudge.js";

dotenv.config();

// Import the contract ABI from the Hardhat artifacts.
// Ensure the artifact file exists and adjust the path if necessary.
import MemeContestArtifact from "../artifacts/contracts/MemeContest.sol/MemeContest.json" assert { type: "json" };

async function main() {
  // Set up provider and wallet using environment variables
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // Connect to the deployed MemeContest contract
  const contractAddress = process.env.MEME_CONTEST_ADDRESS;
  const contract = new ethers.Contract(contractAddress, MemeContestArtifact.abi, wallet);

  console.log("AI Worker started. Listening for MemeSubmitted events...");

  // Listen for MemeSubmitted events: (tokenId, creator, memeURI)
  contract.on("MemeSubmitted", async (tokenId, creator, memeURI) => {
    console.log(`Detected MemeSubmitted event for Token ID ${tokenId} by ${creator}`);

    // Compute the complexity score using judgeComplexity
    const complexity = await judgeComplexity(memeURI);
    console.log(`Computed complexity score: ${complexity}`);

    // Update the complexity score on-chain
    try {
      const tx = await contract.updateComplexityScore(tokenId, complexity);
      console.log(`Updating complexity score on-chain. Transaction hash: ${tx.hash}`);
      await tx.wait();
      console.log(`Complexity score successfully updated for token ID ${tokenId}`);
    } catch (error) {
      console.error(`Error updating complexity score for token ID ${tokenId}:`, error);
    }
  });
}

main().catch((error) => {
  console.error("AI Worker encountered an error:", error);
  process.exit(1);
});