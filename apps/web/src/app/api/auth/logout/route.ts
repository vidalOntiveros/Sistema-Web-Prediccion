import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { nestApiUrl, SESSION_COOKIE } from '@/lib/session';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await fetch(`${nestApiUrl()}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
