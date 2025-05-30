// backend/src/types/ipfs-http-client.d.ts
/**
 * Declaração para o bundle CJS do ipfs-http-client,
 * que expõe a função `create`.
 */
import type { IPFSHTTPClient } from 'ipfs-http-client';

declare module 'ipfs-http-client/dist/index.min.js' {
  export function create(options: any): IPFSHTTPClient;
}
