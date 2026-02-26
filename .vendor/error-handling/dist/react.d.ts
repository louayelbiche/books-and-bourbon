import * as react_jsx_runtime from 'react/jsx-runtime';
import React, { Component, ReactNode, ErrorInfo } from 'react';

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
declare class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps);
    static getDerivedStateFromError(error: Error): ErrorBoundaryState;
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void;
    reset: () => void;
    render(): ReactNode;
}
/**
 * HOC to wrap a component with an error boundary.
 */
declare function withErrorBoundary<P extends object>(WrappedComponent: React.ComponentType<P>, errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">): React.FC<P>;
/**
 * Simple error fallback for less critical sections.
 */
declare function SimpleErrorFallback({ message, }: {
    message?: string;
}): React.ReactElement;
/**
 * Full-page error fallback.
 */
declare function FullPageErrorFallback({ error, onReset, }: {
    error?: Error;
    onReset?: () => void;
}): React.ReactElement;
type ToastType = "success" | "error" | "warning" | "info";
interface Toast {
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
interface ToastProviderProps {
    children: ReactNode;
    maxToasts?: number;
}
declare function ToastProvider({ children, maxToasts, }: ToastProviderProps): react_jsx_runtime.JSX.Element;
declare function useToast(): ToastContextValue;

export { ErrorBoundary, FullPageErrorFallback, SimpleErrorFallback, type Toast, ToastProvider, type ToastType, useToast, withErrorBoundary };
