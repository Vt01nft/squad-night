"use client";

/**
 * Replaces Next's built-in error page for prerendering. Kept self-contained
 * (own <html>/<body>) because the root layout may not have mounted when an
 * error fires; styled inline so it needs no external CSS.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" style={{ background: "#140f0b", color: "#f3ead9" }}>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeContent: "center",
          justifyItems: "center",
          gap: 16,
          fontFamily: "ui-monospace, monospace",
        }}
      >
        <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>The negotiation stopped</p>
        <p style={{ margin: 0, fontSize: 13, color: "#a5977f", maxWidth: 420, textAlign: "center" }}>
          {error.digest ? `Something broke unexpectedly (ref ${error.digest}).` : "Something broke unexpectedly."}
        </p>
        <button
          onClick={reset}
          style={{
            background: "#e08a35",
            color: "#1d1207",
            border: 0,
            borderRadius: 10,
            padding: "12px 22px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try the night again
        </button>
      </body>
    </html>
  );
}
