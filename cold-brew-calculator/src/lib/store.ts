import { supabase } from './auth';
import type { Recipe } from './calc';

const DRAFT_KEY = 'cbc.draft.v1';
export const NAME_MAX = 25;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const loadDraft = () => read<Recipe | null>(DRAFT_KEY, null);
export const saveDraft = (r: Recipe) => write(DRAFT_KEY, r);

/* ---------- saved recipes (Supabase, shared across devices) ---------- */

let cache: Recipe[] = [];

export async function fetchSaved(): Promise<Recipe[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('recipes')
    .select('data')
    .order('updated_at', { ascending: false });
  if (error || !data) {
    console.error('Supabase fetchSaved failed', error);
    return cache;
  }
  cache = data.map((row) => row.data as Recipe);
  return cache;
}

export const listSaved = (): Recipe[] => cache;
export const getSaved = (id: string) => cache.find((r) => r.id === id) ?? null;

export async function upsertSaved(r: Recipe): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('recipes').upsert({
    id: r.id,
    name: r.name,
    updated_at: new Date(r.updatedAt).toISOString(),
    data: r,
  });
  if (error) {
    console.error('Supabase upsertSaved failed', error);
    return false;
  }
  await fetchSaved();
  return true;
}

export async function deleteSaved(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) console.error('Supabase deleteSaved failed', error);
  await fetchSaved();
}
