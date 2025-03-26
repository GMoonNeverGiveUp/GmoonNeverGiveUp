import type { APIRoute } from 'astro';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { userStore } from '../discord/userStore'; // Verify this path is correct

export const GET: APIRoute = async ({ url }) => {
  try {
    const code = url.searchParams.get('code');
    if (!code) {
      return new Response(JSON.stringify({ error: 'No code provided' }), { status: 400 });
    }

    // Retrieve secrets from environment variables
    const clientId = process.env.DISCORD_CLIENT_ID!;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET!;
    const redirectUri = process.env.DISCORD_REDIRECT_URI!;
    const guildId = process.env.DISCORD_GUILD_ID!;
    const botToken = process.env.DISCORD_BOT_TOKEN!;
    const galacticRoleId = process.env.DISCORD_GALACTIC_G_ROLE_ID!;
    const guardianRoleId = process.env.DISCORD_GUARDIAN_ROLE_ID!;
    const spectatorRoleId = process.env.DISCORD_SPECTATOR_ROLE_ID!;

    // Exchange authorization code for access token
    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );
    const accessToken = tokenResponse.data.access_token;

    // Fetch user data
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userData = userResponse.data;

    // Check if user is in the guild
    const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const isMember = guildsResponse.data.some((guild: any) => guild.id === guildId);
    if (!isMember) {
      return new Response(JSON.stringify({ error: 'Not a member of the required guild' }), { status: 403 });
    }

    // Fetch user's roles in the guild
    const memberResponse = await axios.get(
      `https://discord.com/api/guilds/${guildId}/members/${userData.id}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
      }
    );
    const roles = memberResponse.data.roles;

    // Determine user role
    type DiscordRole = 'Spectator' | 'Galactic G' | 'Guardian';
    let userRole: DiscordRole = 'Spectator';
    if (roles.includes(galacticRoleId)) {
      userRole = 'Galactic G';
    } else if (roles.includes(guardianRoleId)) {
      userRole = 'Guardian';
    }

    // Generate JWT token and store user data
    const tokenPayload = {
      discordId: userData.id,
      username: userData.username,
      role: userRole,
    };
    const jwtToken = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'your-very-secret-key',
      { expiresIn: '1d' }
    );
    userStore.set(tokenPayload);

    // Set JWT in a cookie and redirect
    const serializedCookie = cookie.serialize('token', jwtToken, {
      httpOnly: true,
      secure: process.env.PROD === 'true',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    });

    return new Response(null, {
      status: 302,
      headers: {
        'Set-Cookie': serializedCookie,
        Location: '/mint-profile',
      },
    });
  } catch (error: any) {
    console.error('Callback API error:', error);
    let errorMessage = 'Internal Server Error';
    let statusCode = 500;
    if (axios.isAxiosError(error) && error.response) {
      // Return the error message from Discord (e.g. "invalid_client")
      errorMessage = error.response.data?.error || error.response.data || error.message;
      statusCode = error.response.status;
    }
    return new Response(JSON.stringify({ error: errorMessage }), { status: statusCode });
  }
};
