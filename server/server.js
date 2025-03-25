// server/server.js
import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// Use JSON body parsing middleware
app.use(bodyParser.json());

// Define the path to a simple JSON file acting as our datastore.
const DB_FILE = path.join(__dirname, 'db.json');

// Initialize DB file if it does not exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ reputations: {} }, null, 2));
}

// Helper functions to read and write our JSON "database"
function readDB() {
  const data = fs.readFileSync(DB_FILE);
  return JSON.parse(data);
}

function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Define reputation point values for different interactions
const interactionPoints = {
  like: 1,            // Spectator like
  comment: 2,         // Spectator comment
  share: 3,           // Spectator share
  memeSubmission: 5,  // Galactic G submits a meme
  memeMinting: 10,    // Galactic G mints a meme NFT
  memeVoting: 2       // Galactic G votes on a meme
};

// Endpoint to record an interaction and update reputation
app.post('/api/interaction', (req, res) => {
  const { user, type } = req.body;
  if (!user || !type || !interactionPoints[type]) {
    return res.status(400).json({ error: 'Invalid interaction data. Ensure "user" and a valid "type" are provided.' });
  }
  const db = readDB();
  if (!db.reputations[user]) {
    db.reputations[user] = 0;
  }
  db.reputations[user] += interactionPoints[type];
  writeDB(db);
  return res.json({ user, reputation: db.reputations[user] });
});

// Endpoint to get a user's reputation
app.get('/api/reputation/:user', (req, res) => {
  const user = req.params.user;
  const db = readDB();
  const reputation = db.reputations[user] || 0;
  return res.json({ user, reputation });
});

// Endpoint to get a ranking list of all users by reputation points
app.get('/api/reputations', (req, res) => {
  const db = readDB();
  const reputations = Object.entries(db.reputations)
    .map(([user, points]) => ({ user, points }))
    .sort((a, b) => b.points - a.points);
  return res.json({ reputations });
});

// Optionally, you might expose an endpoint to track fees received on-chain
// by integrating with a blockchain listener (not shown here for brevity).

app.listen(port, () => {
  console.log(`Backend reputation service listening at http://localhost:${port}`);
});
