/**
 * URL-state codec for the squad payload. Keeping all state in the shareable
 * URL is what gives Squad Night zero-signup, zero-server-state guest flow:
 * refresh-proof, link-shareable, and deployable anywhere.
 */

export interface SquadMember {
  readonly name: string;
  readonly picks: readonly string[];
}

export interface SquadPayload {
  readonly v: 1;
  readonly members: readonly SquadMember[];
  readonly city?: string;
}

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (value: string): Uint8Array => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

export const encodeSquad = (payload: SquadPayload): string =>
  toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));

export const decodeSquad = (value: string | null): SquadPayload | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(value))) as SquadPayload;
    if (parsed.v !== 1 || !Array.isArray(parsed.members)) return null;
    return {
      v: 1,
      members: parsed.members.map((member) => ({
        name: String(member?.name ?? ""),
        picks: Array.isArray(member?.picks) ? member.picks.map(String) : [],
      })),
      ...(parsed.city ? { city: String(parsed.city) } : {}),
    };
  } catch {
    return null;
  }
};
