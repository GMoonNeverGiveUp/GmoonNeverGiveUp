import axios from "axios";
import { loadImage, createCanvas } from "canvas";
import { getEmbedding } from "./vision.js"; // For image inputs

const templates = require("../../../server/templates.json");

export async function generateMeme(input) {
  let prompt = "";
  if (input.image) {
    const description = await generateImageDescription(input.image);
    prompt = description;
  } else {
    prompt = input.prompt;
  }

  // Generate caption with Groqcloud
  const caption = await generateCaption(prompt);
  
  // Select best template
  const template = await selectTemplate(prompt);
  
  // Add text to template
  const memeBuffer = await addTextToImage(template.imageUrl, caption);
  
  return memeBuffer;
}

async function generateCaption(prompt) {
  const response = await axios.post(
    "https://api.groq.com/v1/chat/completions",
    {
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: `Generate a funny meme caption for: ${prompt}` }],
      max_tokens: 50,
    },
    { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } }
  );
  return response.data.choices[0].message.content.trim();
}

async function selectTemplate(prompt) {
  const promptEmbedding = await getEmbedding(prompt);
  let bestMatch = templates[0];
  let highestSimilarity = -1;

  for (const template of templates) {
    const similarity = cosineSimilarity(promptEmbedding, template.embedding);
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      bestMatch = template;
    }
  }
  return bestMatch;
}

async function addTextToImage(imageUrl, text) {
  const image = await loadImage(imageUrl);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  ctx.font = "30px Impact";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, 50);
  return canvas.toBuffer("image/png");
}

function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magA * magB);
}

async function generateImageDescription(image) {
  const formData = new FormData();
  formData.append("image", image);
  const response = await axios.post(
    "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large",
    formData,
    { headers: { Authorization: `Bearer ${process.env.HUGGING_FACE_API_KEY}` } }
  );
  return response.data[0].generated_text;
}