import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { nestApiUrl, SESSION_COOKIE } from '@/lib/session';

async function handle(request: Request, path: string[]) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  const targetUrl = new URL(`${nestApiUrl()}/api/v1/${path.join('/')}`);
  targetUrl.search = new URL(request.url).search;

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const contentType = request.headers.get('content-type');

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(contentType ? { 'Content-Type': contentType } : {}),
    },
    body: hasBody ? await request.arrayBuffer() : undefined,
  });

  const responseBody = await upstream.arrayBuffer();
  const response = new NextResponse(responseBody, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
    },
  });

  if (upstream.status === 401) {
    response.cookies.delete(SESSION_COOKIE);
  }

  return response;
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handle(request, (await params).path);
}
export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handle(request, (await params).path);
}
export async function PATCH(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handle(request, (await params).path);
}
export async function DELETE(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handle(request, (await params).path);
}
