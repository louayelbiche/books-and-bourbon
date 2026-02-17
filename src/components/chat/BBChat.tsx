'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChatWidget } from '@runwell/concierge-shared/chat-widget';
import type { ChatWidgetTheme } from '@runwell/concierge-shared/config';

const SESSION_KEY = 'bb-chat-session';

const bbTheme: ChatWidgetTheme = {
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

  const createSession = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/session/', { method: 'POST' });
      if (!res.ok) return null;
      const data = await res.json();
      const id = data.sessionId as string;
      localStorage.setItem(SESSION_KEY, id);
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
      // Try to restore existing session
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const valid = await validateSession(stored);
        if (!cancelled && valid) {
          setSessionId(stored);
          return;
        }
        // Clear stale ID so we don't retry it on next page load
        localStorage.removeItem(SESSION_KEY);
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
      businessName="Books & Bourbon"
      theme={bbTheme}
      chatApiPath="/api/chat/"
      sessionApiPath="/api/chat/session/"
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
