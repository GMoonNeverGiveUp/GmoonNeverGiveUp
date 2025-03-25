import type { APIRoute } from 'astro';

interface Meme {
  title: string;
  description: string;
}

// In-memory array for demonstration
const memes: Meme[] = [];

export const POST: APIRoute = async ({ request }) => {
  try {
    const { prompt } = await request.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is missing' }), { status: 400 });
    }
    // Store or process the meme in some way
    memes.push({ title: prompt, description: 'A new cosmic meme' });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(memes), { status: 200 });
};
