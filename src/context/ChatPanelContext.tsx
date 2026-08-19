"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Whether the agent panel is showing.
 *
 * Collapsed on arrival, to an edge tab carrying the page's agent name. Every
 * surface here already leads with what its agent found — the decision queue,
 * the recommendation column, the board's proposals — so the panel is where you
 * go to ask a follow-up, not where the work is announced. Opening it costs the
 * page 340px, which is worth paying only once someone has a question.
 */
interface ChatPanelValue {
  open: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
}

const ChatPanelContext = createContext<ChatPanelValue | undefined>(undefined);

export function ChatPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openChat = useCallback(() => setOpen(true), []);
  const closeChat = useCallback(() => setOpen(false), []);
  const toggleChat = useCallback(() => setOpen((v) => !v), []);

  const value = useMemo(
    () => ({ open, openChat, closeChat, toggleChat }),
    [open, openChat, closeChat, toggleChat],
  );

  return <ChatPanelContext.Provider value={value}>{children}</ChatPanelContext.Provider>;
}

export function useChatPanel(): ChatPanelValue {
  const ctx = useContext(ChatPanelContext);
  if (!ctx) throw new Error("useChatPanel must be used inside a ChatPanelProvider");
  return ctx;
}
