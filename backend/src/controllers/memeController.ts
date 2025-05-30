import { Request, Response, NextFunction } from "express";
import { prisma } from "../index";
import { ipfsService } from "../services/ipfsService";
import { providers, Wallet, Contract, type BigNumber } from "ethers";
import { ADDR } from "../utils/addresses";
import { env } from "../init/envGuard";

import MemeNFTArtifact from "../../artifacts/contracts/MemeNFT.sol/MemeNFT.json";
import MemeVotingArtifact from "../../artifacts/contracts/MemeVoting.sol/MemeVoting.json";

const provider = new providers.JsonRpcProvider(env.RPC_URL);
const signer = new Wallet(env.PRIVATE_KEY, provider);

const memeNFT    = new Contract(ADDR.MemeNFT,    MemeNFTArtifact.abi,    signer);
const memeVoting = new Contract(ADDR.MemeVoting, MemeVotingArtifact.abi, signer);

/**
 * POST /api/memes
 */
export async function createMeme(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req as any).userId as string;
    const { ipfsPayload, textLayers, stickers, filters } = req.body;

    // 1️⃣ upload JSON to IPFS
    const cid = await ipfsService.uploadJSON(ipfsPayload);

    // 2️⃣ record in Media
    await prisma.media.create({ data: { cid, uploaderId: userId } });

    // 3️⃣ mint the SBT
    const tx = await memeNFT.mintFreeSBT(userId, cid);
    const receipt = await tx.wait();

    // 4️⃣ extract tokenId (typed e as any)
    const sbtEvent = receipt.events?.find((e: any) => e.event === "SBTMinted");
    const tokenId = (sbtEvent?.args?.tokenId as BigNumber);

    // 5️⃣ persist Meme
    const meme = await prisma.meme.create({
      data: {
        creatorId: userId,
        ipfsHash: cid,
        textLayers,
        stickers,
        filters,
        tokenId: BigInt(tokenId.toString()),
      },
    });

    res.json(meme);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/memes/:memeId/vote
 */
export async function voteMeme(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req as any).userId as string;
    const { memeId } = req.params;
    const amount = BigInt(req.body.amount);

    // 🚀 estimate gas via provider
    const data = memeVoting.interface.encodeFunctionData("vote", [
      BigInt(memeId),
      amount,
    ]);
    const gas = await provider.estimateGas({
      to: ADDR.MemeVoting,
      data,
    });
    const tx = await memeVoting.vote(BigInt(memeId), amount, {
      gasLimit: gas.mul(120).div(100), // +20% buffer
    });
    const receipt = await tx.wait();

    // record on-chain event
    await prisma.tokenEvent.create({
      data: {
        type: "VOTE",
        txHash: receipt.transactionHash,
        meta: { memeId, amount: amount.toString() },
      },
    });

    // mirror off-chain
    const vote = await prisma.vote.create({
      data: { userId, memeId, amount },
    });
    await prisma.meme.update({
      where: { id: memeId },
      data: { totalVotes: { increment: amount } },
    });

    res.json(vote);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/memes/:memeId/impulse
 */
export async function impulseMeme(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { memeId } = req.params;
    const amount = BigInt(req.body.amount);

    const data = memeVoting.interface.encodeFunctionData("impulse", [
      BigInt(memeId),
      amount,
    ]);
    const gas = await provider.estimateGas({
      to: ADDR.MemeVoting,
      data,
    });
    const tx = await memeVoting.impulse(BigInt(memeId), amount, {
      gasLimit: gas.mul(120).div(100),
    });
    const receipt = await tx.wait();

    await prisma.tokenEvent.create({
      data: {
        type: "IMPULSE",
        txHash: receipt.transactionHash,
        meta: { memeId, amount: amount.toString() },
      },
    });
    await prisma.meme.update({
      where: { id: memeId },
      data: { totalImpulses: { increment: amount } },
    });

    res.json({ memeId, amount });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/memes
 */
export async function getFeed(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const memes = await prisma.meme.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(memes);
  } catch (err) {
    next(err);
  }
}
