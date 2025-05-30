// src/lib/chain.ts
import { JsonRpcProvider, WebSocketProvider, Contract } from "ethers";
import { create as createIpfsClient, IPFSHTTPClient } from "ipfs-http-client";
// Adjust paths to your built artifacts
import MemeNFTArtifact from "../../artifacts/contracts/MemeNFT.sol/MemeNFT.json";
import MemeVotingArtifact from "../../artifacts/contracts/MemeVoting.sol/MemeVoting.json";

// ——— CONFIGURE THESE VIA YOUR ENV ———
const HTTP_RPC_URL     = import.meta.env.PUBLIC_HTTP_RPC_URL;  // e.g. https://alpha.gravitychain.rpc
const WS_RPC_URL       = import.meta.env.PUBLIC_WS_RPC_URL;    // e.g. wss://alpha.gravitychain.rpc/ws
const IPFS_API_URL     = import.meta.env.PUBLIC_IPFS_API_URL;  // e.g. https://ipfs.infura.io:5001/api/v0
const MEME_NFT_ADDRESS = import.meta.env.PUBLIC_MEME_NFT_ADDRESS!;
const MEME_VOTING_ADDRESS = import.meta.env.PUBLIC_MEME_VOTING_ADDRESS!;
// ————————————————————————————————

// Ethers + IPFS singletons
let provider: JsonRpcProvider;
let wsProvider: WebSocketProvider;
let signer: import("ethers").JsonRpcSigner;
let memeNFT: Contract;
let memeVoting: Contract;
let ipfsClient: IPFSHTTPClient;

export async function initOnChain() {
  // 1) Ask wallet to connect
  if (!(window as any).ethereum) {
    throw new Error("MetaMask (or other Ethereum wallet) not found");
  }
  await (window as any).ethereum.request({ method: "eth_requestAccounts" });

  // 2) Setup providers & signer
  provider   = new JsonRpcProvider(HTTP_RPC_URL);
  wsProvider = new WebSocketProvider(WS_RPC_URL);
  signer     = provider.getSigner();

  // 3) Instantiate contracts
  memeNFT    = new Contract(MEME_NFT_ADDRESS, MemeNFTArtifact.abi, signer);
  memeVoting = new Contract(MEME_VOTING_ADDRESS, MemeVotingArtifact.abi, signer);

  // 4) Instantiate IPFS client
  ipfsClient = createIpfsClient({ url: IPFS_API_URL });
}

// Upload JSON to IPFS, return CID
export async function uploadJSON(data: any): Promise<string> {
  if (!ipfsClient) throw new Error("IPFS client not initialized");
  const { cid } = await ipfsClient.add(JSON.stringify(data));
  return cid.toString();
}

// Mint a new Meme SBT on-chain
export async function mintFreeMeme(payload: any) {
  const cid = await uploadJSON(payload);
  const tx  = await memeNFT.mintFreeSBT(await signer.getAddress(), cid);
  return tx.wait(); // resolves to receipt
}

// Vote on a meme
export async function voteMeme(tokenId: string, amount: string) {
  const tx = await memeVoting.vote(BigInt(tokenId), BigInt(amount));
  return tx.wait();
}

// Impulse a meme
export async function impulseMeme(tokenId: string, amount: string) {
  const tx = await memeVoting.impulse(BigInt(tokenId), BigInt(amount));
  return tx.wait();
}

// Load historical feed from events
export async function loadFeed(): Promise<Array<{
  tokenId: string;
  creator: string;
  cid: string;
}>> {
  // fetch logs from block 0
  const filter = memeNFT.filters.SBTMinted();
  const logs   = await provider.getLogs({ ...filter, fromBlock: 0, toBlock: "latest" });
  const parsed = logs.map(log => memeNFT.interface.parseLog(log));
  return parsed.map(e => ({
    tokenId: e.args.tokenId.toString(),
    creator: e.args.creator,
    cid:     e.args.cid
  }));
}

// Subscribe to new memes in real time
export function onNewMeme(cb: (m: { tokenId: string; creator: string; cid: string })=>void) {
  memeNFT.on("SBTMinted", (tokenId, creator, cid) => {
    cb({ tokenId: tokenId.toString(), creator, cid });
  });
}
