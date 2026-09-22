import { createClient } from '@supabase/supabase-js';

declare const __SUPABASE_URL__: string;
declare const __SUPABASE_ANON_KEY__: string;

export const ALLOWED_EMAIL = 'wiramenggala.nugraha@gmail.com';

export const supabase =
  __SUPABASE_URL__ && __SUPABASE_ANON_KEY__ ? createClient(__SUPABASE_URL__, __SUPABASE_ANON_KEY__) : null;

export type AuthUser = { email: string | null | undefined };

export function isAllowed(user: AuthUser | null): boolean {
  return !!user?.email && user.email.toLowerCase() === ALLOWED_EMAIL.toLowerCase();
}

export async function getUser(): Promise<AuthUser | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function signInWithGoogle() {
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
