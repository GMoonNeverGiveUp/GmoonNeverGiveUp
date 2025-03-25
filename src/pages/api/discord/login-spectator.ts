import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    console.log('🔵 Received request to /api/discord/login-spectator');

    // Read environment variables
    const clientId = import.meta.env.DISCORD_CLIENT_ID;
    const redirectUri = import.meta.env.DISCORD_SPECTATOR_REDIRECT_URI || import.meta.env.DISCORD_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error('❌ Missing Discord environment variables (client ID or redirect URI)');
      return new Response(JSON.stringify({ error: 'Missing environment variables' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Define OAuth scopes (identify for user info, guilds for server verification)
    const scope = encodeURIComponent('identify guilds');

    // Generate a secure state token (use a random value in production)
    const state = encodeURIComponent(Math.random().toString(36).substring(2, 15));

    // Construct the Discord OAuth2 authorization URL
    const redirectUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;

    console.log('🔹 Redirecting Spectator to Discord OAuth:', redirectUrl);

    // Respond with a 302 redirect
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
      },
    });

  } catch (error) {
    console.error('❌ Unexpected error in spectator login:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
