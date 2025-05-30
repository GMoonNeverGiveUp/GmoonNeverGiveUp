import { create } from "ipfs-core";

const repoPath = process.env.IPFS_REPO_PATH; // e.g. "/data/ipfs"

// Initialize one Helia (ipfs-core) node per container.
// We type it as `any` so TS won’t complain about missing IPFS types.
const ipfsNodePromise: Promise<any> = create({
  repo: repoPath,
});

export const ipfsService = {
  /**
   * Upload arbitrary JSON to IPFS, pin it, and return the CID.
   */
  async uploadJSON(payload: any): Promise<string> {
    const node: any = await ipfsNodePromise;
    const buffer = Buffer.from(JSON.stringify(payload));
    const { cid } = await node.add(buffer, { pin: true });
    return cid.toString();
  },

  /**
   * Upload a binary file (image, etc.) to IPFS, pin it, and return the CID.
   */
  async uploadFile(buffer: Buffer, filename: string): Promise<string> {
    const node: any = await ipfsNodePromise;
    const { cid } = await node.add(
      { path: filename, content: buffer },
      { pin: true }
    );
    return cid.toString();
  },

  /**
   * Build a public gateway URL for a given CID.
   * If you later deploy a gateway, set IPFS_GATEWAY_URL.
   */
  getGatewayUrl(cid: string): string {
    const gateway = process.env.IPFS_GATEWAY_URL || "https://ipfs.io/ipfs";
    return `${gateway}/${cid}`;
  },
};
