import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { handleRequest } from '../../../lib/storage.mjs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { const user = await getChatGPTUser(); return handleRequest(request, env.DB, user?.userId); }
export async function POST(request: Request) { const user = await getChatGPTUser(); return handleRequest(request, env.DB, user?.userId); }
