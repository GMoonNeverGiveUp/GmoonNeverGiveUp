import type { APIRoute } from 'astro';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import { withRoleCheck } from './middleware';
import type { User } from './discord/userStore';
import { userStore } from './discord/userStore';

const SBT_ADDRESS = process.env.SBT_ADDRESS!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const RPC_URL = process.env.RPC_URL!;

const provider = new JsonRpcProvider(RPC_URL);
const wallet = new Wallet(PRIVATE_KEY, provider);
const sbtContract = new Contract(
  SBT_ADDRESS,
  [
    'function updateReputation(uint256 tokenId, uint256 points)',
    'function profileMode(uint256 tokenId) view returns (uint8)',
  ],
  wallet
);

export const POST = withRoleCheck(
  async (context) => {
    const { request } = context;
    const { tokenId, action }: { tokenId: string; action: string } = await request.json();

    const user = userStore.get() as User | null;
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 401 });
    }

    const actionPoints: Record<string, number> = {
      like: 1,
      comment: 2,
      share: 3,
      vote: 2,
    };

    if (!(action in actionPoints)) {
      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
    }

    const basePoints = actionPoints[action];
    const profileMode = await sbtContract.profileMode(tokenId);
    const followerCount = await getFollowerCount(user.discordId);
    const modeMultiplier = profileMode === 1 ? 1.1 : profileMode === 2 ? 1.2 : 1.0;
    const followerMultiplier = 1 + followerCount * 0.01;
    const totalPoints = Math.floor(basePoints * modeMultiplier * followerMultiplier);

    const tx = await sbtContract.updateReputation(tokenId, totalPoints);
    await tx.wait();

    return new Response(JSON.stringify({ success: true, pointsAdded: totalPoints }), { status: 200 });
  },
  ['Spectator', 'Galactic G', 'Guardian']
) as APIRoute;

async function getFollowerCount(discordId: string): Promise<number> {
  // TODO: Implement follower count retrieval
  return 0;
}
