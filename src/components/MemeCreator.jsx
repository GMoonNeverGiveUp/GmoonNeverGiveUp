import React, { useState } from "react";
import { generateMeme } from "../utils/ai.js";
import { uploadToIPFS } from "../utils/ipfs.js";

export default function MemeCreator({ onMemeGenerated }) {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState(null);
  const [checkboxes, setCheckboxes] = useState({
    funny: false,
    sarcastic: false,
    inspirational: false,
  });
  const [generatedMeme, setGeneratedMeme] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheckboxChange = (e) => {
    setCheckboxes({ ...checkboxes, [e.target.name]: e.target.checked });
  };

  const handleImageUpload = (e) => {
    setImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const mood = Object.keys(checkboxes)
        .filter((key) => checkboxes[key])
        .join(", ");
      const input = image ? { image } : { prompt: `${prompt} (${mood})` };
      const memeUrl = await generateMeme(input);
      const ipfsHash = await uploadToIPFS(memeUrl);
      setGeneratedMeme(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
      onMemeGenerated(ipfsHash);
    } catch (error) {
      console.error("Meme generation failed:", error);
      alert("Failed to generate meme.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="meme-creator">
      <h2>Create a Meme</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          placeholder="Enter your meme prompt..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={image}
        />
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        <div className="checkboxes">
          <label>
            <input
              type="checkbox"
              name="funny"
              checked={checkboxes.funny}
              onChange={handleCheckboxChange}
            />
            Funny
          </label>
          <label>
            <input
              type="checkbox"
              name="sarcastic"
              checked={checkboxes.sarcastic}
              onChange={handleCheckboxChange}
            />
            Sarcastic
          </label>
          <label>
            <input
              type="checkbox"
              name="inspirational"
              checked={checkboxes.inspirational}
              onChange={handleCheckboxChange}
            />
            Inspirational
          </label>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Generating..." : "Generate Meme"}
        </button>
      </form>
      {generatedMeme && (
        <div className="generated-meme">
          <img src={generatedMeme} alt="Generated Meme" />
        </div>
      )}
      <style jsx>{`
        .meme-creator {
          background: rgba(255, 255, 255, 0.05);
          padding: 1.5rem;
          border-radius: 10px;
          max-width: 600px;
          margin: 0 auto;
        }
        textarea,
        input[type="file"] {
          width: 100%;
          padding: 0.75rem;
          margin-bottom: 1rem;
          background: #1a1a2e;
          border: 1px solid #444;
          color: #e0e0e0;
          border-radius: 5px;
        }
        .checkboxes {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        button {
          background: #1e90ff;
          border: none;
          padding: 0.75rem 1.5rem;
          color: #fff;
          border-radius: 5px;
          cursor: pointer;
        }
        button:hover {
          background: #1590e0;
        }
        .generated-meme img {
          max-width: 100%;
          border-radius: 5px;
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
}