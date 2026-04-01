/**
 * Standalone Chatbot Widget Embed Script
 *
 * Self-mounting script for embedding the chatbot on any website.
 * Reads configuration from data attributes on the script tag,
 * fetches tenant config from the widget-config API, and renders
 * the widget into a shadow DOM container.
 *
 * Usage:
 * <script
 *   src="https://office.runwellsystems.com/widget/chatbot.js"
 *   data-tenant="my-business-slug"
 *   data-position="bottom-right"
 *   data-primary-color="#1B2A4A"
 * ></script>
 */

interface WidgetConfig {
  tenantId: string;
  tenantSlug: string;
  businessName: string;
  brand: string;
  primaryColor: string;
  logoUrl: string;
  avatarUrl: string;
  footerText: string;
  greeting: string;
  position: string;
  initialSuggestions?: string[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
}

const WIDGET_API_BASE = (() => {
  const script = document.currentScript as HTMLScriptElement | null;
  if (script?.src) {
    const url = new URL(script.src);
    return `${url.protocol}//${url.host}`;
  }
  return 'https://office.runwellsystems.com';
})();

async function fetchConfig(tenantSlug: string): Promise<WidgetConfig> {
  const res = await fetch(`${WIDGET_API_BASE}/api/widget-config/${tenantSlug}`);
  if (!res.ok) throw new Error(`Widget config not found for tenant: ${tenantSlug}`);
  return res.json();
}

function createWidget(config: WidgetConfig, overrides: Partial<WidgetConfig>) {
  const merged = { ...config, ...overrides };
  const { primaryColor, businessName, logoUrl, avatarUrl, footerText, position, tenantId } = merged;

  const container = document.createElement('div');
  container.id = 'chatbot-widget-root';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'open' });

  const posRight = position !== 'bottom-left';
  const sessionId = `embed-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  let isOpen = false;
  let messages: Message[] = [];
  let isLoading = false;
  let currentSuggestions: string[] = merged.initialSuggestions || [];
  let hasOpened = false;

  function render() {
    shadow.innerHTML = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :host { font-family: system-ui, -apple-system, sans-serif; }

        .cw-root {
          position: fixed;
          bottom: 20px;
          ${posRight ? 'right: 20px;' : 'left: 20px;'}
          z-index: 99999;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .cw-fab {
          width: 56px; height: 56px; border-radius: 50%; border: none;
          background: ${primaryColor}; color: #fff; cursor: pointer;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; margin-left: auto;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .cw-fab:hover { transform: scale(1.05); box-shadow: 0 6px 28px rgba(0,0,0,0.25); }

        .cw-panel {
          width: min(380px, calc(100vw - 24px));
          height: min(520px, calc(100vh - 120px));
          margin-bottom: 12px;
          border-radius: 16px; overflow: hidden;
          display: flex; flex-direction: column;
          background: #fff;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          border: 1px solid #e5e7eb;
        }

        .cw-header {
          padding: 14px 16px; background: ${primaryColor}; color: #fff;
          display: flex; align-items: center; justify-content: space-between;
        }
        .cw-header-left { display: flex; align-items: center; gap: 10px; }
        .cw-header-logo { width: 28px; height: 28px; border-radius: 6px; object-fit: contain; background: rgba(255,255,255,0.15); }
        .cw-header-name { font-weight: 600; font-size: 15px; }
        .cw-header-sub { font-size: 12px; opacity: 0.85; }
        .cw-close {
          background: none; border: none; color: #fff; cursor: pointer;
          padding: 6px; font-size: 20px; min-width: 36px; min-height: 36px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 8px;
        }
        .cw-close:hover { background: rgba(255,255,255,0.15); }

        .cw-messages {
          flex: 1; overflow-y: auto; padding: 16px;
          display: flex; flex-direction: column; gap: 10px;
        }

        .cw-msg { display: flex; gap: 8px; align-items: flex-end; }
        .cw-msg-user { justify-content: flex-end; }
        .cw-msg-avatar { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }

        .cw-bubble {
          max-width: 80%; padding: 10px 14px; border-radius: 16px;
          font-size: 14px; line-height: 1.5; word-break: break-word;
        }
        .cw-bubble-user { background: ${primaryColor}; color: #fff; }
        .cw-bubble-bot { background: #f3f4f6; color: #1f2937; }

        .cw-typing { color: #9ca3af; font-size: 14px; padding: 10px 14px;
          background: #f3f4f6; border-radius: 16px; display: inline-block; }

        .cw-suggestions {
          display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 16px 4px;
        }
        .cw-suggestion {
          padding: 6px 14px; border-radius: 20px; border: 1px solid ${primaryColor};
          background: #fff; color: ${primaryColor}; font-size: 13px;
          cursor: pointer; font-family: inherit; transition: background 0.15s, color 0.15s;
          line-height: 1.3;
        }
        .cw-suggestion:hover { background: ${primaryColor}; color: #fff; }

        .cw-welcome {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          flex: 1; padding: 32px 24px; text-align: center; gap: 16px;
        }
        .cw-welcome-icon { font-size: 36px; opacity: 0.6; }
        .cw-welcome-text { font-size: 15px; color: #6b7280; line-height: 1.5; }

        .cw-input-bar {
          padding: 10px 14px; border-top: 1px solid #e5e7eb;
          display: flex; gap: 8px; align-items: center;
        }
        .cw-input {
          flex: 1; padding: 10px 14px; border-radius: 24px;
          border: 1px solid #d1d5db; background: #fff; color: #1f2937;
          font-size: 16px; outline: none; font-family: inherit;
        }
        .cw-input:focus { border-color: ${primaryColor}; }
        .cw-send {
          padding: 10px 16px; border-radius: 24px; border: none;
          background: ${primaryColor}; color: #fff; font-size: 14px;
          font-weight: 500; cursor: pointer; min-height: 40px;
          font-family: inherit;
        }
        .cw-send:disabled { opacity: 0.5; cursor: not-allowed; }

        .cw-footer {
          padding: 6px; text-align: center; font-size: 11px;
          color: #9ca3af; border-top: 1px solid #e5e7eb;
        }
      </style>

      <div class="cw-root">
        ${isOpen ? `
          <div class="cw-panel">
            <div class="cw-header">
              <div class="cw-header-left">
                ${logoUrl ? `<img class="cw-header-logo" src="${logoUrl}" alt="" />` : ''}
                <div>
                  <div class="cw-header-name">${esc(businessName)}</div>
                  <div class="cw-header-sub">Ask me anything</div>
                </div>
              </div>
              <button class="cw-close" data-action="toggle" aria-label="Close chat">&times;</button>
            </div>
            <div class="cw-messages" id="cw-msgs">
              ${messages.length === 0 && !isLoading ? `
                <div class="cw-welcome">
                  <div class="cw-welcome-icon">${chatIcon()}</div>
                  <div class="cw-welcome-text">How can we help you today?</div>
                </div>
              ` : ''}
              ${messages.map(m => `
                <div class="cw-msg ${m.role === 'user' ? 'cw-msg-user' : ''}">
                  ${m.role === 'assistant' && avatarUrl ? `<img class="cw-msg-avatar" src="${avatarUrl}" alt="" />` : ''}
                  <div class="cw-bubble ${m.role === 'user' ? 'cw-bubble-user' : 'cw-bubble-bot'}">${esc(m.content)}</div>
                </div>
              `).join('')}
              ${isLoading ? '<div class="cw-msg"><div class="cw-typing">Typing...</div></div>' : ''}
            </div>
            ${currentSuggestions.length > 0 && !isLoading ? `
              <div class="cw-suggestions">
                ${currentSuggestions.map(s => `<button class="cw-suggestion" data-action="suggest">${esc(s)}</button>`).join('')}
              </div>
            ` : ''}
            <div class="cw-input-bar">
              <input class="cw-input" type="text" placeholder="Type a message..." id="cw-input" ${isLoading ? 'disabled' : ''} />
              <button class="cw-send" data-action="send" ${isLoading ? 'disabled' : ''}>Send</button>
            </div>
            ${footerText ? `<div class="cw-footer">${esc(footerText)}</div>` : ''}
          </div>
        ` : ''}
        <button class="cw-fab" data-action="toggle" aria-label="${isOpen ? 'Close' : 'Open'} chat">
          ${isOpen ? '&times;' : chatIcon()}
        </button>
      </div>
    `;

    // Bind events
    shadow.querySelectorAll('[data-action="toggle"]').forEach(el =>
      el.addEventListener('click', () => {
        isOpen = !isOpen;
        if (isOpen && !hasOpened) hasOpened = true;
        render();
      })
    );

    shadow.querySelectorAll('[data-action="suggest"]').forEach(el =>
      el.addEventListener('click', () => {
        const text = (el as HTMLElement).textContent?.trim();
        if (text) sendMessage(text);
      })
    );

    const input = shadow.getElementById('cw-input') as HTMLInputElement | null;
    const sendBtn = shadow.querySelector('[data-action="send"]');

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
      });
      setTimeout(() => input.focus(), 50);
    }
    if (sendBtn) sendBtn.addEventListener('click', () => sendMessage());

    const msgsEl = shadow.getElementById('cw-msgs');
    if (msgsEl) msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  async function sendMessage(text?: string) {
    const input = shadow.getElementById('cw-input') as HTMLInputElement | null;
    const msg = text || input?.value?.trim();
    if (!msg || isLoading) return;

    messages.push({ id: `u-${Date.now()}`, role: 'user', content: msg });
    currentSuggestions = [];
    isLoading = true;
    render();

    try {
      const res = await fetch(`${WIDGET_API_BASE}/api/public/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, sessionId, tenantId, channel: 'website' }),
      });
      const data = await res.json();
      const reply = data.reply || data.text || "I couldn't process that. Please try again.";
      const suggestions: string[] = data.suggestions || [];

      messages.push({ id: `a-${Date.now()}`, role: 'assistant', content: reply, suggestions });
      currentSuggestions = suggestions;
    } catch {
      messages.push({
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble connecting. Please try again in a moment.",
      });
      currentSuggestions = [];
    }
    isLoading = false;
    render();
  }

  render();
}

function esc(str: string): string {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

function chatIcon(): string {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
}

// Self-mount on load
(function init() {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) return;

  const tenantSlug = script.getAttribute('data-tenant');
  if (!tenantSlug) {
    console.error('[Chatbot Widget] Missing data-tenant attribute on script tag.');
    return;
  }

  const overrides: Partial<WidgetConfig> = {};
  const pos = script.getAttribute('data-position');
  if (pos) overrides.position = pos;
  const color = script.getAttribute('data-primary-color');
  if (color) overrides.primaryColor = color;

  fetchConfig(tenantSlug)
    .then(config => createWidget(config, overrides))
    .catch(err => console.error('[Chatbot Widget] Failed to load:', err.message));
})();
