import { AcceptInvitationClient } from "../components/accept-invitation-client";

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  return <AcceptInvitationClient token={typeof token === "string" ? token : ""} />;
}
