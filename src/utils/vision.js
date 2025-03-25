import * as tf from "@tensorflow/tfjs";
import axios from "axios";

export async function getEmbedding(text) {
  const response = await axios.post(
    "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
    { inputs: text },
    { headers: { Authorization: `Bearer ${process.env.HUGGING_FACE_API_KEY}` } }
  );
  return response.data[0];
}

export async function analyzeImage(imageFile) {
  await tf.ready();
  const img = new Image();
  img.src = URL.createObjectURL(imageFile);
  await img.decode();
  const tensor = tf.browser.fromPixels(img).resizeNearestNeighbor([224, 224]).toFloat().expandDims();
  // Simple feature extraction (could use MobileNet for better results)
  const features = tensor.mean([1, 2]).arraySync();
  return features;
}