import jwt from 'jsonwebtoken';
import type { APIRoute, AstroGlobal } from 'astro';

export function withRoleCheck(handler: APIRoute, allowedRoles: string[]) {
  return async (context: AstroGlobal) => {
    const token = context.request.headers.get('cookie')?.split('; ').find((row: string) => row.startsWith('token='))?.split('=')[1];
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
      const user = jwt.verify(token, import.meta.env.JWT_SECRET || 'your-very-secret-key');
      if (!allowedRoles.includes((user as any).role)) { // Assuming user has a role property
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
      }
      return handler(context);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
    }
  };
}