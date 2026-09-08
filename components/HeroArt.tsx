import type { CSSProperties } from "react";
import { preload } from "react-dom";

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
  // The photograph is the largest element above the fold. As a CSS background the browser
  // only discovers it after the stylesheet resolves; a preload hint fetches it with the HTML.
  preload(`/hero/${name}.webp`, { as: "image", fetchPriority: "high" });
  return (
    <div
      className="heroart"
      aria-hidden="true"
      style={{ "--art": `url(/hero/${name}.webp)` } as CSSProperties}
    />
  );
}
