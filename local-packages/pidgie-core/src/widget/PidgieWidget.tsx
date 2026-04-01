/**
 * Pidgie Chat Widget
 *
 * Embeddable React component for customer-facing chat.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { PidgieWidgetConfig } from '../types/index.js';
import { getBrandConfig } from '../config/brand-utils.js';
import { useVoiceRecorder } from './hooks/useVoiceRecorder.js';
import { VoiceButton } from './components/VoiceButton.js';

export interface PidgieWidgetProps extends PidgieWidgetConfig {
  /** Optional className for styling */
  className?: string;
  /** Enable voice input (default: true) */
  enableVoice?: boolean;
  /** API endpoint for voice transcription (required if enableVoice is true) */
  voiceEndpoint?: string;
  /** Callback when widget opens */
  onOpen?: () => void;
  /** Callback when widget closes */
  onClose?: () => void;
  /** Callback when message is sent */
  onMessageSent?: (message: string) => void;
  /** Callback when response is received */
  onResponseReceived?: (response: string) => void;
  /** Callback when voice transcription is received */
  onVoiceTranscription?: (text: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * PidgieWidget - Embeddable chat widget
 */
export function PidgieWidget({
  apiEndpoint,
  businessId,
  businessName,
  greeting = `Welcome to ${businessName}! How can I help you today?`,
  position = 'bottom-right',
  theme = 'auto',
  primaryColor: primaryColorProp,
  showBranding = true,
  zIndex = 9999,
  className,
  enableVoice = true,
  voiceEndpoint,
  brand: brandSlug,
  logoUrl: logoUrlProp,
  avatarUrl: avatarUrlProp,
  footerText: footerTextProp,
  onOpen,
  onClose,
  onMessageSent,
  onResponseReceived,
  onVoiceTranscription,
}: PidgieWidgetProps) {
  // Resolve brand config: explicit props override brand registry values
  const brandConfig = brandSlug ? getBrandConfig(brandSlug) : null;
  const primaryColor = primaryColorProp ?? brandConfig?.widgetPrimary ?? '#3B82F6';
  const logoUrl = logoUrlProp ?? brandConfig?.logoUrl;
  const avatarUrl = avatarUrlProp ?? brandConfig?.avatarUrl;
  const footerText = footerTextProp ?? brandConfig?.footerText ?? 'Powered by Runwell';
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [sessionId] = useState(() => generateSessionId());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice recording hook
  const voiceRecorder = useVoiceRecorder({
    maxDurationMs: 60000,
    onRecordingStop: async (audioBlob) => {
      if (!voiceEndpoint) return;

      setIsTranscribing(true);
      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('sessionId', sessionId);

        const response = await fetch(voiceEndpoint, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Transcription failed');
        }

        const data = await response.json();
        if (data.text) {
          setInputValue(data.text);
          onVoiceTranscription?.(data.text);
        }
      } catch (error) {
        console.error('Voice transcription error:', error);
      } finally {
        setIsTranscribing(false);
      }
    },
  });

  // Handle voice button click
  const handleVoiceClick = useCallback(() => {
    if (voiceRecorder.isRecording) {
      voiceRecorder.stopRecording();
    } else {
      voiceRecorder.startRecording();
    }
  }, [voiceRecorder]);

  // Add greeting message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'greeting',
          role: 'assistant',
          content: greeting,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, greeting, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => {
      const newState = !prev;
      if (newState) {
        onOpen?.();
      } else {
        onClose?.();
      }
      return newState;
    });
  }, [onOpen, onClose]);

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    onMessageSent?.(userMessage.content);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId,
          businessId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.text || "I'm sorry, I couldn't process that request.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      onResponseReceived?.(assistantMessage.content);
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, apiEndpoint, sessionId, businessId, onMessageSent, onResponseReceived]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  // Determine position styles
  const positionStyles = position === 'bottom-left'
    ? { left: '20px', right: 'auto' }
    : { right: '20px', left: 'auto' };

  // Determine theme
  const isDark = theme === 'dark' || (theme === 'auto' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        bottom: '20px',
        ...positionStyles,
        zIndex,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Chat Panel */}
      {isOpen && (
        <div
          style={{
            width: 'min(380px, calc(100vw - 24px))',
            height: 'min(500px, calc(100vh - 120px))',
            marginBottom: '16px',
            borderRadius: '16px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              backgroundColor: primaryColor,
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt=""
                  style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'contain' }}
                />
              )}
              <div>
                <div style={{ fontWeight: 600, fontSize: '16px' }}>{businessName}</div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Ask me anything</div>
              </div>
            </div>
            <button
              onClick={toggleOpen}
              style={{
                background: 'none',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                padding: '8px',
                fontSize: '20px',
                minWidth: '44px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end',
                  gap: '8px',
                }}
              >
                {message.role === 'assistant' && avatarUrl && (
                  <img
                    src={avatarUrl}
                    alt=""
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                )}
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: '16px',
                    backgroundColor:
                      message.role === 'user'
                        ? primaryColor
                        : isDark
                        ? '#374151'
                        : '#F3F4F6',
                    color: message.role === 'user' ? '#FFFFFF' : isDark ? '#F9FAFB' : '#1F2937',
                    fontSize: '14px',
                    lineHeight: '1.5',
                  }}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '16px',
                    backgroundColor: isDark ? '#374151' : '#F3F4F6',
                    color: isDark ? '#9CA3AF' : '#6B7280',
                    fontSize: '14px',
                  }}
                >
                  Typing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            {/* Voice Button */}
            {enableVoice && voiceEndpoint && (
              <VoiceButton
                isRecording={voiceRecorder.isRecording}
                isProcessing={voiceRecorder.isProcessing || isTranscribing}
                durationMs={voiceRecorder.durationMs}
                isSupported={voiceRecorder.isSupported}
                disabled={isLoading}
                primaryColor={primaryColor}
                isDark={isDark}
                onClick={handleVoiceClick}
              />
            )}
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={voiceRecorder.isRecording ? 'Recording...' : 'Type a message...'}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '24px',
                border: `1px solid ${isDark ? '#4B5563' : '#D1D5DB'}`,
                backgroundColor: isDark ? '#374151' : '#FFFFFF',
                color: isDark ? '#F9FAFB' : '#1F2937',
                fontSize: '16px',
                outline: 'none',
              }}
              disabled={isLoading || voiceRecorder.isRecording}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading || voiceRecorder.isRecording}
              style={{
                padding: '12px 16px',
                minHeight: '44px',
                borderRadius: '24px',
                border: 'none',
                backgroundColor: primaryColor,
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: inputValue.trim() && !isLoading && !voiceRecorder.isRecording ? 'pointer' : 'not-allowed',
                opacity: inputValue.trim() && !isLoading && !voiceRecorder.isRecording ? 1 : 0.5,
              }}
            >
              Send
            </button>
          </div>

          {/* Branding */}
          {showBranding && (
            <div
              style={{
                padding: '8px',
                textAlign: 'center',
                fontSize: '11px',
                color: isDark ? '#6B7280' : '#9CA3AF',
                borderTop: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
              }}
            >
              <span style={{ opacity: 0.8 }}>{footerText}</span>
            </div>
          )}
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={toggleOpen}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: primaryColor,
          color: '#FFFFFF',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          marginLeft: 'auto',
        }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? '×' : '💬'}
      </button>
    </div>
  );
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

