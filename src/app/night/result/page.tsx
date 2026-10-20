import { Suspense } from "react";
import { NegotiationConsole } from "../console";

/** Server shell for the results view; the console is a client component. */
export default function ResultPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <NegotiationConsole />
    </Suspense>
  );
}
