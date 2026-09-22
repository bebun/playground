import type { Recipe } from './calc';

const SAVED_KEY = 'cbc.saved.v1';
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

export const listSaved = (): Recipe[] =>
  read<Recipe[]>(SAVED_KEY, []).sort((a, b) => b.updatedAt - a.updatedAt);

export const getSaved = (id: string) => listSaved().find((r) => r.id === id) ?? null;

export function upsertSaved(r: Recipe): boolean {
  const all = read<Recipe[]>(SAVED_KEY, []);
  const i = all.findIndex((x) => x.id === r.id);
  if (i >= 0) all[i] = r;
  else all.push(r);
  return write(SAVED_KEY, all);
}

export function deleteSaved(id: string) {
  write(
    SAVED_KEY,
    read<Recipe[]>(SAVED_KEY, []).filter((r) => r.id !== id),
  );
}

export const loadDraft = () => read<Recipe | null>(DRAFT_KEY, null);
export const saveDraft = (r: Recipe) => write(DRAFT_KEY, r);
