"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { decodeSquad, encodeSquad, type SquadMember } from "@/lib/squad/codec";

/**
 * The squad room. Every member contributes three free-text favorites; state
 * lives in the shareable URL (?p=â€¦) so refresh never loses the table and the
 * link alone carries the squad anywhere.
 */

const MAX_MEMBERS = 5;

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
          <span className="font-mono text-sm font-semibold tracking-[0.2em] uppercase text-ink">
            Squad Night
          </span>
        </Link>
        <p className="num text-xs text-muted">
          {members.length} member{members.length === 1 ? "" : "s"} Â· {totalPicks} favorites
        </p>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-28 pt-10">
        <h1 className="max-w-2xl font-display text-3xl font-semibold tracking-[-0.02em] text-ink md:text-4xl">
          Who&apos;s coming tonight, and what do they honestly love?
        </h1>
        <p className="mt-4 max-w-xl leading-relaxed text-muted">
          Free text is fine, even messy. While the group argues, the agent checks every name against
          Qloo&apos;s taste graph and shows you exactly what it matched.
        </p>

        <div className="mt-9 space-y-4">
          {members.map((member, memberIndex) => (
            <div key={memberIndex} className="card p-6">
              <div className="flex items-center justify-between gap-4">
                <input
                  value={member.name}
                  onChange={(event) => updateMember(memberIndex, { name: event.target.value })}
                  placeholder={memberIndex === 0 ? "Your name" : `Friend ${memberIndex + 1}`}
                  className="w-44 border-b border-line bg-transparent pb-1.5 font-display text-lg font-semibold text-ink placeholder:text-muted/50 focus:border-accent focus:outline-none"
                />
                {members.length > 1 && memberIndex !== 0 && (
                  <button
                    type="button"
                    onClick={() => setMembers((current) => current.filter((_, i) => i !== memberIndex))}
                    className="text-xs text-muted transition-colors hover:text-ink"
                  >
                    remove
                  </button>
                )}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
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

        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <button
            type="button"
            onClick={() => setMembers((current) => [...current, blank()])}
            disabled={members.length >= MAX_MEMBERS}
            className="card p-6 text-left transition-colors enabled:hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-sm font-semibold text-accent">Add another friend</span>
            <p className="mt-1.5 text-sm text-muted">
              {members.length >= MAX_MEMBERS
                ? "Five is the cap â€” the negotiator needs the argument small enough to resolve."
                : "Each person you add sharpens the negotiation."}
            </p>
          </button>
          <div className="card p-6">
            <label htmlFor="city" className="text-sm font-semibold text-ink">
              Tonight&apos;s city
              <span className="ml-2 font-normal text-muted">for dining, optional</span>
            </label>
            <input
              id="city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Lagos, NYC, Londonâ€¦"
              className="mt-3 w-full rounded-lg border border-line bg-surface-2 px-3.5 py-3 text-sm text-ink placeholder:text-muted/50 focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={resolve}
            disabled={!canNegotiate}
            className="rounded-xl bg-accent px-8 py-4 font-semibold text-[#1d1207] transition-colors enabled:hover:bg-accent-deep enabled:hover:text-[#ffe6cc] disabled:cursor-not-allowed disabled:opacity-35"
          >
            Resolve the night
          </button>
          {!canNegotiate && (
            <p className="text-sm text-muted">Needs two named friends and four favorites between you.</p>
          )}
        </div>
      </main>
    </div>
  );
}
