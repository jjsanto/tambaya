import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthDatabase, getCurrentUser } from "@/lib/auth";
import { ProfileAvatar } from "@/components/profile-avatar";
import { GenderedAvatarPicker } from "@/components/gendered-avatar-picker";
export const metadata: Metadata = { title: "Your profile" };
type Profile = {
  username: string;
  bio: string;
  interests: string;
  gender: "FEMALE" | "MALE" | "UNSPECIFIED";
  avatar_type: string;
  avatar_value: string;
};
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = await getAuthDatabase();
  if (!db) redirect("/login");
  const [profile, query] = await Promise.all([
    db
      .prepare(
        "SELECT username,bio,interests,gender,avatar_type,avatar_value FROM users WHERE id=?",
      )
      .bind(user.id)
      .first<Profile>(),
    searchParams,
  ]);
  if (!profile) redirect("/login");
  return (
    <div className="page shell profile-page">
      <nav className="breadcrumbs">
        <Link href="/account">Your account</Link>
        <span>/</span>
        <span>Profile</span>
      </nav>
      <header className="profile-header">
        <ProfileAvatar
          type={profile.avatar_type}
          value={profile.avatar_value}
          username={profile.username}
          size="large"
        />
        <div>
          <span className="eyebrow">Member profile</span>
          <h1>{profile.username}</h1>
          <p>This profile is shared with members of your private circles.</p>
        </div>
      </header>
      {query.saved && <p className="circle-notice">Profile saved.</p>}
      <form
        className="profile-form"
        action="/api/profile"
        method="post"
        encType="multipart/form-data"
      >
        <fieldset>
          <legend>About you</legend>
          <label>
            Bio
            <textarea
              name="bio"
              maxLength={1200}
              rows={7}
              defaultValue={profile.bio}
              placeholder="Introduce yourself to people in your circles."
            />
            <small>Up to 1,200 characters.</small>
          </label>
          <label>
            Interests
            <input
              name="interests"
              maxLength={600}
              defaultValue={profile.interests}
              placeholder="consciousness, astronomy, ethics, history"
            />
            <small>Separate up to 20 interests with commas.</small>
          </label>
        </fieldset>
        <fieldset>
          <legend>Choose an avatar</legend>
          <GenderedAvatarPicker
            gender={profile.gender}
            avatarType={profile.avatar_type}
            avatarValue={profile.avatar_value}
            username={profile.username}
          />
          <label className="profile-photo">
            Or upload a photo
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp,image/gif"
            />
            <small>
              JPEG, PNG, WebP or GIF · maximum 5 MB. A new photo overrides the
              selected avatar.
            </small>
          </label>
        </fieldset>
        <button className="button">Save profile</button>
      </form>
    </div>
  );
}
