const axios = require("axios");

async function judgeComplexity(prompt) {
  const response = await axios.post(
    "https://api.groq.com/v1/chat/completions",
    {
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: `Rate the creativity of this prompt (0-10): ${prompt}` }],
    },
    { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } }
  );
  return parseInt(response.data.choices[0].message.content);
}

module.exports = { judgeComplexity };