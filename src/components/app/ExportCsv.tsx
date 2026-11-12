"use client";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ExportCsv({ rows, filename }: { rows: Record<string, string>[]; filename: string }) {
  function run() {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers.join(";"), ...rows.map((r) => headers.map((h) => esc(r[h])).join(";"))].join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  }
  return <Button variant="secondary" onClick={run} disabled={!rows.length}><Download className="h-4 w-4" />Exportar CSV</Button>;
}
