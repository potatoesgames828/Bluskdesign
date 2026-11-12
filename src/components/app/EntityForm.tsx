"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ENTITIES, defaultsFor, validate, type EntityDef, type EntityKey, type FieldDef } from "@/lib/entities";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useFeedback } from "@/components/ui/Feedback";
import { errorMessage, cn } from "@/lib/utils";

function toInputValue(f: FieldDef, v: unknown) {
  if (v === null || v === undefined) return f.type === "checkbox" ? false : "";
  if (f.type === "datetime" && typeof v === "string" && v) {
    const d = new Date(v);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return v;
}

function RelationSelect({ f, value, onChange }: { f: FieldDef; value: string; onChange: (v: string) => void }) {
  const [opts, setOpts] = useState<{ id: string; label: string }[] | null>(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.from(f.relation!.table).select(`id, ${f.relation!.labelColumn}`).order(f.relation!.labelColumn).limit(500)
      .then(({ data }: { data: Record<string, string>[] | null }) =>
        setOpts((data ?? []).map((r) => ({ id: r.id, label: r[f.relation!.labelColumn] }))));
  }, [f.relation]);
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={!opts}>
      <option value="">{opts ? "— Nenhum —" : "Carregando…"}</option>
      {opts?.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </Select>
  );
}

export function FormFields({ def, values, setValues, errors }: {
  def: EntityDef; values: Record<string, unknown>; setValues: (fn: (v: Record<string, unknown>) => Record<string, unknown>) => void; errors: Record<string, string>;
}) {
  const set = (name: string, v: unknown) => setValues((p) => ({ ...p, [name]: v }));
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {def.fields.map((f) => {
        const v = toInputValue(f, values[f.name]);
        const id = `f-${f.name}`;
        let control: React.ReactNode;
        switch (f.type) {
          case "textarea": control = <Textarea id={id} value={String(v)} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} />; break;
          case "select": control = (
            <Select id={id} value={String(v)} onChange={(e) => set(f.name, e.target.value)}>
              {!f.required && !f.defaultValue && <option value="">— Selecione —</option>}
              {f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>); break;
          case "relation": control = <RelationSelect f={f} value={String(v)} onChange={(x) => set(f.name, x)} />; break;
          case "checkbox": control = (
            <label className="flex h-[42px] cursor-pointer items-center gap-2.5 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[#3478F6]" checked={Boolean(v)} onChange={(e) => set(f.name, e.target.checked)} />
              {f.label}
            </label>); break;
          default: control = (
            <>
              <Input id={id} list={f.datalist ? `${id}-list` : undefined}
                type={f.type === "money" || f.type === "number" ? "text" : f.type === "datetime" ? "datetime-local" : f.type === "tel" ? "tel" : f.type === "email" ? "email" : f.type === "date" ? "date" : "text"}
                inputMode={f.type === "money" || f.type === "number" ? "decimal" : undefined}
                value={String(v)} placeholder={f.placeholder ?? (f.type === "money" ? "0,00" : undefined)}
                onChange={(e) => set(f.name, e.target.value)} />
              {f.datalist && <datalist id={`${id}-list`}>{f.datalist.map((d) => <option key={d} value={d} />)}</datalist>}
            </>);
        }
        return (
          <Field key={f.name} label={f.type === "checkbox" ? undefined : `${f.label}${f.required ? " *" : ""}`} error={errors[f.name]} hint={f.hint}
            className={cn(f.full && "sm:col-span-2")}>
            {control}
          </Field>
        );
      })}
    </div>
  );
}

export function EntityFormModal({ entity, open, onClose, initial, onSaved, extra }: {
  entity: EntityKey; open: boolean; onClose: () => void; initial?: Record<string, unknown> | null;
  onSaved?: (row: Record<string, unknown>) => void; extra?: Record<string, unknown>;
}) {
  const def: EntityDef = ENTITIES[entity];
  const editing = Boolean(initial?.id);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useFeedback();

  useEffect(() => {
    if (open) { setValues({ ...defaultsFor(def), ...(initial ?? {}) }); setErrors({}); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const title = useMemo(() => `${editing ? "Editar" : "Novo"} ${def.singular}`.replace("Novo receita", "Nova receita").replace("Novo despesa", "Nova despesa").replace("Novo tarefa", "Nova tarefa").replace("Novo oportunidade", "Nova oportunidade"), [editing, def]);

  async function save() {
    const { errors: errs, data } = validate(def, values);
    setErrors(errs);
    if (Object.keys(errs).length) { toast("Revise os campos destacados.", "error"); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const payload = { ...data, ...(extra ?? {}) };
      const q = editing
        ? supabase.from(def.table).update(payload).eq("id", initial!.id as string).select().single()
        : supabase.from(def.table).insert(payload).select().single();
      const { data: row, error } = await q;
      if (error) throw error;
      toast(`${def.singular[0].toUpperCase()}${def.singular.slice(1)} ${editing ? "atualizado(a)" : "criado(a)"} com sucesso.`);
      onSaved?.(row);
      onClose();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={save} loading={saving}>Salvar</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); save(); }}>
        <FormFields def={def} values={values} setValues={setValues} errors={errors} />
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
