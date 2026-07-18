export const SESSION_COOKIE = 'session';

export function nestApiUrl(): string {
  const url = process.env.NEST_API_URL;
  if (!url) {
    throw new Error('NEST_API_URL no está configurada (ver .env.example).');
  }
  return url;
}
