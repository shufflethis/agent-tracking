/**
 * The brand mark: the angle brackets of the web around the dot of a callable
 * action. Same drawing as the favicon, minus its dark tile — on the page it
 * sits on the real ground rather than carrying its own.
 *
 * Inline rather than <img src="/icon.svg"> so it scales without a second
 * request and can be sized from the call site. The gradient id has to be
 * unique per instance: two <linearGradient id="g"> on one page is a duplicate
 * id, and the second mark would silently reference the first one's stops.
 */
export default function Mark({ id, size = 22 }: { id: string; size?: number }) {
  const gid = `mark-${id}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", flex: "none" }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          {/* var() goes in style, not in the stop-color attribute: support for
              custom properties in SVG presentation attributes is uneven, and a
              stop that fails to parse falls back to black. */}
          <stop offset="0" style={{ stopColor: "var(--cyan)" }} />
          <stop offset="1" style={{ stopColor: "var(--violet)" }} />
        </linearGradient>
      </defs>
      <path
        d="M11.5 9 5.5 16l6 7M20.5 9l6 7-6 7"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="2.7" fill={`url(#${gid})`} />
    </svg>
  );
}
