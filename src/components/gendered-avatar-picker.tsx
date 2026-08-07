"use client";

import { useState } from "react";
import {
  ProfileAvatar,
  avatarPresets,
  type ProfileGender,
} from "@/components/profile-avatar";

export function GenderedAvatarPicker({
  gender: initialGender,
  avatarType,
  avatarValue,
  username,
}: {
  gender: ProfileGender;
  avatarType: string;
  avatarValue: string;
  username: string;
}) {
  const [gender, setGender] = useState(initialGender);
  const [preset, setPreset] = useState(
    avatarType === "UPLOAD" ? "" : avatarValue,
  );
  const visible = avatarPresets.filter(
    (avatar) => gender === "UNSPECIFIED" || avatar.gender === gender,
  );

  function changeGender(next: ProfileGender) {
    setGender(next);
    const current = avatarPresets.find((avatar) => avatar.id === preset);
    if (next !== "UNSPECIFIED" && current?.gender !== next)
      setPreset(avatarPresets.find((avatar) => avatar.gender === next)?.id ?? "");
  }

  return (
    <>
      <label>
        Gender
        <select
          name="gender"
          value={gender}
          onChange={(event) => changeGender(event.target.value as ProfileGender)}
        >
          <option value="UNSPECIFIED">Prefer not to say</option>
          <option value="FEMALE">Female</option>
          <option value="MALE">Male</option>
        </select>
        <small>This controls which person avatars are available.</small>
      </label>
      <div className="avatar-options">
        {avatarType === "UPLOAD" && (
          <label>
            <input
              type="radio"
              name="preset"
              value=""
              checked={preset === ""}
              onChange={() => setPreset("")}
            />
            <ProfileAvatar type={avatarType} value={avatarValue} username={username} />
            <strong>Current photo</strong>
          </label>
        )}
        {visible.map((avatar) => (
          <label key={avatar.id}>
            <input
              type="radio"
              name="preset"
              value={avatar.id}
              checked={preset === avatar.id}
              onChange={() => setPreset(avatar.id)}
            />
            <ProfileAvatar type="PRESET" value={avatar.id} username={avatar.label} />
            <strong>{avatar.label}</strong>
          </label>
        ))}
      </div>
    </>
  );
}
