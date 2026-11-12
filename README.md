# Blusk Design

**Criar, prospectar, organizar e vender.** Plataforma SaaS que reúne inteligência artificial, prospecção comercial, CRM, gestão de clientes e projetos, portfólio e controle financeiro em um único ecossistema.

Stack: **Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, Storage, RLS) · Anthropic Claude API · Google Places API · Stripe · Recharts · Leaflet**.

---

## Módulos

| Área | Rota | O que faz |
|---|---|---|
| Site institucional | `/` | Hero, ecossistema, como funciona, recursos, demonstração (dados identificados como demonstrativos), planos (lidos do banco), FAQ, CTA, termos e privacidade |
| Autenticação | `/cadastro`, `/login`, `/recuperar-senha`, `/redefinir-senha` | Supabase Auth com validação, duplicidade, recuperação de senha e sessão persistente (cookies via `@supabase/ssr`) |
| Visão geral | `/app` | 8 KPIs calculados do banco, gráficos (receitas/despesas/lucro, clientes, conversão, projetos por status), filtros de período (hoje, 7/30/90 dias, ano, personalizado), atividades e ações rápidas |
| Atividades / Notificações | `/app/atividades`, `/app/notificacoes` | Logs gerados por triggers; notificações com marcar como lida, marcar todas, excluir, filtrar e abrir conteúdo |
| Blusk AI | `/app/ai` | Chat com histórico, conversas (criar, renomear, excluir), copiar respostas; assistentes **geral**, **comercial** (analisa lead/oportunidade do banco) e **projetos** |
| Gerador de prompts | `/app/prompts` | 10 categorias, personalização, refinamento, histórico, favoritos, cópia em um clique |
| Biblioteca | `/app/biblioteca` | Links, templates, snippets, referências e ferramentas |
| Blusk Hunter | `/app/hunter` | Pesquisa real via Google Places API (New), filtros (país, estado, cidade, bairro, segmento, categoria, nome, site, redes), mapa interativo sincronizado, score configurável com justificativa, salvar lead, enviar ao CRM, abrir WhatsApp |
| CRM | `/app/crm`, `/app/crm/[id]` | Kanban com arrastar e soltar (e seletor de etapa no celular), 7 etapas, KPIs, filtros, ordenação, timeline (criação, status, valor, responsável, contatos, observações), duplicar, converter em cliente |
| Contatos / Oportunidades | `/app/contatos`, `/app/oportunidades` | Tabelas com busca, filtros, ordenação, paginação, CRUD; enviar lead ao CRM |
| Clientes | `/app/clientes`, `/app/clientes/[id]` | CRUD + perfil com projetos, contratos, pagamentos, histórico, observações e arquivos (Storage privado) |
| Projetos / Tarefas | `/app/projetos`, `/app/projetos/[id]`, `/app/tarefas` | Progresso automático por tarefas, custos (estimado × pago), lucro estimado, alertas (atrasado, prazo próximo, sem atualização, pendências), tarefas com comentários |
| Portfólio | `/app/portfolio`, `/app/portfolio/[id]` | Grade com capa e galeria (upload), publicar/despublicar, reordenar, página detalhada |
| Financeiro | `/app/financeiro`, `/receitas`, `/despesas`, `/relatorios` | Receita bruta, recebidos, pendentes, contas a pagar/receber, fluxo de caixa, receita por cliente, lucro por projeto, distribuição de despesas, exportação CSV |
| Assinatura | `/app/assinatura` | Plano atual, uso do mês, troca de plano, cancelamento/reativação, histórico de pagamentos, tabela de limites |
| Configurações | `/app/configuracoes` | Perfil (foto, dados, e-mail), segurança (senha, encerrar sessões), preferências (tema claro/escuro, formato regional, moeda, notificações) |
| Administração | `/app/admin` | Somente `role = admin`: indicadores gerais, usuários, assinaturas, edição de preços/recursos/limites dos planos, troca manual de plano |

