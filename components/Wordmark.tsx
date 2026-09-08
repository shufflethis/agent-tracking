import Mark from "@/components/Mark";

/**
 * Mark plus wordmark. The same brand mark as webmcp-tool.com, whose product
 * this started as; the word beside it is what changed.
 */
export default function Wordmark({ id, size = 23 }: { id: string; size?: number }) {
  return (
    <>
      <Mark id={id} size={size} />
      <span>
        agent<em>-</em>tracking
      </span>
    </>
  );
}
