"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastVariant = "success" | "error" | "info" | "warning";

type ToastLabels = Record<ToastVariant, string> & {
  close: string;
};

type Toast = {
  id: number;
  message: string;
  title?: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  labels: ToastLabels;
  notify: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({
  children,
  labels,
}: {
  children: ReactNode;
  labels: ToastLabels;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextIdRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = nextIdRef.current + 1;
      nextIdRef.current = id;

      setToasts((current) => [...current, { ...toast, id }].slice(-4));
      window.setTimeout(() => dismiss(id), 5200);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      labels,
      notify,
    }),
    [labels, notify],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex w-[min(calc(100vw-2rem),24rem)] flex-col gap-2 sm:bottom-6 sm:right-6"
      >
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            labels={labels}
            onDismiss={() => dismiss(toast.id)}
            toast={toast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    return {
      labels: fallbackLabels,
      notify: () => undefined,
    };
  }

  return context;
}

export function ActionToast({
  message,
  success,
}: {
  message?: string | null;
  success?: boolean;
}) {
  const { labels, notify } = useToast();
  const lastToastRef = useRef("");

  useEffect(() => {
    if (!message) {
      return;
    }

    const variant = success ? "success" : "error";
    const toastKey = `${variant}:${message}`;

    if (lastToastRef.current === toastKey) {
      return;
    }

    lastToastRef.current = toastKey;
    notify({
      message,
      title: labels[variant],
      variant,
    });
  }, [labels, message, notify, success]);

  return null;
}

function ToastCard({
  labels,
  onDismiss,
  toast,
}: {
  labels: ToastLabels;
  onDismiss: () => void;
  toast: Toast;
}) {
  const role =
    toast.variant === "error" || toast.variant === "warning"
      ? "alert"
      : "status";

  return (
    <div
      className={`rounded-xl border p-4 shadow-lg backdrop-blur ${toastStyles[toast.variant]}`}
      role={role}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{toast.title ?? labels[toast.variant]}</p>
          <p className="mt-1 text-sm leading-6">{toast.message}</p>
        </div>
        <button
          aria-label={labels.close}
          className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-lg leading-none transition hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] dark:hover:bg-white/10"
          onClick={onDismiss}
          type="button"
        >
          x
        </button>
      </div>
    </div>
  );
}

const toastStyles: Record<ToastVariant, string> = {
  error:
    "border-red-200 bg-red-50/95 text-red-950 dark:border-red-900/50 dark:bg-red-950/90 dark:text-red-100",
  info:
    "border-[color:var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--foreground)] dark:bg-slate-900/95",
  success:
    "border-emerald-200 bg-emerald-50/95 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/80 dark:text-emerald-100",
  warning:
    "border-amber-200 bg-amber-50/95 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/80 dark:text-amber-100",
};

const fallbackLabels: ToastLabels = {
  close: "Close",
  error: "Error",
  info: "Info",
  success: "Success",
  warning: "Warning",
};
