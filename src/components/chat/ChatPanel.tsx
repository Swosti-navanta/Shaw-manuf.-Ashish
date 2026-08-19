"use client";

import { useEffect, useRef, useState } from "react";
import { AiStar, Button } from "@navanta-ai/design-system";
import { PaperPlaneRight, X } from "@phosphor-icons/react";
import { useChatPanel } from "@/context/ChatPanelContext";
import TaskRun from "./TaskRun";

// Prompt chips live inside this component, so they set the composer directly
// rather than round-tripping through context — no state-syncing effect needed.

/**
 * The portal's one chat panel — a right-docked surface. A run raised by a row
 * action or a card CTA narrates here; its follow-up prompts dock above the
 * composer as "Try:" chips that seed the input. It never signs a proposal or
 * releases a schedule — that stays with the agents' own decks.
 */
export default function ChatPanel() {
  const { open, task, close } = useChatPanel();
  const [input, setInput] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  // Keep the newest content in view as a run reveals.
  useEffect(() => {
    if (open && bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [open, task]);

  if (!open) return null;

  return (
    <>
      {/* Scrim — dismisses. */}
      <div
        className="fixed inset-0 z-[1200]"
        style={{ background: "rgba(15, 16, 35, 0.35)" }}
        onClick={close}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Ask the agents"
        className="fixed top-0 right-0 z-[1201] flex flex-col"
        style={{
          height: "100vh",
          width: "min(440px, 100vw)",
          background: "var(--surface-base)",
          borderLeft: "1px solid var(--border-default)",
          boxShadow: "-16px 0 48px rgba(15,16,35,.16)",
        }}
      >
        {/* Head. */}
        <div
          className="flex items-center justify-between shrink-0"
          style={{ gap: 12, padding: "14px 16px", borderBottom: "1px solid var(--border-default)" }}
        >
          <span className="inline-flex items-center" style={{ gap: 8 }}>
            <AiStar size={16} />
            <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
              {task ? `${task.agent} · ${task.label}` : "Ask the agents"}
            </span>
          </span>
          <Button variant="ghost" size="icon" onClick={close} aria-label="Close">
            <X size={16} weight="bold" />
          </Button>
        </div>

        {/* Transcript. */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto" style={{ padding: 16 }}>
          {task ? (
            <TaskRun key={task.id} task={task} />
          ) : (
            <div
              className="flex items-start"
              style={{
                gap: 9,
                padding: "12px 14px",
                borderRadius: 12,
                background: "var(--color-iris-50)",
                border: "1px solid var(--color-iris-200)",
              }}
            >
              <AiStar size={15} style={{ marginTop: 1, flexShrink: 0 }} />
              <span className="type-body" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}>
                Ask about anything on this screen — a deviation, a reading, the rule behind a call.
                The agents explain and draft; they never sign or release on their own.
              </span>
            </div>
          )}
        </div>

        {/* Follow-up prompt chips. */}
        {task && task.outcome.prompts.length > 0 && (
          <div
            className="flex flex-wrap shrink-0"
            style={{ gap: 6, padding: "10px 16px 0" }}
          >
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)", alignSelf: "center" }}>
              Try:
            </span>
            {task.outcome.prompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setInput(p)}
                className="type-caption transition-colors"
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  cursor: "pointer",
                  background: "var(--surface-base)",
                  border: "1px solid var(--border-default)",
                  color: "var(--ds-text-primary)",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Composer. */}
        <div className="shrink-0" style={{ padding: 16 }}>
          <div
            className="flex items-center"
            style={{
              gap: 8,
              padding: "8px 8px 8px 14px",
              borderRadius: 12,
              background: "var(--surface-base)",
              border: "1px solid var(--border-default)",
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a follow-up…"
              className="flex-1 type-body"
              style={{ border: "none", outline: "none", background: "transparent", color: "var(--ds-text-primary)" }}
            />
            <Button variant="primary" size="icon" aria-label="Send" disabled={!input.trim()}>
              <PaperPlaneRight size={15} weight="bold" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
