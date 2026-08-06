const presets: Record<string, string> = {
  explorer: "🧭",
  observer: "🔭",
  scholar: "📚",
  constellation: "✦",
  question: "?",
  naturalist: "🌿",
};
export const avatarPresets = Object.entries(presets).map(([id, symbol]) => ({
  id,
  symbol,
  label: id[0].toUpperCase() + id.slice(1),
}));
export function ProfileAvatar({
  type,
  value,
  username,
  size = "medium",
}: {
  type: string;
  value: string;
  username: string;
  size?: "small" | "medium" | "large";
}) {
  return type === "UPLOAD" ? (
    <span className={`profile-avatar ${size}`}>
      <Image
        unoptimized
        width={160}
        height={160}
        src={`/api/profile-images/${value}`}
        alt={`${username}'s profile`}
      />
    </span>
  ) : (
    <span
      className={`profile-avatar preset avatar-${value} ${size}`}
      aria-label={`${value} avatar`}
    >
      {presets[value] ?? presets.explorer}
    </span>
  );
}
import Image from "next/image";
