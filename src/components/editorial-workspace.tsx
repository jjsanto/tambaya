"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type EditorialQuestion = { id: string; slug: string; question_text: string; publication_state: "DRAFT" | "PUBLISHED" | "ARCHIVED"; claimed_status: string; verified_status: string | null; verification_state: string; category_name: string; context_summary: string; updated_at: string; section_count: number };
type StoryEditorSection = { key: string; kicker: string; title: string; paragraphs: string[] };
type EditorialDetail = EditorialQuestion & { sections: StoryEditorSection[]; liveSections: StoryEditorSection[]; hasPendingRevision: boolean; revisionDraftUpdatedAt: string | null; revisions: { id: string; action: string; created_at: string }[] };

const labels: Record<string, string> = { OPEN: "Open", PARTIALLY_ANSWERED: "Partially answered", ANSWERED: "Answered" };

export function EditorialWorkspace() {
  const [token, setToken] = useState("");
  const [questions, setQuestions] = useState<EditorialQuestion[]>([]);
  const [message, setMessage] = useState("Enter the editorial token to load the workspace.");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<EditorialDetail | null>(null);
  const [editorSections, setEditorSections] = useState<StoryEditorSection[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setToken(sessionStorage.getItem("tambaya-editorial-token") ?? ""), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const api = useCallback(async (url: string, init?: RequestInit) => {
    const response = await fetch(url, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${token}` } });
    const result = await response.json() as { error?: string; questions?: EditorialQuestion[]; question?: EditorialDetail };
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

  async function openEditor(question: EditorialQuestion) {
    setBusy(true);
    try {
      if (question.publication_state === "PUBLISHED") await api(`/api/editorial/questions/${question.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "begin_revision" }) });
      const result = await api(`/api/editorial/questions/${question.id}`); const detail = result.question;
      if (!detail) throw new Error("The Story could not be loaded.");
      const defaults = ["Origins", "Evolution", "Why it matters"].map((title, index) => ({ key: `section-${index + 1}`, kicker: "Context", title, paragraphs: [""] }));
      setEditing(detail); setEditorSections(detail.sections.length ? detail.sections : defaults); setMessage("Story editor opened.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to open the Story editor."); }
    finally { setBusy(false); }
  }

  function updateSection(index: number, field: "kicker" | "title" | "paragraph", value: string) {
    setEditorSections(current => current.map((section, position) => position === index ? { ...section, ...(field === "paragraph" ? { paragraphs: [value] } : { [field]: value }) } : section));
  }

  async function saveStory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return; setBusy(true);
    try {
      await api(`/api/editorial/questions/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: editing.publication_state === "PUBLISHED" ? "save_revision" : "save_story", sections: editorSections }) });
      setMessage("Story sections saved as a new private revision."); setEditing(null); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save the Story."); }
    finally { setBusy(false); }
  }

  async function publishRevision() {
    if (!editing || !window.confirm(`Replace the live Story for “${editing.question_text}” with this reviewed revision?`)) return;
    setBusy(true);
    try {
      await api(`/api/editorial/questions/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish_revision" }) });
      setMessage("The reviewed revision is now live; the previous Story remains in revision history."); setEditing(null); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to publish the revision."); }
    finally { setBusy(false); }
  }

  async function discardRevision() {
    if (!editing || !window.confirm("Discard this private working copy? The live Story will remain unchanged.")) return;
    setBusy(true);
    try { await api(`/api/editorial/questions/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "discard_revision" }) }); setEditing(null); setMessage("Private revision discarded; the live Story was not changed."); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to discard the revision."); }
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
          {editing && <form className="story-editor" onSubmit={saveStory}><div className="story-editor-head"><div><small>Private Story revision</small><h3>{editing.question_text}</h3></div><button type="button" className="text-link" onClick={() => setEditing(null)}>Close</button></div>
            {editorSections.map((section, index) => <fieldset key={`${section.key}-${index}`}><legend>Section {index + 1}</legend><label>Kicker<input required value={section.kicker} onChange={event => updateSection(index,"kicker",event.target.value)}/></label><label>Title<input required minLength={4} value={section.title} onChange={event => updateSection(index,"title",event.target.value)}/></label><label>Paragraph<textarea required minLength={80} rows={6} value={section.paragraphs[0] ?? ""} onChange={event => updateSection(index,"paragraph",event.target.value)} placeholder="At least 80 characters of historical or contextual material that does not resolve the question."/></label></fieldset>)}
            <div className="story-editor-controls"><button type="button" className="button ghost small" onClick={() => setEditorSections(current => [...current,{ key:`section-${current.length + 1}`,kicker:"Context",title:"",paragraphs:[""] }])}>Add section</button><span>{editing.publication_state === "PUBLISHED" && <button className="button ghost small" type="button" disabled={busy} onClick={() => void discardRevision()}>Discard</button>}<button className="button small" disabled={busy}>Save revision</button>{editing.publication_state === "PUBLISHED" && editing.hasPendingRevision && <button className="button small publish-revision" type="button" disabled={busy} onClick={() => void publishRevision()}>Publish revision</button>}</span></div>{editing.revisions.length > 0 && <small>{editing.revisions.length} recent revision event{editing.revisions.length === 1 ? "" : "s"} retained.</small>}
          </form>}
          {questions.map(question => <article key={question.id} className={`editorial-record ${question.publication_state.toLowerCase()}`}>
            <div><span>{question.publication_state}</span><small>{question.category_name} · {question.section_count} Story section{question.section_count === 1 ? "" : "s"}</small></div>
            <h3>{question.question_text}</h3><p>{question.context_summary}</p>
            {question.publication_state === "DRAFT" ? <div className="editorial-actions">
              <button className="button ghost small" type="button" disabled={busy} onClick={() => void openEditor(question)}>Edit Story</button>
              <select aria-label={`Verified status for ${question.question_text}`} defaultValue={question.claimed_status} id={`status-${question.id}`}><option value="OPEN">Open</option><option value="PARTIALLY_ANSWERED">Partially answered</option><option value="ANSWERED">Answered</option></select>
              <button className="button small" type="button" disabled={busy} onClick={() => { const select = document.getElementById(`status-${question.id}`) as HTMLSelectElement; void publish(question, select.value); }}>Review & publish</button>
            </div> : <div className="editorial-actions"><button className="button ghost small" type="button" disabled={busy} onClick={() => void openEditor(question)}>Review Story</button><a className="button small" href={`/questions/${question.slug}`}>View live</a></div>}
          </article>)}
        </section>
      </div>
    </>}
  </div>;
}
