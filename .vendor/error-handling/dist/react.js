"use client";
import {
  isAppError
} from "./chunk-RC7HLAPX.js";

// src/react.tsx
import {
  Component,
  createContext,
  useContext,
  useState,
  useCallback
} from "react";
import { jsx, jsxs } from "react/jsx-runtime";
function CheckCircleIcon({ className }) {
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      className,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      children: [
        /* @__PURE__ */ jsx("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }),
        /* @__PURE__ */ jsx("polyline", { points: "22 4 12 14.01 9 11.01" })
      ]
    }
  );
}
function AlertCircleIcon({ className }) {
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      className,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      children: [
        /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "10" }),
        /* @__PURE__ */ jsx("line", { x1: "12", y1: "8", x2: "12", y2: "12" }),
        /* @__PURE__ */ jsx("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })
      ]
    }
  );
}
function AlertTriangleIcon({ className }) {
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      className,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      children: [
        /* @__PURE__ */ jsx("path", { d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" }),
        /* @__PURE__ */ jsx("line", { x1: "12", y1: "9", x2: "12", y2: "13" }),
        /* @__PURE__ */ jsx("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })
      ]
    }
  );
}
function InfoIcon({ className }) {
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      className,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      children: [
        /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "10" }),
        /* @__PURE__ */ jsx("line", { x1: "12", y1: "16", x2: "12", y2: "12" }),
        /* @__PURE__ */ jsx("line", { x1: "12", y1: "8", x2: "12.01", y2: "8" })
      ]
    }
  );
}
function XIcon({ className }) {
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      className,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      children: [
        /* @__PURE__ */ jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
        /* @__PURE__ */ jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
      ]
    }
  );
}
var ErrorBoundary = class extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.props.onError?.(error, errorInfo);
  }
  reset = () => {
    this.setState({ hasError: false, error: null });
  };
  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === "function") {
          return this.props.fallback(this.state.error, this.reset);
        }
        return this.props.fallback;
      }
      return /* @__PURE__ */ jsx(DefaultErrorFallback, { error: this.state.error, onReset: this.reset });
    }
    return this.props.children;
  }
};
function withErrorBoundary(WrappedComponent, errorBoundaryProps) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || "Component";
  const ComponentWithErrorBoundary = (props) => /* @__PURE__ */ jsx(ErrorBoundary, { ...errorBoundaryProps, children: /* @__PURE__ */ jsx(WrappedComponent, { ...props }) });
  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  return ComponentWithErrorBoundary;
}
function DefaultErrorFallback({
  error,
  onReset
}) {
  const isOperational = isAppError(error) && error.isOperational;
  const errorCode = isAppError(error) ? error.code : "ERR-SYS-001";
  return /* @__PURE__ */ jsx("div", { style: { minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }, children: /* @__PURE__ */ jsxs("div", { style: { maxWidth: 448, width: "100%", background: "var(--color-surface-container, #f5f5f5)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", padding: 24, textAlign: "center" }, children: [
    /* @__PURE__ */ jsx("div", { style: { color: "var(--color-error, #dc2626)", fontSize: 36, marginBottom: 16 }, children: "!" }),
    /* @__PURE__ */ jsx("h2", { style: { fontSize: 20, fontWeight: 600, marginBottom: 8 }, children: "Something went wrong" }),
    /* @__PURE__ */ jsx("p", { style: { color: "var(--color-on-surface-variant, #666)", marginBottom: 16 }, children: isOperational ? error.message : "An unexpected error occurred. Please try again." }),
    /* @__PURE__ */ jsxs("p", { style: { fontSize: 12, color: "var(--color-on-surface-variant, #999)", marginBottom: 16 }, children: [
      "Error code: ",
      errorCode
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 12, justifyContent: "center" }, children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: onReset,
          style: {
            padding: "8px 16px",
            background: "var(--color-primary, #2563eb)",
            color: "var(--color-on-primary, #fff)",
            border: "none",
            borderRadius: 6,
            cursor: "pointer"
          },
          children: "Try Again"
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => window.location.reload(),
          style: {
            padding: "8px 16px",
            background: "var(--color-surface-container-high, #e5e5e5)",
            color: "var(--color-on-surface, #333)",
            border: "none",
            borderRadius: 6,
            cursor: "pointer"
          },
          children: "Reload Page"
        }
      )
    ] })
  ] }) });
}
function SimpleErrorFallback({
  message = "Failed to load this section"
}) {
  return /* @__PURE__ */ jsx("div", { style: { padding: 16, background: "var(--color-error-container, #fef2f2)", borderRadius: 6 }, children: /* @__PURE__ */ jsx("p", { style: { fontSize: 14, color: "var(--color-on-error-container, #991b1b)" }, children: message }) });
}
function FullPageErrorFallback({
  error,
  onReset
}) {
  return /* @__PURE__ */ jsx("div", { style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background, #fff)" }, children: /* @__PURE__ */ jsx("div", { style: { maxWidth: 512, width: "100%", margin: "0 16px" }, children: /* @__PURE__ */ jsxs("div", { style: { background: "var(--color-surface-container, #f5f5f5)", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", padding: 32, textAlign: "center" }, children: [
    /* @__PURE__ */ jsx("div", { style: { color: "var(--color-error, #dc2626)", fontSize: 48, marginBottom: 24 }, children: "X" }),
    /* @__PURE__ */ jsx("h1", { style: { fontSize: 24, fontWeight: 700, marginBottom: 8 }, children: "Application Error" }),
    /* @__PURE__ */ jsx("p", { style: { color: "var(--color-on-surface-variant, #666)", marginBottom: 24 }, children: "We encountered an unexpected error. Our team has been notified." }),
    error && /* @__PURE__ */ jsxs("details", { style: { marginBottom: 24, textAlign: "left" }, children: [
      /* @__PURE__ */ jsx("summary", { style: { cursor: "pointer", fontSize: 14, color: "var(--color-on-surface-variant, #666)" }, children: "Technical Details" }),
      /* @__PURE__ */ jsx("pre", { style: { marginTop: 8, padding: 12, background: "var(--color-surface-container-high, #e5e5e5)", borderRadius: 4, fontSize: 12, overflow: "auto", maxHeight: 128 }, children: error.message })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 16, justifyContent: "center" }, children: [
      onReset && /* @__PURE__ */ jsx(
        "button",
        {
          onClick: onReset,
          style: {
            padding: "12px 24px",
            background: "var(--color-primary, #2563eb)",
            color: "var(--color-on-primary, #fff)",
            border: "none",
            borderRadius: 8,
            cursor: "pointer"
          },
          children: "Try Again"
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => window.location.href = "/",
          style: {
            padding: "12px 24px",
            background: "var(--color-surface-container-high, #e5e5e5)",
            color: "var(--color-on-surface, #333)",
            border: "none",
            borderRadius: 8,
            cursor: "pointer"
          },
          children: "Go Home"
        }
      )
    ] })
  ] }) }) });
}
var DEFAULT_DURATION = 5e3;
var ERROR_DURATION = 8e3;
function generateToastId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
var ToastContext = createContext(void 0);
function ToastProvider({
  children,
  maxToasts = 5
}) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);
  const toastFn = useCallback(
    (newToast) => {
      const id = generateToastId();
      const duration = newToast.duration ?? (newToast.type === "error" ? ERROR_DURATION : DEFAULT_DURATION);
      setToasts((prev) => {
        const updated = [...prev, { ...newToast, id }];
        return updated.slice(-maxToasts);
      });
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [maxToasts, dismiss]
  );
  const success = useCallback(
    (message, title) => {
      return toastFn({ type: "success", message, title });
    },
    [toastFn]
  );
  const errorFn = useCallback(
    (message, title) => {
      return toastFn({ type: "error", message, title });
    },
    [toastFn]
  );
  const warning = useCallback(
    (message, title) => {
      return toastFn({ type: "warning", message, title });
    },
    [toastFn]
  );
  const info = useCallback(
    (message, title) => {
      return toastFn({ type: "info", message, title });
    },
    [toastFn]
  );
  const value = {
    toasts,
    toast: toastFn,
    success,
    error: errorFn,
    warning,
    info,
    dismiss,
    dismissAll
  };
  return /* @__PURE__ */ jsxs(ToastContext.Provider, { value, children: [
    children,
    /* @__PURE__ */ jsx(ToastContainer, { toasts, onDismiss: dismiss })
  ] });
}
function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
var TOAST_COLORS = {
  success: "var(--color-success, #16a34a)",
  error: "var(--color-error, #dc2626)",
  warning: "var(--color-warning, #d97706)",
  info: "var(--color-primary, #2563eb)"
};
var TOAST_ICONS = {
  success: CheckCircleIcon,
  error: AlertCircleIcon,
  warning: AlertTriangleIcon,
  info: InfoIcon
};
function ToastContainer({
  toasts,
  onDismiss
}) {
  if (toasts.length === 0) return null;
  return /* @__PURE__ */ jsx(
    "div",
    {
      style: {
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: 8
      },
      role: "region",
      "aria-label": "Notifications",
      children: toasts.map((t) => /* @__PURE__ */ jsx(ToastItem, { toast: t, onDismiss }, t.id))
    }
  );
}
function ToastItem({
  toast: t,
  onDismiss
}) {
  const Icon = TOAST_ICONS[t.type];
  return /* @__PURE__ */ jsxs(
    "div",
    {
      style: {
        background: TOAST_COLORS[t.type],
        color: "#fff",
        padding: "12px 16px",
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        minWidth: 300,
        maxWidth: 400,
        display: "flex",
        alignItems: "flex-start",
        gap: 12
      },
      role: "alert",
      children: [
        /* @__PURE__ */ jsx(Icon, { className: "" }),
        /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
          t.title && /* @__PURE__ */ jsx("div", { style: { fontWeight: 600, marginBottom: 4 }, children: t.title }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: 14 }, children: t.message }),
          t.action && /* @__PURE__ */ jsx(
            "button",
            {
              onClick: t.action.onClick,
              style: {
                marginTop: 8,
                fontSize: 14,
                textDecoration: "underline",
                background: "none",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                padding: 0
              },
              children: t.action.label
            }
          )
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => onDismiss(t.id),
            style: {
              color: "rgba(255,255,255,0.8)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              flexShrink: 0
            },
            "aria-label": "Dismiss",
            children: /* @__PURE__ */ jsx(XIcon, {})
          }
        )
      ]
    }
  );
}
export {
  ErrorBoundary,
  FullPageErrorFallback,
  SimpleErrorFallback,
  ToastProvider,
  useToast,
  withErrorBoundary
};
//# sourceMappingURL=react.js.map