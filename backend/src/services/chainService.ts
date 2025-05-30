import { JsonRpcProvider, WebSocketProvider, FallbackProvider, Wallet, Contract } from 'ethers';
import { prisma } from '../index';
// Adjusted path: artifacts lives at project root, copied to /app/artifacts
// Point to artifacts in your root folder
import MemeNFTArtifact from '../../artifacts/contracts/MemeNFT.sol/MemeNFT.json';
import MemeVotingArtifact from '../../artifacts/contracts/MemeVoting.sol/MemeVoting.json';

// HTTP and WebSocket providers
const httpProvider = new JsonRpcProvider(process.env.RPC_URL);
const wsProvider   = new WebSocketProvider(process.env.WS_RPC_URL!);

// FallbackProvider uses WS first, then HTTP
const provider = new FallbackProvider([
  { provider: wsProvider, priority: 1, weight: 1 },
  { provider: httpProvider, priority: 2, weight: 1 },
]);

// Signer configured with the fallback provider
const signer = new Wallet(process.env.PRIVATE_KEY!, provider);

// Contract instances
export const memeNFT = new Contract(
  process.env.MEME_NFT_ADDRESS!,
  MemeNFTArtifact.abi,
  signer
);

export const memeVoting = new Contract(
  process.env.MEME_VOTING_ADDRESS!,
  MemeVotingArtifact.abi,
  signer
);

/**
 * Mint a free Soulbound Token for a newly uploaded meme.
 * Logs the transaction into the TokenEvent table.
 */
export async function mintFreeSBT(to: string, cid: string): Promise<string> {
  const tx = await memeNFT.mintFreeSBT(to, cid);
  const receipt = await tx.wait();

  await prisma.tokenEvent.create({
    data: {
      type:   'MINT',
      txHash: receipt.transactionHash,
      meta:   { to, cid },
    },
  });

  return receipt.transactionHash;
}

/**
 * Cast a vote on-chain and log the event.
 */
export async function castVote(
  memeId: bigint,
  amount: bigint
): Promise<string> {
  const tx = await memeVoting.vote(memeId, amount, { gasLimit: 200_000 });
  const receipt = await tx.wait();

  await prisma.tokenEvent.create({
    data: {
      type:   'VOTE',
      txHash: receipt.transactionHash,
      meta:   { memeId: memeId.toString(), amount: amount.toString() },
    },
  });

  return receipt.transactionHash;
}

/**
 * Send an impulse on-chain and log the event.
 */
export async function sendImpulse(
  memeId: bigint,
  amount: bigint
): Promise<string> {
  const tx = await memeVoting.impulse(memeId, amount, { gasLimit: 200_000 });
  const receipt = await tx.wait();

  await prisma.tokenEvent.create({
    data: {
      type:   'IMPULSE',
      txHash: receipt.transactionHash,
      meta:   { memeId: memeId.toString(), amount: amount.toString() },
    },
  });

  return receipt.transactionHash;
}
