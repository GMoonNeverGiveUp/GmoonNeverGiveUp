import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.resolve('server/db.json');

interface MyUserPayload extends jwt.JwtPayload {
  discordId: string;
  username?: string;
}

function readDB(): { users: Record<string, { username?: string; avatarUrl?: string; bio?: string }> } {
  const data = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(data);
}

function writeDB(db: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const token = request.headers.get('cookie')?.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const user = jwt.verify(token, import.meta.env.JWT_SECRET || 'your-very-secret-key') as MyUserPayload;
    const { username, avatarUrl, bio } = await request.json();

    const db = readDB();
    if (!db.users) db.users = {};
    db.users[user.discordId] = { username, avatarUrl, bio };
    writeDB(db);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Profile update error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};

export const GET: APIRoute = async ({ request }) => {
  try {
    const token = request.headers.get('cookie')?.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const user = jwt.verify(token, import.meta.env.JWT_SECRET || 'your-very-secret-key') as MyUserPayload;
    const db = readDB();
    const profile = db.users?.[user.discordId] || {};
    return new Response(JSON.stringify(profile), { status: 200 });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};