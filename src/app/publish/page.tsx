import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthDatabase, getCurrentUser } from "@/lib/auth";
import { SubmissionEditor } from "@/components/submission-editor";
export const metadata: Metadata = { title: "Publish a question" };
export default async function PublishPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = await getAuthDatabase();
  if (!db) redirect("/login");
  const categories =
    (
      await db
        .prepare("SELECT id,name FROM categories ORDER BY name")
        .all<{ id: string; name: string }>()
    ).results ?? [];
  return (
    <div className="page shell">
      <header className="page-intro">
        <span className="eyebrow">Publisher workspace</span>
        <h1>Publish a question worth asking.</h1>
        <p>
          Build an encyclopedic Story around the question. Save privately,
          preview your work, then submit it for editorial verification.
        </p>
      </header>
      <div className="notice">
        <strong>Remember:</strong> explain the question’s history, framing, and
        significance—but do not answer it.
      </div>
      <SubmissionEditor categories={categories} premium={user.plan === "PREMIUM"} />
    </div>
  );
}
