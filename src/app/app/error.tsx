"use client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-danger" />
      <h2 className="mt-4 text-lg font-semibold">Algo deu errado</h2>
      <p className="mt-1 text-sm text-muted">{error.message || "Erro inesperado ao carregar esta página."}</p>
      <Button className="mt-5" onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
