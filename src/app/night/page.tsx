import { Suspense } from "react";
import { SquadRoom } from "./room";

/**
 * Server shell for the squad room; the interactive room lives in room.tsx.
 * Suspense is required around the client component's searchParams usage.
 */
export default function NightPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <SquadRoom />
    </Suspense>
  );
}
