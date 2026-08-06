import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthDatabase, getCurrentUser, normalizeUsername } from "@/lib/auth";
import { ProfileAvatar } from "@/components/profile-avatar";
export const metadata: Metadata = { title: "Circle member" };
type Profile = {
  id: string;
  username: string;
  bio: string;
  interests: string;
  avatar_type: string;
  avatar_value: string;
  shared_circles: number;
};
export default async function MemberPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");
  const db = await getAuthDatabase();
  if (!db) redirect("/login");
  const username = normalizeUsername((await params).username);
  const profile = await db
    .prepare(
      "SELECT u.id,u.username,u.bio,u.interests,u.avatar_type,u.avatar_value,(SELECT COUNT(*) FROM circle_members mine JOIN circle_members theirs ON theirs.circle_id=mine.circle_id WHERE mine.user_id=? AND theirs.user_id=u.id) shared_circles FROM users u WHERE u.username=? COLLATE NOCASE",
    )
    .bind(viewer.id, username)
    .first<Profile>();
  if (!profile || (profile.id !== viewer.id && !profile.shared_circles))
    notFound();
  const interests = profile.interests
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return (
    <div className="page shell member-profile">
      <nav className="breadcrumbs">
        <Link href="/circles">Circles</Link>
        <span>/</span>
        <span>Member profile</span>
      </nav>
      <header className="profile-header">
        <ProfileAvatar
          type={profile.avatar_type}
          value={profile.avatar_value}
          username={profile.username}
          size="large"
        />
        <div>
          <span className="eyebrow">Circle member</span>
          <h1>{profile.username}</h1>
          <p>
            {profile.id === viewer.id
              ? "This is your profile."
              : `You share ${profile.shared_circles} private circle${profile.shared_circles === 1 ? "" : "s"}.`}
          </p>
          {profile.id === viewer.id && (
            <Link className="button small" href="/account/profile">
              Edit profile
            </Link>
          )}
        </div>
      </header>
      <section className="member-about">
        <div>
          <span className="eyebrow">Bio</span>
          <h2>About {profile.username}</h2>
          <p>{profile.bio || "This member has not added a bio yet."}</p>
        </div>
        <aside>
          <span className="eyebrow">Interests</span>
          <div className="interest-tags">
            {interests.map((interest) => (
              <span key={interest}>{interest}</span>
            ))}
            {!interests.length && <p>No interests listed yet.</p>}
          </div>
        </aside>
      </section>
    </div>
  );
}
