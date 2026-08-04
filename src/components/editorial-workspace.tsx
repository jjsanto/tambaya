"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { StoryBlock } from "@/domain/question";

type EditorialQuestion = { id: string; slug: string; question_text: string; publication_state: "DRAFT" | "PUBLISHED" | "ARCHIVED"; claimed_status: string; verified_status: string | null; verification_state: string; category_name: string; context_summary: string; updated_at: string; section_count: number };
type StoryEditorSection = { key: string; kicker: string; title: string; paragraphs: string[]; blocks?: StoryBlock[] };
type EditorialDetail = EditorialQuestion & { sections: StoryEditorSection[]; liveSections: StoryEditorSection[]; hasPendingRevision: boolean; revisionDraftUpdatedAt: string | null; revisions: { id: string; action: string; created_at: string }[] };

const labels: Record<string, string> = { OPEN: "Open", PARTIALLY_ANSWERED: "Partially answered", ANSWERED: "Answered" };

function RichBlockFields({ block, onChange, onRemove }: { block: StoryBlock; onChange: (block: StoryBlock) => void; onRemove: () => void }) {
  return <article className="block-editor"><header><strong>{block.type.toLowerCase()}</strong><button type="button" onClick={onRemove}>Remove</button></header>
    {block.type === "HEADING" && <><label>Heading<input value={block.text} onChange={event => onChange({ ...block,text:event.target.value })}/></label><label>Level<select value={block.level} onChange={event => onChange({ ...block,level:Number(event.target.value) as 3|4 })}><option value="3">Heading 3</option><option value="4">Heading 4</option></select></label></>}
    {block.type === "IMAGE" && <><label>HTTPS image URL<input value={block.src} onChange={event => onChange({ ...block,src:event.target.value })}/></label><label>Alternative text<input value={block.alt} onChange={event => onChange({ ...block,alt:event.target.value })}/></label><label>Caption<input value={block.caption ?? ""} onChange={event => onChange({ ...block,caption:event.target.value })}/></label><label>Credit<input value={block.credit ?? ""} onChange={event => onChange({ ...block,credit:event.target.value })}/></label><label>Source URL<input value={block.sourceUrl ?? ""} onChange={event => onChange({ ...block,sourceUrl:event.target.value })}/></label></>}
    {block.type === "TABLE" && <><label>Caption<input value={block.caption ?? ""} onChange={event => onChange({ ...block,caption:event.target.value })}/></label><label>Headers (use | between cells)<input value={block.headers.join(" | ")} onChange={event => onChange({ ...block,headers:event.target.value.split("|").map(value => value.trim()) })}/></label><label>Rows (one row per line; use | between cells)<textarea rows={5} value={block.rows.map(row => row.join(" | ")).join("\n")} onChange={event => onChange({ ...block,rows:event.target.value.split("\n").filter(Boolean).map(row => row.split("|").map(value => value.trim())) })}/></label></>}
    {block.type === "LIST" && <><label>Style<select value={block.style} onChange={event => onChange({ ...block,style:event.target.value as "ORDERED"|"UNORDERED" })}><option value="UNORDERED">Bullets</option><option value="ORDERED">Numbered</option></select></label><label>Items (one per line)<textarea rows={5} value={block.items.join("\n")} onChange={event => onChange({ ...block,items:event.target.value.split("\n") })}/></label></>}
    {block.type === "QUOTE" && <><label>Quotation<textarea rows={4} value={block.text} onChange={event => onChange({ ...block,text:event.target.value })}/></label><label>Attribution<input value={block.attribution ?? ""} onChange={event => onChange({ ...block,attribution:event.target.value })}/></label><label>Source URL<input value={block.sourceUrl ?? ""} onChange={event => onChange({ ...block,sourceUrl:event.target.value })}/></label></>}
    {block.type === "CALLOUT" && <><label>Title<input value={block.title ?? ""} onChange={event => onChange({ ...block,title:event.target.value })}/></label><label>Tone<select value={block.tone} onChange={event => onChange({ ...block,tone:event.target.value as "NOTE"|"CONTEXT"|"CAUTION" })}><option value="NOTE">Note</option><option value="CONTEXT">Context</option><option value="CAUTION">Caution</option></select></label><label>Text<textarea rows={4} value={block.text} onChange={event => onChange({ ...block,text:event.target.value })}/></label></>}
  </article>;
}

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
    const response = await fetch(url, { ...init, cache: "no-store", headers: { ...init?.headers, Authorization: `Bearer ${token.trim()}` } });
    const result = await response.json() as { error?: string; questions?: EditorialQuestion[]; question?: EditorialDetail };
    if (!response.ok) throw new Error(result.error ?? "The editorial request failed.");
    return result;
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    try {
      sessionStorage.setItem("tambaya-editorial-token", token.trim());
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
    setEditorSections(current => current.map((section, position) => {
      if (position !== index) return section;
      if (field !== "paragraph") return { ...section, [field]: value };
      const blocks = section.blocks?.length ? section.blocks.map((block, blockIndex) => blockIndex === 0 && block.type === "PARAGRAPH" ? { ...block, text: value } : block) : [{ type: "PARAGRAPH" as const, text: value }];
      return { ...section, paragraphs: [value], blocks };
    }));
  }

  function addBlock(sectionIndex: number, type: StoryBlock["type"]) {
    const block: StoryBlock = type === "IMAGE" ? { type, src: "https://", alt: "", caption: "", credit: "" } : type === "TABLE" ? { type, caption: "", headers: ["Column 1","Column 2"], rows: [["",""]] } : type === "LIST" ? { type, style: "UNORDERED", items: [""] } : type === "QUOTE" ? { type, text: "", attribution: "" } : type === "CALLOUT" ? { type, tone: "CONTEXT", title: "", text: "" } : type === "HEADING" ? { type, level: 3, text: "" } : { type, text: "" };
    setEditorSections(current => current.map((section,index) => index === sectionIndex ? { ...section, blocks: [...(section.blocks ?? section.paragraphs.map(text => ({ type: "PARAGRAPH" as const, text }))),block] } : section));
  }

  function replaceBlock(sectionIndex: number, blockIndex: number, block: StoryBlock) { setEditorSections(current => current.map((section,index) => index === sectionIndex ? { ...section, blocks: (section.blocks ?? []).map((item,position) => position === blockIndex ? block : item) } : section)); }
  function removeBlock(sectionIndex: number, blockIndex: number) { setEditorSections(current => current.map((section,index) => index === sectionIndex ? { ...section, blocks: (section.blocks ?? []).filter((_,position) => position !== blockIndex) } : section)); }

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
    <form className="editorial-access" onSubmit={event => { event.preventDefault(); void load(); }}>
      <label>Editorial token<input type="password" value={token} onChange={event => setToken(event.target.value)} placeholder="Stored only for this browser session"/></label>
      <button className="button small" type="submit" disabled={busy || !token.trim()}>{busy ? "Working…" : "Open workspace"}</button>
      <p role="status">{message}</p>
    </form>
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
            {editorSections.map((section, index) => <fieldset key={`${section.key}-${index}`}><legend>Section {index + 1}</legend><label>Kicker<input required value={section.kicker} onChange={event => updateSection(index,"kicker",event.target.value)}/></label><label>Title<input required minLength={4} value={section.title} onChange={event => updateSection(index,"title",event.target.value)}/></label><label>Core paragraph<textarea required minLength={80} rows={6} value={section.paragraphs[0] ?? ""} onChange={event => updateSection(index,"paragraph",event.target.value)} placeholder="At least 80 characters of historical or contextual material that does not resolve the question."/></label><div className="block-editor-list">{(section.blocks ?? []).map((block, blockIndex) => block.type === "PARAGRAPH" && blockIndex === 0 ? null : <RichBlockFields key={blockIndex} block={block} onChange={value => replaceBlock(index,blockIndex,value)} onRemove={() => removeBlock(index,blockIndex)}/>)}</div><div className="add-block"><span>Enrich section:</span>{(["HEADING","IMAGE","TABLE","LIST","QUOTE","CALLOUT"] as StoryBlock["type"][]).map(type => <button type="button" key={type} onClick={() => addBlock(index,type)}>+ {type.toLowerCase()}</button>)}</div></fieldset>)}
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
