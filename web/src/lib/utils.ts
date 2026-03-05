import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export function parseJson(raw: string): { value: JsonValue | null; error: string | null } {
  if (!raw.trim()) return { value: null, error: null };
  try {
    return { value: JSON.parse(raw) as JsonValue, error: null };
  } catch (e) {
    return { value: null, error: (e as Error).message };
  }
}
