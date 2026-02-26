import { getToken } from './auth.js';

export async function getSharePreview(token) {
  const res = await fetch(`/api/share/${token}`);
  if (!res.ok) throw new Error('Share link expired or invalid');
  return res.json();
}

export async function acceptShare(token) {
  const authToken = await getToken();
  if (!authToken) throw new Error('Sign in required');
  const res = await fetch('/api/share/accept', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to accept share');
  }
  return res.json();
}

export function isSharePage() {
  return window.location.pathname.match(/^\/s\/([a-f0-9]+)$/);
}
