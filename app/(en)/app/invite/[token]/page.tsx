import type { Metadata } from "next";
import { requireAccount } from "@/lib/tracking/auth";
import InviteAccept from "@/components/InviteAccept";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Site invitation", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const token = decodeURIComponent((await params).token);
  await requireAccount(`/app/invite/${encodeURIComponent(token)}`);
  return <section className="shell section"><div className="card" style={{ padding: 28 }}><h1>Site read access</h1><p>Accept this invitation with the email address it was issued for. Access can be revoked by the site owner.</p><InviteAccept token={token} /></div></section>;
}
