let client = null;
let config = null;

export async function initAuth() {
  const res = await fetch('/api/config');
  config = await res.json();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return { configured: false };
  }
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  client = createClient(config.supabaseUrl, config.supabaseAnonKey);
  const { data: { session } } = await client.auth.getSession();
  if (session) {
    return { configured: true, user: session.user, token: session.access_token };
  }
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      window.dispatchEvent(new CustomEvent('auth:signed-in', { detail: { user: session.user, token: session.access_token } }));
    } else if (event === 'SIGNED_OUT') {
      window.dispatchEvent(new CustomEvent('auth:signed-out'));
    }
  });
  return { configured: true, user: null, token: null };
}

export async function signInWithMagicLink(email) {
  if (!client) throw new Error('Auth not configured');
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname },
  });
  if (error) throw error;
}

export async function signOut() {
  if (client) await client.auth.signOut();
}

export async function getToken() {
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data?.session?.access_token || null;
}
