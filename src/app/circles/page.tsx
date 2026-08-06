import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthDatabase, getCurrentUser } from "@/lib/auth";
export const metadata: Metadata = { title: "Your circles" };
type CircleRow = {
  id: string;
  name: string;
  description: string;
  role: string;
  member_count: number;
  conversation_count: number;
  updated_at: string;
};
type InvitationRow = {
  id: string;
  circle_id: string;
  name: string;
  description: string;
  username: string;
  created_at: string;
};
export default async function CirclesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = await getAuthDatabase();
  if (!db) redirect("/login");
  const [params, circles, invitations] = await Promise.all([
    searchParams,
    db
      .prepare(
        "SELECT c.id,c.name,c.description,m.role,(SELECT COUNT(*) FROM circle_members cm WHERE cm.circle_id=c.id) member_count,(SELECT COUNT(*) FROM circle_conversations cc WHERE cc.circle_id=c.id) conversation_count,c.updated_at FROM circle_members m JOIN circles c ON c.id=m.circle_id WHERE m.user_id=? ORDER BY c.updated_at DESC",
      )
      .bind(user.id)
      .all<CircleRow>(),
    db
      .prepare(
        "SELECT i.id,i.circle_id,c.name,c.description,u.username,i.created_at FROM circle_invitations i JOIN circles c ON c.id=i.circle_id JOIN users u ON u.id=i.invited_by WHERE i.invitee_id=? AND i.status='PENDING' ORDER BY i.created_at DESC",
      )
      .bind(user.id)
      .all<InvitationRow>(),
  ]);
  return (
    <div className="page shell circles-page">
      <header className="page-intro">
        <span className="eyebrow">Private conversations</span>
        <h1>Tambaya Circles</h1>
        <p>
          Invite people you trust to discuss questions privately. Circle
          messages never become public Tambaya content.
        </p>
      </header>
      {(invitations.results ?? []).length > 0 && (
        <section>
          <span className="eyebrow">Invitations</span>
          <h2>People want to include you</h2>
          <div className="circle-grid">
            {(invitations.results ?? []).map((invite) => (
              <article key={invite.id}>
                <small>Invited by {invite.username}</small>
                <h3>{invite.name}</h3>
                <p>{invite.description || "A private circle."}</p>
                <div>
                  <form
                    action={`/api/circle-invitations/${invite.id}`}
                    method="post"
                  >
                    <button
                      className="button small"
                      name="action"
                      value="accept"
                    >
                      Accept
                    </button>
                  </form>
                  <form
                    action={`/api/circle-invitations/${invite.id}`}
                    method="post"
                  >
                    <button
                      className="button ghost small"
                      name="action"
                      value="decline"
                    >
                      Decline
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <div className="circles-layout">
        <section>
          <span className="eyebrow">Your circles</span>
          <h2>Private spaces</h2>
          <div className="circle-grid">
            {(circles.results ?? []).map((circle) => (
              <article key={circle.id}>
                <small>
                  {circle.role.toLowerCase()} · {circle.member_count} members
                </small>
                <h3>
                  <Link href={`/circles/${circle.id}`}>{circle.name}</Link>
                </h3>
                <p>{circle.description || "No description yet."}</p>
                <span>
                  {circle.conversation_count} conversation
                  {circle.conversation_count === 1 ? "" : "s"}
                </span>
              </article>
            ))}
            {!(circles.results ?? []).length && (
              <p className="empty compact-empty">
                Create your first private circle.
              </p>
            )}
          </div>
        </section>
        <aside>
          <span className="eyebrow">New circle</span>
          <h2>Create a trusted space</h2>
          {params.error && (
            <p className="auth-error">
              Use a name of at least three characters.
            </p>
          )}
          <form action="/api/circles" method="post" className="circle-form">
            <input type="hidden" name="returnTo" value="/circles/{id}" />
            <label>
              Name
              <input
                name="name"
                required
                minLength={3}
                maxLength={80}
                placeholder="The Curiosity Club"
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                maxLength={500}
                rows={5}
                placeholder="What will this circle explore?"
              />
            </label>
            <button className="button">Create circle</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
