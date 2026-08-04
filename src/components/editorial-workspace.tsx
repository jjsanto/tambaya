"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type EditorialQuestion = { id: string; slug: string; question_text: string; publication_state: "DRAFT" | "PUBLISHED" | "ARCHIVED"; claimed_status: string; verified_status: string | null; verification_state: string; category_name: string; context_summary: string; updated_at: string; section_count: number };

const labels: Record<string, string> = { OPEN: "Open", PARTIALLY_ANSWERED: "Partially answered", ANSWERED: "Answered" };

export function EditorialWorkspace() {
  const [token, setToken] = useState("");
  const [questions, setQuestions] = useState<EditorialQuestion[]>([]);
  const [message, setMessage] = useState("Enter the editorial token to load the workspace.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setToken(sessionStorage.getItem("tambaya-editorial-token") ?? ""), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const api = useCallback(async (url: string, init?: RequestInit) => {
    const response = await fetch(url, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${token}` } });
    const result = await response.json() as { error?: string; questions?: EditorialQuestion[] };
    if (!response.ok) throw new Error(result.error ?? "The editorial request failed.");
    return result;
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    try {
      sessionStorage.setItem("tambaya-editorial-token", token);
      const result = await api("/api/editorial/questions");
      setQuestions(result.questions ?? []);
      setMessage("Workspace connected to production D1.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load the workspace."); }
    finally { setBusy(false); }
  }, [api, token]);

  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const form = event.currentTarget;
    try {
      await api("/api/editorial/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      form.reset(); setMessage("Draft saved. It remains private until reviewed and published."); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save the draft."); }
    finally { setBusy(false); }
  }

  async function publish(question: EditorialQuestion, verifiedStatus: string) {
    if (!window.confirm(`Publish “${question.question_text}” with status ${labels[verifiedStatus]}?`)) return;
    setBusy(true);
    try {
      await api(`/api/editorial/questions/${question.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish", verifiedStatus }) });
      setMessage("Question reviewed and published."); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to publish the draft."); }
    finally { setBusy(false); }
  }

  return <div className="editorial-workspace">
    <section className="editorial-access">
      <label>Editorial token<input type="password" value={token} onChange={event => setToken(event.target.value)} placeholder="Stored only for this browser session"/></label>
      <button className="button small" type="button" onClick={load} disabled={busy || !token}>{busy ? "Working…" : "Open workspace"}</button>
      <p role="status">{message}</p>
    </section>
    {questions.length > 0 && <>
      <div className="editorial-grid">
        <form className="editorial-form" onSubmit={createDraft}>
          <span className="eyebrow">New record</span><h2>Create a private draft</h2>
          <label>Question<input name="questionText" required minLength={10} placeholder="What is a question worth preserving?"/></label>
          <label>Claimed status<select name="claimedStatus" defaultValue="OPEN"><option value="OPEN">Open</option><option value="PARTIALLY_ANSWERED">Partially answered</option><option value="ANSWERED">Answered</option></select></label>
          <label>Category<input name="category" required placeholder="Philosophy"/></label>
          <label>Context summary<textarea name="contextSummary" required minLength={150} rows={8} placeholder="At least 150 characters describing the question’s history and importance without resolving it."/></label>
          <button className="button" disabled={busy}>Save private draft →</button>
        </form>
        <section className="editorial-queue"><span className="eyebrow">Review queue</span><h2>Questions in D1</h2>
          {questions.map(question => <article key={question.id} className={`editorial-record ${question.publication_state.toLowerCase()}`}>
            <div><span>{question.publication_state}</span><small>{question.category_name} · {question.section_count} Story section{question.section_count === 1 ? "" : "s"}</small></div>
            <h3>{question.question_text}</h3><p>{question.context_summary}</p>
            {question.publication_state === "DRAFT" ? <div className="editorial-actions">
              <select aria-label={`Verified status for ${question.question_text}`} defaultValue={question.claimed_status} id={`status-${question.id}`}><option value="OPEN">Open</option><option value="PARTIALLY_ANSWERED">Partially answered</option><option value="ANSWERED">Answered</option></select>
              <button className="button small" type="button" disabled={busy} onClick={() => { const select = document.getElementById(`status-${question.id}`) as HTMLSelectElement; void publish(question, select.value); }}>Review & publish</button>
            </div> : <a className="text-link" href={`/questions/${question.slug}`}>View public Story →</a>}
          </article>)}
        </section>
      </div>
    </>}
  </div>;
}
