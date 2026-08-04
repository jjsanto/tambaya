import type { Metadata } from "next";
import { EditorialWorkspace } from "@/components/editorial-workspace";
export const metadata: Metadata = { title: "Editorial workspace" };
export default function EditorialPage() { return <div className="page shell"><header className="page-intro"><span className="eyebrow">Tambaya editorial</span><h1>Question publishing workspace</h1><p>Create private drafts, inspect the review queue, verify status metadata, and publish approved questions directly to D1.</p></header><div className="notice"><strong>Public-content rule:</strong> provide context, history, and significance—but never resolve the question. New records remain private until an editor explicitly publishes them.</div><EditorialWorkspace/></div>; }
