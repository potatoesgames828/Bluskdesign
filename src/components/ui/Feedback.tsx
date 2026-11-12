"use client";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
interface Toast { id: number; kind: ToastKind; message: string }
interface ConfirmOpts { title: string; description?: string; confirmLabel?: string; danger?: boolean }

const Ctx = createContext<{
  toast: (message: string, kind?: ToastKind) => void;
  confirm: (o: ConfirmOpts) => Promise<boolean>;
} | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOpts | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const seq = useRef(0);

  const toast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const confirm = useCallback((o: ConfirmOpts) => {
    setConfirmState(o);
    return new Promise<boolean>((res) => { resolver.current = res; });
  }, []);

  const close = (v: boolean) => { resolver.current?.(v); resolver.current = null; setConfirmState(null); };

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((t) => {
          const Icon = t.kind === "success" ? CheckCircle2 : t.kind === "error" ? AlertTriangle : Info;
          return (
            <div key={t.id} className={cn("pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface p-3.5 text-sm shadow-2xl animate-fade-up",
              t.kind === "success" ? "border-success/30" : t.kind === "error" ? "border-danger/40" : "border-brand/30")}>
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", t.kind === "success" ? "text-success" : t.kind === "error" ? "text-danger" : "text-brand-light")} />
              <p className="flex-1">{t.message}</p>
              <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-muted hover:text-fg" aria-label="Fechar"><X className="h-3.5 w-3.5" /></button>
            </div>
          );
        })}
      </div>
      <Modal open={!!confirmState} onClose={() => close(false)} title={confirmState?.title ?? ""} description={confirmState?.description} size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => close(false)}>Cancelar</Button>
          <Button variant={confirmState?.danger ? "danger" : "primary"} onClick={() => close(true)}>{confirmState?.confirmLabel ?? "Confirmar"}</Button>
        </>}>
        <p className="text-sm text-muted">{confirmState?.danger ? "Esta ação não poderá ser desfeita." : "Deseja continuar?"}</p>
      </Modal>
    </Ctx.Provider>
  );
}

export function useFeedback() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFeedback fora do FeedbackProvider");
  return c;
}
