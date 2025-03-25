const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const { uploadToIPFS } = require("../src/utils/ipfs.js");
const { getEmbedding } = require("../src/utils/vision.js");

async function scrapeTemplates() {
  const url = "https://knowyourmeme.com/memes/all";
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  const templates = [];

  $("article.entry").slice(0, 20).each(async (i, elem) => {
    const title = $(elem).find("h1").text().trim();
    const imageUrl = $(elem).find("img.photo").attr("src");
    if (imageUrl) {
      const ipfsHash = await uploadToIPFS(imageUrl);
      templates.push({
        id: i,
        title,
        imageUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        description: title,
        embedding: await getEmbedding(title), // Precompute embeddings
      });
    }
  });

  fs.writeFileSync("./server/templates.json", JSON.stringify(templates, null, 2));
  console.log("Templates scraped and saved.");
}

scrapeTemplates().catch(console.error);