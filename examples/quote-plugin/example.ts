import { MCPTracking, type TrackingContext } from "../../sdk/mcp";

/** Adapt these callbacks to your durable PDF store and HTTP response handling. */
export function trackedQuoteTools(tracking: MCPTracking, savePdf: (context: TrackingContext) => Promise<{ downloadUrl: string }>) {
  const calculateQuote = tracking.wrap("calculate_quote", async (args: { quantity: number; unitPrice: number; vatPercent: number }, _extra: { _meta?: Record<string, unknown> }) => {
    const net = args.quantity * args.unitPrice;
    return { structuredContent: { net, gross: net * (1 + args.vatPercent / 100) } };
  });
  const createQuotePdf = tracking.wrap("create_quote_pdf", async (_args: object, _extra: { _meta?: Record<string, unknown> }, context) => {
    // Store the context alongside the PDF, never in its public download URL.
    const pdf = await savePdf(context);
    await tracking.outcome({ ...context, receiptId: `created_${context.invocationId}`, kind: "pdf_created", occurredAt: Date.now() });
    return { structuredContent: pdf };
  });
  return { calculateQuote, createQuotePdf };
}

/** Call after a successful full GET delivery; skip HEAD, previews and failed sends. */
export function reportPdfFetch(tracking: MCPTracking, context: TrackingContext, deliveryId: string, deliveredAt: number) {
  return tracking.outcome({ ...context, receiptId: deliveryId, kind: "pdf_fetched", occurredAt: deliveredAt });
}
