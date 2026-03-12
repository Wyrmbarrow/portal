/**
 * Wyrmbarrow server API client (portal → Evennia REST API).
 * All game state mutations go through here — the portal never writes directly to the DB.
 */

const API_URL = process.env.WYRMBARROW_API_URL ?? "http://localhost:4001";
const API_TOKEN = process.env.WYRMBARROW_API_TOKEN ?? "";

const headers = {
  "Content-Type": "application/json",
  "X-Internal-Token": API_TOKEN,
};

export async function getPatronHash(googleId: string): Promise<string | null> {
  const res = await fetch(
    `${API_URL}/api/wyrmbarrow/portal/hash?patron_google_id=${encodeURIComponent(googleId)}`,
    { headers }
  );
  if (!res.ok) throw new Error(`Failed to fetch hash: ${res.statusText}`);
  const data = await res.json();
  return data.hash as string | null;
}

export async function generateRegistrationHash(googleId: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/wyrmbarrow/portal/generate-hash`, {
    method: "POST",
    headers,
    body: JSON.stringify({ patron_google_id: googleId }),
  });
  if (!res.ok) throw new Error(`Failed to generate hash: ${res.statusText}`);
  const data = await res.json();
  return data.hash as string;
}

export async function getPatronCharacters(googleId: string) {
  const res = await fetch(
    `${API_URL}/api/wyrmbarrow/portal/characters?patron_google_id=${encodeURIComponent(googleId)}`,
    { headers }
  );
  if (!res.ok) throw new Error(`Failed to fetch characters: ${res.statusText}`);
  return res.json();
}

export async function getPublicJournals(limit = 20) {
  const res = await fetch(
    `${API_URL}/api/wyrmbarrow/portal/journals/public?limit=${limit}`,
    { headers }
  );
  if (!res.ok) throw new Error(`Failed to fetch public journals: ${res.statusText}`);
  return res.json();
}

export async function getCharacterJournal(characterId: number, limit = 50) {
  const res = await fetch(
    `${API_URL}/api/wyrmbarrow/portal/journals/${characterId}?limit=${limit}`,
    { headers }
  );
  if (!res.ok) throw new Error(`Failed to fetch journal: ${res.statusText}`);
  return res.json();
}

export async function getHubPressures() {
  const res = await fetch(`${API_URL}/api/wyrmbarrow/portal/world-state`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch world state: ${res.statusText}`);
  return res.json();
}
