"use client";
import {
  useMobileChat
} from "../chunk-HJAFR3AG.js";
import {
  ChatSessionSync
} from "../chunk-6EDNNK4I.js";

// src/chat-widget/ChatWidget.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, X, Send, Loader2, User, Minus, Mic, Square } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { CardList, ActionPills } from "@runwell/card-system/components";
import { DEFAULT_CARD_CONFIG, DEFAULT_CARD_THEME } from "@runwell/card-system/utils";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var WIDGET_Z_INDEX = 50;
function isValidUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
function ChatWidget({
  sessionId,
  businessName,
  theme,
  chatApiPath = "/api/chat",
  voiceApiPath = "/api/chat/voice",
  sessionApiPath,
  enableVoice = true,
  initialSuggestions = [],
  assistantLabel,
  poweredByLabel = "Powered by Runwell Systems",
  emptyStateMessage,
  onMessageCount,
  assistantIcon,
  fabIcon,
  labels,
  allowMinimize = true,
  poweredByFooter = { label: "Powered by Runwell Systems", url: "https://runwellsystems.com/en/home-agency" },
  cardConfig: cardConfigOverride,
  onCardClick: onCardClickProp,
  onAction: onActionProp,
  enableSync = false,
  disablePortal = false,
  visitorId,
  historyApiPath,
  summarizeApiPath,
  chatApiExtraBody,
  chatApiHeaders,
  voiceLanguageHint,
  onChatResponse,
  onAnalyticsEvent
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [widgetState, setWidgetState] = useState("collapsed");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(enableVoice);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [followUpSuggestions, setFollowUpSuggestions] = useState([]);
  const [historyHasMore, setHistoryHasMore] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOldestTimestamp, setHistoryOldestTimestamp] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const durationIntervalRef = useRef(null);
  const autoStopRef = useRef(null);
  const syncRef = useRef(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  useEffect(() => {
    if (!enableSync) return;
    const sync = new ChatSessionSync(sessionId);
    sync.onStateUpdate = (state) => {
      const synced = state.messages.map((m) => ({
        role: m.role,
        content: m.content,
        cards: m.cards,
        actions: m.actions
      }));
      setMessages(synced);
      setFollowUpSuggestions(state.suggestions);
    };
    syncRef.current = sync;
    return () => {
      sync.destroy();
      syncRef.current = null;
    };
  }, [enableSync, sessionId]);
  const mergedCardConfig = { ...DEFAULT_CARD_CONFIG, ...cardConfigOverride };
  const mergedCardTheme = theme.card ?? DEFAULT_CARD_THEME;
  const handleCardClick = useCallback((card) => {
    onAnalyticsEvent?.({
      eventType: "interaction.card_clicked",
      entityType: card.type,
      entityId: card.id,
      entityName: card.title,
      metadata: { cardType: card.type, url: card.url }
    });
    if (onCardClickProp) {
      onCardClickProp(card);
    } else if (isValidUrl(card.url)) {
      window.open(card.url, "_blank", "noopener,noreferrer");
    }
  }, [onCardClickProp, onAnalyticsEvent]);
  const handleAction = useCallback((action) => {
    onAnalyticsEvent?.({
      eventType: "interaction.action_clicked",
      metadata: { actionType: action.type, label: action.label, payload: action.payload }
    });
    if (onActionProp) {
      onActionProp(action);
    } else if (action.type === "navigate" && isValidUrl(action.payload)) {
      window.open(action.payload, "_blank", "noopener,noreferrer");
    } else if (action.type === "message") {
      sendMessageRef.current?.(action.payload);
    }
  }, [onActionProp, onAnalyticsEvent]);
  const sendMessageRef = useRef(null);
  const [audioLevels, setAudioLevels] = useState([0, 0, 0, 0, 0]);
  const audioCtxRef = useRef(null);
  const rafRef = useRef(0);
  const prevMessageCountRef = useRef(0);
  const { isMobile, isKeyboardOpen, inputBarStyle } = useMobileChat({ isOpen: widgetState === "expanded" });
  useEffect(() => {
    if (!sessionApiPath || !sessionId) return;
    let cancelled = false;
    fetch(`${sessionApiPath}?id=${sessionId}`).then((res) => res.ok ? res.json() : null).then((data) => {
      if (cancelled) return;
      if (data?.messages?.length) {
        const restored = data.messages.map((m) => ({
          role: m.role,
          content: m.content,
          ...m.cards?.length ? { cards: m.cards } : {},
          ...m.actions?.length ? { actions: m.actions } : {}
        }));
        setMessages(restored);
        onMessageCount?.(restored.filter((m) => m.role === "user").length);
      } else {
        setMessages([]);
        setFollowUpSuggestions([]);
      }
    }).catch(() => {
      setMessages([]);
      setFollowUpSuggestions([]);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionApiPath, sessionId]);
  const voiceSupported = enableVoice && typeof window !== "undefined" && "MediaRecorder" in window && "mediaDevices" in navigator;
  const releaseMic = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    cancelAnimationFrame(rafRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t2) => t2.stop());
    streamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
  }, []);
  useEffect(() => {
    const handlePageHide = () => releaseMic();
    window.addEventListener("beforeunload", handlePageHide);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      releaseMic();
      window.removeEventListener("beforeunload", handlePageHide);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [releaseMic]);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const beaconSentRef = useRef(false);
  useEffect(() => {
    if (!summarizeApiPath) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && sessionIdRef.current && !beaconSentRef.current) {
        beaconSentRef.current = true;
        const payload = JSON.stringify({ sessionId: sessionIdRef.current });
        navigator.sendBeacon(summarizeApiPath, payload);
      }
      if (document.visibilityState === "visible") {
        beaconSentRef.current = false;
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [summarizeApiPath]);
  useEffect(() => {
    if (widgetState === "expanded") messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, widgetState, isKeyboardOpen, followUpSuggestions, isLoading]);
  useEffect(() => {
    if (widgetState === "expanded") setTimeout(() => inputRef.current?.focus(), 100);
  }, [widgetState]);
  useEffect(() => {
    if (widgetState === "minimized" && messages.length > prevMessageCountRef.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === "assistant") {
        setHasNewMessage(true);
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, widgetState]);
  const startRecording = useCallback(async () => {
    if (!voiceSupported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t2) => t2.stop());
        streamRef.current = null;
        cancelAnimationFrame(rafRef.current);
        audioCtxRef.current?.close();
        audioCtxRef.current = null;
        setAudioLevels([0, 0, 0, 0, 0]);
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
        setRecordingDuration(0);
        setIsRecording(false);
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
          await transcribeAudio(blob);
        }
      };
      mediaRecorder.onerror = () => {
        releaseMic();
        setIsRecording(false);
      };
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 32;
      source.connect(analyserNode);
      audioCtxRef.current = ctx;
      const freqData = new Uint8Array(analyserNode.frequencyBinCount);
      const step = Math.max(1, Math.floor(freqData.length / 5));
      const tick = () => {
        analyserNode.getByteFrequencyData(freqData);
        setAudioLevels(Array.from({ length: 5 }, (_, i) => freqData[i * step] / 255));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      const startTime = Date.now();
      durationIntervalRef.current = window.setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1e3));
      }, 100);
      autoStopRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      }, 6e4);
    } catch (error) {
      console.error("Failed to start recording:", error);
      releaseMic();
      setIsRecording(false);
    }
  }, [voiceSupported, sessionId]);
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
  }, []);
  async function transcribeAudio(blob) {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      const ext = blob.type?.includes("mp4") ? "mp4" : "webm";
      formData.append("audio", blob, `recording.${ext}`);
      formData.append("sessionId", sessionId);
      if (voiceLanguageHint) formData.append("language", voiceLanguageHint);
      const res = await fetch(voiceApiPath, { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          setInput(data.text);
          inputRef.current?.focus();
        }
      } else {
        let errorDetail = "";
        try {
          const errData = await res.json();
          errorDetail = errData.error || errData.message || "";
        } catch {
        }
        const fallback = labels?.errorMessage || "Voice transcription failed. Please try again or type your message.";
        console.error("[Voice] API error:", res.status, errorDetail);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: errorDetail || fallback }
        ]);
      }
    } catch (error) {
      console.error("Transcription failed:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: labels?.errorMessage || "Voice transcription failed. Please try again or type your message." }
      ]);
    } finally {
      setIsTranscribing(false);
    }
  }
  const canLoadHistory = !!(visitorId && historyApiPath && historyHasMore && !historyLoading);
  const loadEarlierMessages = useCallback(async () => {
    if (!visitorId || !historyApiPath || !historyHasMore || historyLoading) return;
    setHistoryLoading(true);
    try {
      const url = new URL(historyApiPath, window.location.origin);
      url.searchParams.set("limit", "20");
      if (historyOldestTimestamp) {
        url.searchParams.set("before", historyOldestTimestamp);
      }
      const res = await fetch(url.toString(), {
        headers: { "x-visitor-id": visitorId }
      });
      if (!res.ok) throw new Error("Failed to load history");
      const data = await res.json();
      const container = messagesContainerRef.current;
      const prevScrollHeight = container?.scrollHeight ?? 0;
      const historyMessages = (data.messages ?? []).map(
        (m) => ({
          role: m.role,
          content: m.content
        })
      );
      if (historyMessages.length > 0) {
        historyMessages.reverse();
        setMessages((prev) => [...historyMessages, ...prev]);
      }
      setHistoryHasMore(data.hasMore ?? false);
      setHistoryOldestTimestamp(data.oldestTimestamp ?? null);
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - prevScrollHeight;
        }
      });
    } catch (error) {
      console.error("[ChatWidget] Failed to load history:", error);
    } finally {
      setHistoryLoading(false);
    }
  }, [visitorId, historyApiPath, historyHasMore, historyLoading, historyOldestTimestamp]);
  const sendMessage = useCallback(
    async (directMessage) => {
      const text = (directMessage || input).trim();
      if (!text || isLoading) return;
      setInput("");
      if (inputRef.current) inputRef.current.style.height = "auto";
      setIsLoading(true);
      setFollowUpSuggestions([]);
      setMessages((prev) => {
        const updated = [...prev, { role: "user", content: text }];
        onMessageCount?.(updated.filter((m) => m.role === "user").length);
        return updated;
      });
      let addedAssistantMsg = false;
      try {
        const controller = new AbortController();
        let idleTimer;
        const resetIdle = () => {
          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = setTimeout(() => controller.abort(), 2e4);
        };
        resetIdle();
        const res = await fetch(chatApiPath, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...chatApiHeaders },
          body: JSON.stringify({ sessionId, message: text, ...chatApiExtraBody }),
          signal: controller.signal
        });
        if (!res.ok) {
          if (idleTimer) clearTimeout(idleTimer);
          throw new Error("Failed to send");
        }
        const reader = res.body?.getReader();
        if (!reader) {
          if (idleTimer) clearTimeout(idleTimer);
          throw new Error("No body");
        }
        const decoder = new TextDecoder();
        let assistantMsg = "";
        addedAssistantMsg = true;
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
        while (true) {
          const { done, value } = await reader.read();
          resetIdle();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "text" && data.content) {
                assistantMsg += data.content;
                const display = assistantMsg.replace(/\[CARDS\][\s\S]*?(\[\/CARDS\])?$/gi, "").replace(/\[ACTIONS\][\s\S]*?(\[\/ACTIONS\])?$/gi, "").replace(/\[SUGGESTIONS?:\s*[^\]]*\]?\s*$/i, "").replace(/<suggestions?>[\s\S]*$/i, "").trimEnd();
                setMessages((prev) => {
                  const u = [...prev];
                  u[u.length - 1] = { role: "assistant", content: display };
                  return u;
                });
              } else if (data.type === "text_replace" && data.content != null) {
                assistantMsg = data.content;
                setMessages((prev) => {
                  const u = [...prev];
                  u[u.length - 1] = { ...u[u.length - 1], role: "assistant", content: data.content };
                  return u;
                });
              } else if (data.type === "cards" && data.cards) {
                setMessages((prev) => {
                  const u = [...prev];
                  const lastMsg = u[u.length - 1];
                  if (lastMsg?.role === "assistant") {
                    lastMsg.cards = data.cards;
                  }
                  return [...u];
                });
              } else if (data.type === "actions" && data.actions) {
                setMessages((prev) => {
                  const u = [...prev];
                  const lastMsg = u[u.length - 1];
                  if (lastMsg?.role === "assistant") {
                    lastMsg.actions = data.actions;
                  }
                  return [...u];
                });
              } else if (data.type === "suggestions" && data.suggestions) {
                setFollowUpSuggestions(data.suggestions);
              } else if (data.type === "error") {
                const errorMsg = data.content || labels?.errorMessage || "Sorry, an error occurred. Please try again.";
                setMessages((prev) => {
                  const u = [...prev];
                  if (u[u.length - 1]?.role === "assistant") {
                    u[u.length - 1] = { role: "assistant", content: errorMsg };
                  } else {
                    u.push({ role: "assistant", content: errorMsg });
                  }
                  return u;
                });
                setIsLoading(false);
              } else if (data.type === "done") {
                if (onChatResponse) {
                  onChatResponse({ reply: assistantMsg, suggestions: void 0, detectedLocale: data.detectedLocale });
                }
                const clean = assistantMsg.replace(/\[CARDS\][\s\S]*?\[\/CARDS\]/gi, "").replace(/\[ACTIONS\][\s\S]*?\[\/ACTIONS\]/gi, "").replace(/\[SUGGESTIONS?:\s*[^\]]+\]\s*$/i, "").replace(/<suggestions?>[\s\S]*?<\/suggestions?>\s*$/i, "").replace(/<suggestions?>[\s\S]*$/i, "").trimEnd();
                if (clean !== assistantMsg) {
                  setMessages((prev) => {
                    const u = [...prev];
                    u[u.length - 1] = { role: "assistant", content: clean };
                    return u;
                  });
                }
              }
            } catch {
            }
          }
        }
        if (idleTimer) clearTimeout(idleTimer);
      } catch {
        const errorMsg = labels?.errorMessage ?? "Sorry, an error occurred. Please try again.";
        setMessages((prev) => {
          if (addedAssistantMsg && prev[prev.length - 1]?.role === "assistant") {
            const u = [...prev];
            u[u.length - 1] = { role: "assistant", content: errorMsg };
            return u;
          }
          return [...prev, { role: "assistant", content: errorMsg }];
        });
      } finally {
        setIsLoading(false);
        if (syncRef.current) {
          queueMicrotask(() => {
            const current = messagesRef.current;
            const lastMsg = current[current.length - 1];
            if (lastMsg) {
              syncRef.current?.broadcast(lastMsg, current, followUpSuggestions);
            }
          });
        }
      }
    },
    [input, isLoading, sessionId, chatApiPath, onMessageCount, labels?.errorMessage, followUpSuggestions]
  );
  sendMessageRef.current = sendMessage;
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }
  function handleToggle() {
    setHasInteracted(true);
    if (widgetState === "collapsed") {
      setWidgetState("expanded");
    } else if (widgetState === "expanded") {
      setWidgetState("collapsed");
    } else {
      setWidgetState("expanded");
      setHasNewMessage(false);
    }
  }
  function handleMinimize() {
    setWidgetState("minimized");
  }
  const t = theme;
  const fabStyle = {
    position: "fixed",
    bottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
    right: 24,
    zIndex: WIDGET_Z_INDEX,
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: t.fab.bg,
    color: t.fab.icon,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    transition: "background 0.2s",
    animation: !hasInteracted ? "chat-fab-glow 2s ease-in-out infinite" : void 0
  };
  const minimizedPreviewStyle = {
    position: "fixed",
    bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
    right: 24,
    zIndex: WIDGET_Z_INDEX,
    maxWidth: 280,
    padding: "10px 14px",
    background: t.minimizedPreview?.bg ?? t.panel.bg,
    color: t.minimizedPreview?.text ?? t.assistantBubble.text,
    border: `1px solid ${t.minimizedPreview?.border ?? t.panel.border}`,
    borderRadius: 12,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
    animation: "chat-slide-up 0.3s ease-out"
  };
  const panelStyle = isMobile ? {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100dvh",
    zIndex: WIDGET_Z_INDEX,
    background: t.panel.bg,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    animation: "chat-slide-up 0.3s ease-out"
  } : {
    position: "fixed",
    bottom: 16,
    right: 16,
    zIndex: WIDGET_Z_INDEX,
    width: t.panel.width,
    maxWidth: "calc(100vw - 2rem)",
    height: t.panel.height,
    maxHeight: "calc(100vh - 6rem)",
    background: t.panel.bg,
    border: `1px solid ${t.panel.border}`,
    borderRadius: 16,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
    animation: "chat-slide-up 0.3s ease-out"
  };
  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: t.header.bg,
    borderBottom: `1px solid ${t.panel.border}`
  };
  const bubbleBase = {
    maxWidth: "80%",
    padding: "8px 12px",
    fontSize: 14,
    lineHeight: 1.5,
    overflowWrap: "break-word",
    wordBreak: "break-word"
  };
  const userBubbleStyle = {
    ...bubbleBase,
    background: t.userBubble.bg,
    color: t.userBubble.text,
    borderRadius: t.userBubble.radius
  };
  const assistantBubbleStyle = {
    ...bubbleBase,
    background: t.assistantBubble.bg,
    color: t.assistantBubble.text,
    border: `1px solid ${t.assistantBubble.border}`,
    borderRadius: t.assistantBubble.radius
  };
  const suggestionStyle = {
    padding: "8px 16px",
    minHeight: 44,
    fontSize: 12,
    borderRadius: 20,
    background: t.suggestion.bg,
    color: t.suggestion.text,
    border: `1px solid ${t.suggestion.border}`,
    cursor: "pointer",
    transition: "background 0.2s, color 0.2s",
    textAlign: "center",
    whiteSpace: "normal",
    wordBreak: "break-word"
  };
  const inputStyle = {
    flex: 1,
    padding: "10px 16px",
    minHeight: 44,
    maxHeight: 300,
    background: t.input.bg,
    border: `1px solid ${t.input.border}`,
    borderRadius: 12,
    fontSize: 16,
    lineHeight: 1.4,
    color: t.input.text,
    outline: "none",
    resize: "none",
    overflow: "auto"
  };
  const sendBtnStyle = {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    cursor: "pointer",
    transition: "background 0.2s"
  };
  const headerBtnStyle = {
    padding: 8,
    borderRadius: 8,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: t.header.text,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s",
    minWidth: 44,
    minHeight: 44
  };
  const defaultIcon = /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "6 2 52 48", fill: "none", style: { width: "62%", height: "62%" }, children: [
    /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: "cbell", x1: "0%", y1: "0%", x2: "0%", y2: "100%", children: [
      /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#C9A66B" }),
      /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#A8864A" })
    ] }) }),
    /* @__PURE__ */ jsx("path", { d: "M32 8C32 8 14 12 14 32L14 40L50 40L50 32C50 12 32 8 32 8Z", fill: "url(#cbell)" }),
    /* @__PURE__ */ jsx("circle", { cx: "32", cy: "8", r: "3.5", fill: "#C9A66B", stroke: "#4A3728", strokeWidth: "1.5" }),
    /* @__PURE__ */ jsx("rect", { x: "10", y: "40", width: "44", height: "6", rx: "3", fill: "#4A3728" }),
    /* @__PURE__ */ jsx("rect", { x: "22", y: "20", width: "22", height: "14", rx: "5", fill: "white", opacity: "0.9" }),
    /* @__PURE__ */ jsx("path", { d: "M30 34L26 38L32 34", fill: "white", opacity: "0.9" })
  ] });
  const assistantIconEl = assistantIcon ?? defaultIcon;
  const fabIconEl = fabIcon ?? /* @__PURE__ */ jsx(MessageSquare, { style: { width: 24, height: 24 } });
  const usePortal = mounted && !disablePortal;
  const wrap = (content) => usePortal ? createPortal(content, document.body) : content;
  if (!mounted) return null;
  if (widgetState !== "expanded") {
    return wrap(
      /* @__PURE__ */ jsxs(Fragment, { children: [
        widgetState === "minimized" && messages.length > 0 && /* @__PURE__ */ jsx(
          "div",
          {
            onClick: handleToggle,
            style: minimizedPreviewStyle,
            role: "button",
            tabIndex: 0,
            onKeyDown: (e) => e.key === "Enter" && handleToggle(),
            children: /* @__PURE__ */ jsx("p", { style: {
              margin: 0,
              fontSize: 13,
              lineHeight: 1.4,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical"
            }, children: messages[messages.length - 1].content })
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: handleToggle,
            style: fabStyle,
            "aria-label": labels?.openChat ?? "Open chat",
            children: [
              fabIconEl,
              hasNewMessage && /* @__PURE__ */ jsx("span", { style: {
                position: "absolute",
                top: 0,
                right: 0,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#ef4444",
                border: "2px solid white"
              } })
            ]
          }
        ),
        /* @__PURE__ */ jsx("style", { children: `
          @keyframes chat-fab-glow {
            0%, 100% { box-shadow: 0 4px 12px rgba(0,0,0,0.15); transform: scale(1); }
            50% { box-shadow: 0 6px 24px rgba(0,0,0,0.3), 0 0 28px rgba(255,255,255,0.12); transform: scale(1.08); }
          }
          @keyframes chat-slide-up {
            from { transform: translateY(12px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        ` })
      ] })
    );
  }
  return wrap(
    /* @__PURE__ */ jsxs("div", { style: panelStyle, children: [
      /* @__PURE__ */ jsxs("div", { style: headerStyle, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              style: {
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `${t.header.text}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              },
              children: assistantIconEl
            }
          ),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { style: { fontWeight: 600, fontSize: 14, color: t.header.text }, children: assistantLabel ?? `${businessName} Assistant` }),
            poweredByLabel && /* @__PURE__ */ jsx("div", { style: { fontSize: 11, color: t.header.subtext }, children: poweredByLabel })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 4 }, children: [
          allowMinimize && /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleMinimize,
              style: headerBtnStyle,
              "aria-label": labels?.minimize ?? "Minimize",
              children: /* @__PURE__ */ jsx(Minus, { style: { width: 18, height: 18 } })
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleToggle,
              style: headerBtnStyle,
              "aria-label": labels?.closeChat ?? "Close",
              children: /* @__PURE__ */ jsx(X, { style: { width: 18, height: 18 } })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs(
        "div",
        {
          ref: messagesContainerRef,
          style: {
            flex: 1,
            overflowY: "auto",
            overscrollBehavior: "contain",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10
          },
          children: [
            canLoadHistory && messages.length > 0 && /* @__PURE__ */ jsx(
              "button",
              {
                onClick: loadEarlierMessages,
                disabled: historyLoading,
                style: {
                  alignSelf: "center",
                  padding: "6px 14px",
                  borderRadius: 16,
                  border: `1px solid ${t.panel.border}`,
                  background: "transparent",
                  color: t.assistantBubble.text,
                  fontSize: 12,
                  cursor: historyLoading ? "default" : "pointer",
                  opacity: historyLoading ? 0.6 : 1,
                  marginBottom: 4
                },
                children: historyLoading ? labels?.loadingHistory ?? "Loading..." : labels?.loadEarlier ?? "Load earlier messages"
              }
            ),
            messages.length === 0 ? /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "24px 16px" }, children: [
              /* @__PURE__ */ jsx(
                "div",
                {
                  style: {
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: `${t.suggestion.bg}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px"
                  },
                  children: /* @__PURE__ */ jsx(MessageSquare, { style: { width: 24, height: 24, color: t.suggestion.text } })
                }
              ),
              /* @__PURE__ */ jsx("p", { style: { fontSize: 14, color: t.assistantBubble.text, marginBottom: 16 }, children: emptyStateMessage ?? `Ask me anything about ${businessName}!` }),
              initialSuggestions.length > 0 && /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }, children: initialSuggestions.map((s) => /* @__PURE__ */ jsx("button", { style: suggestionStyle, onClick: () => sendMessage(s), children: s }, s)) })
            ] }) : messages.map((msg, i) => /* @__PURE__ */ jsxs(
              "div",
              {
                style: {
                  display: "flex",
                  gap: 8,
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start"
                },
                children: [
                  msg.role === "assistant" && /* @__PURE__ */ jsx(
                    "div",
                    {
                      style: {
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: `${t.suggestion.bg}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      },
                      children: assistantIconEl
                    }
                  ),
                  /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }, children: [
                    /* @__PURE__ */ jsx("div", { style: msg.role === "user" ? userBubbleStyle : assistantBubbleStyle, children: msg.role === "user" ? /* @__PURE__ */ jsx("p", { style: { margin: 0, whiteSpace: "pre-wrap" }, children: msg.content }) : /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(
                      ReactMarkdown,
                      {
                        components: {
                          p: ({ children }) => /* @__PURE__ */ jsx("p", { style: { margin: "6px 0" }, children }),
                          ul: ({ children }) => /* @__PURE__ */ jsx("ul", { style: { margin: "6px 0", paddingLeft: 20, listStyleType: "disc" }, children }),
                          ol: ({ children }) => /* @__PURE__ */ jsx("ol", { style: { margin: "6px 0", paddingLeft: 20, listStyleType: "decimal" }, children }),
                          li: ({ children }) => /* @__PURE__ */ jsx("li", { style: { margin: "3px 0", display: "list-item" }, children }),
                          strong: ({ children }) => /* @__PURE__ */ jsx("strong", { style: { fontWeight: 600 }, children }),
                          a: ({ href, children }) => {
                            let safe = false;
                            if (href) {
                              try {
                                const proto = new URL(href, "https://placeholder.invalid").protocol;
                                safe = proto === "http:" || proto === "https:" || proto === "mailto:";
                              } catch {
                                safe = false;
                              }
                            }
                            if (!safe) {
                              return /* @__PURE__ */ jsx("span", { children });
                            }
                            return /* @__PURE__ */ jsx(
                              "a",
                              {
                                href,
                                style: { color: t.linkColor, textDecoration: "none" },
                                target: "_blank",
                                rel: "noopener noreferrer",
                                onClick: () => {
                                  onAnalyticsEvent?.({
                                    eventType: "interaction.link_clicked",
                                    metadata: { url: href, linkText: typeof children === "string" ? children : void 0 }
                                  });
                                },
                                children
                              }
                            );
                          }
                        },
                        children: msg.content
                      }
                    ) }) }),
                    msg.cards && msg.cards.length > 0 && /* @__PURE__ */ jsx(
                      CardList,
                      {
                        cards: msg.cards,
                        theme: mergedCardTheme,
                        config: mergedCardConfig,
                        onCardClick: handleCardClick,
                        imageErrorLabel: labels?.imageUnavailable,
                        onCardVisible: onAnalyticsEvent ? (card) => onAnalyticsEvent({
                          eventType: "entity.card_visible",
                          entityType: card.type,
                          entityId: card.id,
                          entityName: card.title
                        }) : void 0,
                        onCardDwell: onAnalyticsEvent ? (card, dwellMs) => onAnalyticsEvent({
                          eventType: "entity.card_dwell",
                          entityType: card.type,
                          entityId: card.id,
                          entityName: card.title,
                          metadata: { dwellMs }
                        }) : void 0
                      }
                    ),
                    msg.actions && msg.actions.length > 0 && /* @__PURE__ */ jsx(
                      ActionPills,
                      {
                        actions: msg.actions,
                        theme: mergedCardTheme.action,
                        onAction: handleAction
                      }
                    )
                  ] }),
                  msg.role === "user" && /* @__PURE__ */ jsx(
                    "div",
                    {
                      style: {
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: t.input.bg,
                        border: `1px solid ${t.input.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      },
                      children: /* @__PURE__ */ jsx(User, { style: { width: 14, height: 14, color: t.assistantBubble.text } })
                    }
                  )
                ]
              },
              i
            )),
            isLoading && messages[messages.length - 1]?.role === "user" && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, justifyContent: "flex-start" }, children: [
              /* @__PURE__ */ jsx(
                "div",
                {
                  style: {
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: `${t.suggestion.bg}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  },
                  children: assistantIconEl
                }
              ),
              /* @__PURE__ */ jsx("div", { style: { ...assistantBubbleStyle, padding: "10px 12px" }, children: /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 4, alignItems: "center" }, children: [0, 150, 300].map((delay) => /* @__PURE__ */ jsx(
                "span",
                {
                  style: {
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: t.typingDot,
                    animation: "chat-pulse 1.4s ease-in-out infinite",
                    animationDelay: `${delay}ms`
                  }
                },
                delay
              )) }) })
            ] }),
            followUpSuggestions.length > 0 && !isLoading && messages.length > 0 && /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, marginTop: 8 }, children: followUpSuggestions.map((s, idx) => /* @__PURE__ */ jsx("button", { style: suggestionStyle, onClick: () => {
              onAnalyticsEvent?.({
                eventType: "interaction.suggestion_clicked",
                metadata: { suggestionText: s, suggestionIndex: idx }
              });
              sendMessage(s);
            }, children: s }, s)) }),
            /* @__PURE__ */ jsx("div", { ref: messagesEndRef })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        "div",
        {
          style: {
            padding: "12px 16px max(20px, env(safe-area-inset-bottom)) 16px",
            borderTop: `1px solid ${t.panel.border}`,
            display: "flex",
            gap: 10,
            alignItems: "flex-end",
            ...inputBarStyle
          },
          children: [
            voiceSupported && voiceEnabled && /* @__PURE__ */ jsx(
              "button",
              {
                onClick: isRecording ? stopRecording : startRecording,
                disabled: isLoading || isTranscribing,
                style: {
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  cursor: isLoading || isTranscribing ? "not-allowed" : "pointer",
                  background: isRecording ? "#ef4444" : t.input.bg,
                  color: isRecording ? "#fff" : t.assistantBubble.text,
                  transition: "background 0.2s",
                  opacity: isLoading || isTranscribing ? 0.4 : 1
                },
                "aria-label": isRecording ? labels?.stopRecording ?? "Stop listening" : labels?.voiceInput ?? "Voice input",
                children: isTranscribing ? /* @__PURE__ */ jsx(Loader2, { style: { width: 18, height: 18, animation: "chat-spin 1s linear infinite" } }) : isRecording ? /* @__PURE__ */ jsx(Square, { style: { width: 14, height: 14 } }) : /* @__PURE__ */ jsx(Mic, { style: { width: 18, height: 18 } })
              }
            ),
            isRecording ? /* @__PURE__ */ jsxs("div", { style: { ...inputStyle, display: "flex", alignItems: "center", gap: 10, border: `1px solid #ef4444`, opacity: 0.9 }, children: [
              /* @__PURE__ */ jsx("div", { style: { display: "flex", alignItems: "center", gap: 3, height: 20 }, children: audioLevels.map((level, i) => /* @__PURE__ */ jsx(
                "div",
                {
                  style: {
                    width: 3,
                    borderRadius: 9999,
                    backgroundColor: "#ef4444",
                    transition: "height 75ms ease",
                    height: `${4 + level * 16}px`
                  }
                },
                i
              )) }),
              /* @__PURE__ */ jsx("span", { style: { fontSize: 14, color: t.input.placeholder }, children: labels?.recordingPlaceholder?.replace("${seconds}", String(recordingDuration)) ?? `Listening... ${recordingDuration}s` })
            ] }) : isTranscribing ? /* @__PURE__ */ jsxs("div", { style: { ...inputStyle, display: "flex", alignItems: "center", gap: 10, overflow: "hidden", position: "relative" }, children: [
              /* @__PURE__ */ jsx("div", { style: {
                position: "absolute",
                inset: 0,
                background: `linear-gradient(90deg, transparent, ${t.sendButton.bg}15, transparent)`,
                animation: "chat-shimmer-slide 1.5s ease-in-out infinite"
              } }),
              /* @__PURE__ */ jsx(Loader2, { style: { width: 16, height: 16, animation: "chat-spin 1s linear infinite", color: t.sendButton.bg, flexShrink: 0 } }),
              /* @__PURE__ */ jsx("span", { style: { fontSize: 14, color: t.input.placeholder }, children: labels?.transcribing ?? "Transcribing..." })
            ] }) : /* @__PURE__ */ jsx(
              "textarea",
              {
                ref: inputRef,
                value: input,
                onChange: (e) => {
                  setInput(e.target.value);
                  const el = e.target;
                  el.style.height = "auto";
                  const maxH = Math.min(window.innerHeight * 0.4, 300);
                  el.style.height = Math.min(el.scrollHeight, maxH) + "px";
                },
                onKeyDown: handleKeyDown,
                placeholder: labels?.typePlaceholder ?? "Type a message...",
                disabled: isLoading,
                rows: 1,
                style: inputStyle
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => sendMessage(),
                disabled: !input.trim() || isLoading || isRecording,
                style: {
                  ...sendBtnStyle,
                  background: input.trim() && !isLoading && !isRecording ? t.sendButton.bg : t.sendButton.disabledBg,
                  color: input.trim() && !isLoading && !isRecording ? t.sendButton.text : t.sendButton.disabledText,
                  cursor: input.trim() && !isLoading && !isRecording ? "pointer" : "not-allowed"
                },
                "aria-label": labels?.sendMessage ?? "Send message",
                children: isLoading ? /* @__PURE__ */ jsx(Loader2, { style: { width: 18, height: 18, animation: "chat-spin 1s linear infinite" } }) : /* @__PURE__ */ jsx(Send, { style: { width: 18, height: 18 } })
              }
            )
          ]
        }
      ),
      poweredByFooter !== false && /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "4px 16px 6px" }, children: /* @__PURE__ */ jsx(
        "a",
        {
          href: poweredByFooter.url,
          target: "_blank",
          rel: "noopener noreferrer",
          style: { fontSize: 11, color: t.assistantBubble.text, opacity: 0.5, textDecoration: "underline", cursor: "pointer", touchAction: "manipulation" },
          onMouseEnter: (e) => {
            e.currentTarget.style.opacity = "0.8";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.opacity = "0.5";
          },
          children: poweredByFooter.label
        }
      ) }),
      /* @__PURE__ */ jsx("style", { children: `
        @keyframes chat-pulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }
        @keyframes chat-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes chat-shimmer-slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes chat-slide-up { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes chat-fab-glow {
          0%, 100% { box-shadow: 0 4px 12px rgba(0,0,0,0.15); transform: scale(1); }
          50% { box-shadow: 0 6px 24px rgba(0,0,0,0.3), 0 0 28px rgba(255,255,255,0.12); transform: scale(1.08); }
        }
      ` })
    ] })
  );
}
export {
  ChatWidget
};
//# sourceMappingURL=index.js.map