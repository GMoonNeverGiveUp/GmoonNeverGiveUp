// backend/src/config.ts
import dotenv from 'dotenv';
dotenv.config();

export const PORT                  = process.env.PORT ?? 4000;
export const DATABASE_URL          = process.env.DATABASE_URL!;
export const JWT_SECRET            = process.env.JWT_SECRET  ?? "CHANGE_ME";
export const NGU_TOKEN_ADDR        = process.env.NGU_TOKEN_ADDR!;
export const MEME_NFT_ADDRESS      = process.env.MEME_NFT_ADDRESS!;
export const MEME_VOTING_ADDRESS   = process.env.MEME_VOTING_ADDRESS!;
export const IPFS_PROJECT_ID       = process.env.IPFS_PROJECT_ID;
export const IPFS_PROJECT_SECRET   = process.env.IPFS_PROJECT_SECRET;
export const IPFS_HOST          = process.env.IPFS_HOST!;
export const IPFS_PORT          = Number(process.env.IPFS_PORT!);
export const IPFS_PROTOCOL      = process.env.IPFS_PROTOCOL!;
export const IPFS_GATEWAY_URL   = process.env.IPFS_GATEWAY_URL; 
