import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const clientId = import.meta.env.DISCORD_CLIENT_ID;
  const redirectUri = import.meta.env.DISCORD_REDIRECT_URI;
  const scope = encodeURIComponent('identify guilds');
  const state = 'static_state_example'; // Consider generating this dynamically
  const discordOAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;
  return new Response(null, {
    status: 302,
    headers: { Location: discordOAuthUrl },
  });
};