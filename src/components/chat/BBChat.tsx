'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChatWidget } from '@runwell/pidgie-shared/chat-widget';

const SESSION_KEY = 'bb-chat-session';
const VISITOR_KEY = 'bb-visitor-id';

const bbTheme = {
  fab: { bg: '#3B0F11', hover: '#5c1a1e', icon: '#f5e6d4' },
  panel: { bg: '#0a0a0a', border: '#2a2a2a', width: '380px', height: '520px' },
  header: { bg: '#3B0F11', text: '#f5e6d4', subtext: '#c6c0ab' },
  userBubble: { bg: '#3B0F11', text: '#f5e6d4', radius: '16px 16px 4px 16px' },
  assistantBubble: { bg: '#1a1a1a', text: '#f5e6d4', border: '#2a2a2a', radius: '16px 16px 16px 4px' },
  suggestion: { bg: '#1a1a1a', text: '#a18320', border: '#2a2a2a', hoverBg: '#2a2a2a', hoverText: '#a18320' },
  input: { bg: '#0a0a0a', border: '#2a2a2a', text: '#f5e6d4', placeholder: '#666', focusBorder: '#3B0F11' },
  sendButton: { bg: '#3B0F11', text: '#f5e6d4', disabledBg: '#1a1a1a', disabledText: '#444' },
  typingDot: '#a18320',
  linkColor: '#a18320',
};

export function BBChat() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState<string | null>(null);

  const createSession = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/session/', { method: 'POST' });
      if (!res.ok) return null;
      const data = await res.json();
      const id = data.sessionId as string;
      localStorage.setItem(SESSION_KEY, id);

      // Store visitor ID if returned by bot-memory
      if (data.visitorId) {
        setVisitorId(data.visitorId);
        localStorage.setItem(VISITOR_KEY, data.visitorId);
      }

      return id;
    } catch {
      return null;
    }
  }, []);

  const validateSession = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/chat/session/?id=${id}`);
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Restore visitor ID
      const storedVisitor = localStorage.getItem(VISITOR_KEY);
      if (storedVisitor) {
        setVisitorId(storedVisitor);
      }

      // Try to restore existing session
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const valid = await validateSession(stored);
        if (!cancelled && valid) {
          setSessionId(stored);
          return;
        }
        // Clear stale IDs so we don't retry on next page load
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(VISITOR_KEY);
        setVisitorId(null);
      }

      // Create new session
      if (!cancelled) {
        const newId = await createSession();
        if (!cancelled && newId) {
          setSessionId(newId);
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, [createSession, validateSession]);

  if (!sessionId) return null;

  return (
    <ChatWidget
      sessionId={sessionId}
      visitorId={visitorId ?? undefined}
      businessName="Books & Bourbon"
      theme={bbTheme}
      chatApiPath="/api/chat/"
      sessionApiPath="/api/chat/session/"
      summarizeApiPath="/api/chat/summarize/"
      assistantLabel="Books & Bourbon"
      poweredByLabel=""
      poweredByFooter={false}
      enableVoice={false}
      initialSuggestions={[
        'What events are coming up?',
        'Tell me about the book club',
        'How do I attend an event?',
      ]}
      cardConfig={{ maxCardsPerMessage: 3, clickBehavior: 'auto' }}
    />
  );
}
