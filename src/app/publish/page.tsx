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
        <h1>Ask now. Enrich over time.</h1>
        <p>
          Begin with a clear question and, if you wish, why you are asking it.
          Its context, sources, relationships, and verification can grow from
          there.
        </p>
      </header>
      <div className="notice">
        <strong>A question does not need to arrive fully formed.</strong> The
        rich Story editor remains available whenever you are ready to add
        context.
      </div>
      <SubmissionEditor
        categories={categories}
        premium={user.plan === "PREMIUM"}
      />
    </div>
  );
}
