// backend/src/init/envGuard.ts
import { z } from "zod";

// define and parse all required vars
export const env = z.object({
  PORT:             z.string().default("4000"),
  DATABASE_URL:     z.string().url(),
  RPC_URL:          z.string().url(),
  WS_RPC_URL:       z.string().url(),
  PRIVATE_KEY:      z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  NGU_TOKEN_ADDR:   z.string().startsWith("0x"),
  IPFS_REPO_PATH:   z.string().optional(),
  IPFS_GATEWAY_URL: z.string().url().optional(),
  JWT_SECRET:       z.string().min(10),
}).parse(process.env);
