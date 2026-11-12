export function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: { h: string; p: string[] }[] }) {
  return (
    <article className="mx-auto max-w-3xl px-5 pb-24 pt-32">
      <h1 className="text-4xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted">Última atualização: {updated}</p>
      <div className="mt-10 space-y-8">
        {sections.map((s, i) => (
          <section key={s.h}>
            <h2 className="text-lg font-semibold">{i + 1}. {s.h}</h2>
            {s.p.map((t) => <p key={t} className="mt-2 leading-relaxed text-muted">{t}</p>)}
          </section>
        ))}
      </div>
    </article>
  );
}