**Regras financeiras:** lucro líquido = receitas **recebidas** − despesas **pagas** (pela data efetiva `paid_at`). Pendentes nunca entram como recebidas. Atualizar um projeto não gera lançamentos.

---

## Configuração

### 1. Instalar
```bash
npm install
cp .env.example .env.local
```

### 2. Supabase (obrigatório)
1. Crie um projeto em supabase.com.
2. Em **SQL Editor**, execute **na ordem** os arquivos de `supabase/migrations/` (ou `supabase db push` com a CLI).
   Eles criam tabelas, índices, restrições, triggers, políticas **RLS**, buckets de Storage (`avatars`, `portfolio`, `client-files`) e os planos Free/Pro/Elite.
3. Em **Authentication → URL Configuration**, defina *Site URL* e adicione `https://SEU_DOMINIO/auth/callback` em *Redirect URLs*.
4. Preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` (usada **apenas** pelo webhook de pagamento).
5. Para tornar-se administrador, após criar sua conta:
   ```sql
   update public.profiles set role = 'admin' where email = 'seu-email@dominio.com';
   ```

### 3. Blusk AI — Anthropic (necessário para IA)
`ANTHROPIC_API_KEY` (somente servidor). Opcional: `ANTHROPIC_MODEL` (padrão `claude-opus-5-5`) e `ANTHROPIC_EFFORT` (padrão `medium`).
As chamadas passam por `/api/ai/*`, validam plano e cota mensal no banco (`consume_usage`) e nunca expõem a chave ao navegador. Recusas do modelo são tratadas e o *fallback* de servidor (`fallbacks: "default"`) está habilitado.

### 4. Blusk Hunter — Google Places API (necessário para prospecção)
Ative **Places API (New)** no Google Cloud e defina `GOOGLE_PLACES_API_KEY` (restrinja a chave por API). Sem a chave, a tela informa que a integração depende de configuração — **nenhum resultado fictício é exibido**. O mapa usa tiles OpenStreetMap/CARTO (sem chave).

### 5. Pagamentos — Stripe (necessário para upgrades)
1. Crie dois preços recorrentes mensais (Pro e Elite) e defina `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ELITE`, `STRIPE_SECRET_KEY`.
2. Crie um webhook para `https://SEU_DOMINIO/api/billing/webhook` com os eventos:
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
3. Defina `STRIPE_WEBHOOK_SECRET`.

O estado da assinatura **só** é alterado pelo webhook (assinatura verificada) usando a service role; o usuário não tem permissão de escrita em `subscriptions`/`payments`.

### 6. Rodar
```bash
npm run dev        # desenvolvimento
npm run build && npm start
```
Deploy recomendado: Vercel (configure as mesmas variáveis no painel).

---

## Segurança

- **RLS em todas as tabelas privadas** (`user_id = auth.uid()`); admins leem via `is_admin()`.
- Trigger `check_owned_refs` impede referenciar clientes/projetos/oportunidades de outra conta.
- Trigger `protect_profile_role` impede que um usuário se promova a admin.
- **Limites por plano aplicados no banco** (`enforce_plan_limit`) e cotas mensais atômicas (`consume_usage`).
- Validação no cliente e no servidor (Zod nas rotas de API, `CHECK` constraints no Postgres).
- Markdown da IA renderizado após escape de HTML; cabeçalhos de segurança no `next.config.mjs`.
- Chaves privadas somente em variáveis de servidor; middleware protege `/app/*`.

## Estrutura

```
supabase/migrations/      schema, RLS, triggers, storage, limites
src/app/(site)/           site institucional e páginas legais
src/app/(auth)/           cadastro, login, recuperação de senha
src/app/app/              aplicação autenticada (todos os módulos)
src/app/api/              IA, Hunter e billing (Stripe + webhook)
src/components/           UI, shell, gráficos, formulários e CRUD reutilizáveis
src/lib/                  sessão/planos, entidades, finanças, scoring, IA, Stripe
```
