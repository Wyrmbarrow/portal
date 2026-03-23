/**
 * Display-name helpers for game entity slugs.
 * Matches the normalization used in CharacterStatblock.
 */

const RACE_DISPLAY: Record<string, string> = {
  half_orc: "Half-Orc",
  half_elf: "Half-Elf",
};

/** Convert a snake_case slug to Title Case, with special-case overrides. */
export function formatSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return RACE_DISPLAY[slug] ?? slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
