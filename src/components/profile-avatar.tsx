import Image from "next/image";

export type ProfileGender = "FEMALE" | "MALE" | "UNSPECIFIED";

const presets = {
  "woman-mediterranean": { src: "/images/avatars/woman-mediterranean.png", label: "Mediterranean woman", gender: "FEMALE" },
  "woman-african": { src: "/images/avatars/woman-african.png", label: "African woman", gender: "FEMALE" },
  "woman-south-asian": { src: "/images/avatars/woman-south-asian.png", label: "South Asian woman", gender: "FEMALE" },
  "man-east-asian": { src: "/images/avatars/man-east-asian.png", label: "East Asian man", gender: "MALE" },
  "man-european": { src: "/images/avatars/man-european.png", label: "European man", gender: "MALE" },
  "man-middle-eastern": { src: "/images/avatars/man-middle-eastern.png", label: "Middle Eastern man", gender: "MALE" },
} as const;

export const avatarPresets = Object.entries(presets).map(([id, preset]) => ({ id, ...preset }));

export function ProfileAvatar({ type, value, username, size = "medium" }: {
  type: string;
  value: string;
  username: string;
  size?: "small" | "medium" | "large";
}) {
  const preset = presets[value as keyof typeof presets] ?? presets["woman-mediterranean"];
  const src = type === "UPLOAD" ? `/api/profile-images/${value}` : preset.src;
  return (
    <span className={`profile-avatar ${type === "PRESET" ? "preset" : ""} ${size}`}>
      <Image unoptimized={type === "UPLOAD"} width={160} height={160} src={src} alt={`${username}'s profile portrait`} />
    </span>
  );
}
