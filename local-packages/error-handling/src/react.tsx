/**
 * @runwell/error-handling — React Components
 *
 * ErrorBoundary, toast provider, and fallback UIs.
 * Zero icon dependencies — uses inline SVGs instead of lucide-react.
 * Logger via onError prop (not hardcoded).
 */

"use client";

import React, {
  Component,
  ErrorInfo,
  ReactNode,
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";
import { isAppError } from "./index.js";

// ---------------------------------------------------------------------------
// Inline SVG Icons (replacing lucide-react dependency)
// ---------------------------------------------------------------------------

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Error Boundary
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  correlationId?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === "function") {
          return this.props.fallback(this.state.error, this.reset);
        }
        return this.props.fallback;
      }

      return (
        <DefaultErrorFallback error={this.state.error} onReset={this.reset} />
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap a component with an error boundary.
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
): React.FC<P> {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";

  const ComponentWithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

/**
 * Default error fallback component.
 */
function DefaultErrorFallback({
  error,
  onReset,
}: {
  error: Error;
  onReset: () => void;
}): React.ReactElement {
  const isOperational = isAppError(error) && error.isOperational;
  const errorCode = isAppError(error) ? error.code : "ERR-SYS-001";

  return (
    <div style={{ minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ maxWidth: 448, width: "100%", background: "var(--color-surface-container, #f5f5f5)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", padding: 24, textAlign: "center" }}>
        <div style={{ color: "var(--color-error, #dc2626)", fontSize: 36, marginBottom: 16 }}>!</div>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          Something went wrong
        </h2>
        <p style={{ color: "var(--color-on-surface-variant, #666)", marginBottom: 16 }}>
          {isOperational
            ? error.message
            : "An unexpected error occurred. Please try again."}
        </p>
        <p style={{ fontSize: 12, color: "var(--color-on-surface-variant, #999)", marginBottom: 16 }}>
          Error code: {errorCode}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={onReset}
            style={{
              padding: "8px 16px",
              background: "var(--color-primary, #2563eb)",
              color: "var(--color-on-primary, #fff)",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 16px",
              background: "var(--color-surface-container-high, #e5e5e5)",
              color: "var(--color-on-surface, #333)",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Simple error fallback for less critical sections.
 */
export function SimpleErrorFallback({
  message = "Failed to load this section",
}: {
  message?: string;
}): React.ReactElement {
  return (
    <div style={{ padding: 16, background: "var(--color-error-container, #fef2f2)", borderRadius: 6 }}>
      <p style={{ fontSize: 14, color: "var(--color-on-error-container, #991b1b)" }}>
        {message}
      </p>
    </div>
  );
}

/**
 * Full-page error fallback.
 */
export function FullPageErrorFallback({
  error,
  onReset,
}: {
  error?: Error;
  onReset?: () => void;
}): React.ReactElement {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background, #fff)" }}>
      <div style={{ maxWidth: 512, width: "100%", margin: "0 16px" }}>
        <div style={{ background: "var(--color-surface-container, #f5f5f5)", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", padding: 32, textAlign: "center" }}>
          <div style={{ color: "var(--color-error, #dc2626)", fontSize: 48, marginBottom: 24 }}>X</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            Application Error
          </h1>
          <p style={{ color: "var(--color-on-surface-variant, #666)", marginBottom: 24 }}>
            We encountered an unexpected error. Our team has been notified.
          </p>
          {error && (
            <details style={{ marginBottom: 24, textAlign: "left" }}>
              <summary style={{ cursor: "pointer", fontSize: 14, color: "var(--color-on-surface-variant, #666)" }}>
                Technical Details
              </summary>
              <pre style={{ marginTop: 8, padding: 12, background: "var(--color-surface-container-high, #e5e5e5)", borderRadius: 4, fontSize: 12, overflow: "auto", maxHeight: 128 }}>
                {error.message}
              </pre>
            </details>
          )}
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            {onReset && (
              <button
                onClick={onReset}
                style={{
                  padding: "12px 24px",
                  background: "var(--color-primary, #2563eb)",
                  color: "var(--color-on-primary, #fff)",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Try Again
              </button>
            )}
            <button
              onClick={() => (window.location.href = "/")}
              style={{
                padding: "12px 24px",
                background: "var(--color-surface-container-high, #e5e5e5)",
                color: "var(--color-on-surface, #333)",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast Provider
// ---------------------------------------------------------------------------

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (toast: Omit<Toast, "id">) => string;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const DEFAULT_DURATION = 5000;
const ERROR_DURATION = 8000;

function generateToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

export function ToastProvider({
  children,
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const toastFn = useCallback(
    (newToast: Omit<Toast, "id">): string => {
      const id = generateToastId();
      const duration =
        newToast.duration ??
        (newToast.type === "error" ? ERROR_DURATION : DEFAULT_DURATION);

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
    (message: string, title?: string): string => {
      return toastFn({ type: "success", message, title });
    },
    [toastFn]
  );

  const errorFn = useCallback(
    (message: string, title?: string): string => {
      return toastFn({ type: "error", message, title });
    },
    [toastFn]
  );

  const warning = useCallback(
    (message: string, title?: string): string => {
      return toastFn({ type: "warning", message, title });
    },
    [toastFn]
  );

  const info = useCallback(
    (message: string, title?: string): string => {
      return toastFn({ type: "info", message, title });
    },
    [toastFn]
  );

  const value: ToastContextValue = {
    toasts,
    toast: toastFn,
    success,
    error: errorFn,
    warning,
    info,
    dismiss,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// ---------------------------------------------------------------------------
// Toast UI (inline styles, zero Tailwind dependency)
// ---------------------------------------------------------------------------

const TOAST_COLORS: Record<ToastType, string> = {
  success: "var(--color-success, #16a34a)",
  error: "var(--color-error, #dc2626)",
  warning: "var(--color-warning, #d97706)",
  info: "var(--color-primary, #2563eb)",
};

const TOAST_ICONS: Record<ToastType, React.FC<{ className?: string }>> = {
  success: CheckCircleIcon,
  error: AlertCircleIcon,
  warning: AlertTriangleIcon,
  info: InfoIcon,
};

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast: t,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const Icon = TOAST_ICONS[t.type];

  return (
    <div
      style={{
        background: TOAST_COLORS[t.type],
        color: "#fff",
        padding: "12px 16px",
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        minWidth: 300,
        maxWidth: 400,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
      role="alert"
    >
      <Icon className="" />
      <div style={{ flex: 1 }}>
        {t.title && (
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.title}</div>
        )}
        <div style={{ fontSize: 14 }}>{t.message}</div>
        {t.action && (
          <button
            onClick={t.action.onClick}
            style={{
              marginTop: 8,
              fontSize: 14,
              textDecoration: "underline",
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {t.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onDismiss(t.id)}
        style={{
          color: "rgba(255,255,255,0.8)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        <XIcon />
      </button>
    </div>
  );
}
