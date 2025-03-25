const { create } = require("ipfs-http-client");

const auth = "Basic " + Buffer.from(`${process.env.PINATA_API_KEY}:${process.env.PINATA_SECRET}`).toString("base64");
const ipfs = create({
  host: "api.pinata.cloud",
  port: 443,
  protocol: "https",
  headers: { authorization: auth },
});

export async function uploadToIPFS(data) {
  const { cid } = await ipfs.add(data);
  return cid.toString();
}