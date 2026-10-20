"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { decodeSquad, encodeSquad, type SquadMember } from "@/lib/squad/codec";

/**
 * The squad room. Every member contributes three free-text favorites; state
 * lives in the shareable URL (?p=…) so refresh never loses the table and the
 * link alone carries the squad anywhere.
 */

const blank = (name = ""): SquadMember => ({ name, picks: ["", "", ""] });

const PICK_PROMPTS = ["A film or show you love", "An artist or album", "Food or a restaurant"];

export function SquadRoom() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const payload = decodeSquad(searchParams.get("p"));

  const [members, setMembers] = useState<SquadMember[]>(
    payload?.members.length ? payload.members.map((m) => ({ name: m.name, picks: [...m.picks] })) : [blank("You")],
  );
  const [city, setCity] = useState(payload?.city ?? "");

  // URL mirrors state: the squad is the link.
  useEffect(() => {
    const encoded = encodeSquad({
      v: 1,
      members: members.map((member) => ({ name: member.name, picks: member.picks })),
      ...(city.trim() ? { city: city.trim() } : {}),
    });
    if (searchParams.get("p") !== encoded) {
      window.history.replaceState(null, "", `/night?p=${encoded}`);
    }
  }, [members, city, searchParams]);

  const updateMember = (index: number, patch: Partial<SquadMember>) =>
    setMembers((current) => current.map((member, i) => (i === index ? { ...member, ...patch } : member)));

  const updatePick = (memberIndex: number, pickIndex: number, value: string) =>
    setMembers((current) =>
      current.map((member, i) =>
        i === memberIndex
          ? { ...member, picks: member.picks.map((pick, j) => (j === pickIndex ? value : pick)) }
          : member,
      ),
    );

  const totalPicks = members.reduce((sum, member) => sum + member.picks.filter((p) => p.trim()).length, 0);
  const validNames = members.filter((member) => member.name.trim()).length;
  const canNegotiate = members.length >= 2 && totalPicks >= 4 && validNames >= 2;

  const resolve = () => {
    const serialized = {
      v: 1 as const,
      members: members.map((member) => ({ name: member.name.trim(), picks: member.picks.map((pick) => pick.trim()) })),
      ...(city.trim() ? { city: city.trim() } : {}),
    };
    router.push(`/night/result?p=${encodeSquad(serialized)}`);
  };

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 pt-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="font-mono text-sm font-semibold tracking-[0.2em] uppercase text-ink">Squad Night</span>
        </Link>
        <span className="text-xs text-muted">Step 1 · gather the squad</span>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-28 pt-10">
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Who&apos;s coming, and what do they love?
        </h1>
        <p className="mt-3 max-w-lg text-muted">
          Three favorites each — messy is fine. The agent resolves them onto the Qloo taste graph
          itself and shows you exactly what it matched.
        </p>
        <div className="mt-6">{members.length} member{members.length === 1 ? "" : "s"} · {totalPicks} favorites so far</div>

        <div className="mt-6 space-y-5">
          {members.map((member, memberIndex) => (
            <div key={memberIndex} className="card p-6">
              <div className="flex items-center justify-between gap-4">
                <input
                  value={member.name}
                  onChange={(event) => updateMember(memberIndex, { name: event.target.value })}
                  placeholder={memberIndex === 0 ? "Your name" : `Friend ${memberIndex + 1}`}
                  className="w-44 border-b border-line bg-transparent pb-1.5 text-lg font-semibold text-ink placeholder:text-muted/50 focus:border-accent focus:outline-none"
                />
                {members.length > 1 && memberIndex !== 0 && (
                  <button
                    onClick={() => setMembers((current) => current.filter((_, i) => i !== memberIndex))}
                    className="text-xs text-muted transition-colors hover:text-ink"
                  >
                    remove
                  </button>
                )}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {member.picks.map((pick, pickIndex) => (
                  <input
                    key={pickIndex}
                    value={pick}
                    onChange={(event) => updatePick(memberIndex, pickIndex, event.target.value)}
                    placeholder={PICK_PROMPTS[pickIndex]}
                    className="w-full rounded-lg border border-line bg-surface-2 px-3.5 py-3 text-sm text-ink placeholder:text-muted/50 focus:border-accent focus:outline-none"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <button
            onClick={() => setMembers((current) => [...current, blank()])}
            className="card p-6 text-left transition-colors hover:border-accent"
          >
            <span className="text-sm font-semibold text-accent">+ Add another friend</span>
            <p className="mt-1.5 text-sm text-muted">Up to 5. Each one you add sharpens the negotiation.</p>
          </button>
          <div className="card p-6">
            <label className="text-sm font-semibold text-ink" htmlFor="city">
              Tonight&apos;s city <span className="font-normal text-muted">(for dining — optional)</span>
            </label>
            <input
              id="city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Lagos, NYC, London…"
              className="mt-3 w-full rounded-lg border border-line bg-surface-2 px-3.5 py-3 text-sm text-ink placeholder:text-muted/50 focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <button
            onClick={resolve}
            disabled={!canNegotiate}
            className="rounded-xl bg-accent px-7 py-4 font-semibold text-[#17110c] transition-colors enabled:hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-35"
          >
            Resolve the night →
          </button>
          {!canNegotiate && (
            <span className="text-sm text-muted">Needs 2+ named members and 4+ favorites total.</span>
          )}
        </div>
      </main>
    </div>
  );
}
