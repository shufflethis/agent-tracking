import type { CSSProperties } from "react";

/**
 * A photograph behind a page header.
 *
 * Decorative by construction: it is painted as a CSS background and hidden
 * from assistive technology, because it carries nothing the headline does not
 * already say. An alt text here could only describe a stock office, which is
 * noise in a screen reader rather than information.
 *
 * Readability does not depend on the picture — see .heroart in globals.css.
 * The veil over the image is darkest where the text sits, so a brighter
 * photograph cannot quietly turn the headline unreadable.
 *
 * Put it inside a section carrying `withart`, as the first child.
 */
export default function HeroArt({ name }: { name: string }) {
  return (
    <div
      className="heroart"
      aria-hidden="true"
      style={{ "--art": `url(/hero/${name}.webp)` } as CSSProperties}
    />
  );
}
