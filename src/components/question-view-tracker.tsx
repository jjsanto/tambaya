"use client";
import { useEffect } from "react";

export function QuestionViewTracker({ questionId }: { questionId: string }) {
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch("/api/activity/views", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId }), signal: controller.signal });
    }, 1200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [questionId]);
  return null;
}
