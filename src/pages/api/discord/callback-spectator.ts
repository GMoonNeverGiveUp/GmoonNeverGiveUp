import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secret-key';
const JWT_EXPIRES_IN = '1d';

export const GET: APIRoute = async ({ url }) => {
  try {
    console.log('🔵 Received request to /api/discord/callback-spectator');

    const code = url.searchParams.get('code');
    if (!code) {
      console.error('❌ No authorization code provided.');
      return new Response(JSON.stringify({ error: 'No code provided' }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Read required environment variables (spectator flow does not require role check)
    const clientId = import.meta.env.DISCORD_CLIENT_ID;
    const clientSecret = import.meta.env.DISCORD_CLIENT_SECRET;
    const redirectUri = import.meta.env.DISCORD_SPECTATOR_REDIRECT_URI || import.meta.env.DISCORD_REDIRECT_URI;
    const guildId = import.meta.env.DISCORD_GUILD_ID;
    const botToken = import.meta.env.DISCORD_BOT_TOKEN;

    if (!clientId || !clientSecret || !redirectUri || !guildId || !botToken) {
      console.error('❌ Missing one or more required environment variables.');
      return new Response(JSON.stringify({ error: 'Missing environment variables' }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.log('🔹 All environment variables are present.');

    // Exchange authorization code for an access token
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams,
    });
    if (!tokenResponse.ok) {
      console.error('❌ Failed to fetch access token:', await tokenResponse.text());
      return new Response(JSON.stringify({ error: 'Failed to retrieve access token' }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error('❌ No access token received.');
      return new Response(JSON.stringify({ error: 'Invalid access token response' }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.log('✅ Successfully retrieved access token.');

    // Fetch user information
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userResponse.ok) {
      console.error('❌ Failed to fetch user info:', await userResponse.text());
      return new Response(JSON.stringify({ error: 'Failed to retrieve user data' }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const userData = await userResponse.json();
    console.log('✅ User data retrieved:', userData);

    // Check if user is in the required Discord server
    const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!guildsResponse.ok) {
      console.error('❌ Failed to fetch user guilds:', await guildsResponse.text());
      return new Response(JSON.stringify({ error: 'Failed to retrieve user guilds' }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const guildsData = await guildsResponse.json();
    const isMember = guildsData.some((guild: any) => guild.id === guildId);
    if (!isMember) {
      console.error('❌ User is not a member of the required Discord server.');
      return new Response(JSON.stringify({ error: 'User is not in the required Discord server' }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.log('✅ User is a member of the required server.');

    // (Optional) Fetch additional data if needed using the Bot token

    // Create a JWT with the user’s data (spectator mode does not check for a special role)
    const tokenPayload = {
      discordId: userData.id,
      username: userData.username,
      discriminator: userData.discriminator,
      // You could store additional data if desired
      timestamp: Date.now(),
    };
    const jwtToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    console.log('✅ JWT generated.');

    // Compute secure flag robustly:
    const secureFlag =
      typeof import.meta.env.PROD === 'string'
        ? import.meta.env.PROD === 'true'
        : Boolean(import.meta.env.PROD);

    // Create a cookie to store the JWT
    const serializedCookie = cookie.serialize('token', jwtToken, {
      httpOnly: true,
      secure: secureFlag,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 day in seconds
      path: '/',
    });

    // Redirect to spectator dashboard with cookie set
    return new Response(null, {
      status: 302,
      headers: {
        'Set-Cookie': serializedCookie,
        Location: '/dapp/spectator',
      },
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
