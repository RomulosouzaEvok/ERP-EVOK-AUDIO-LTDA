# Incidente 2026-08-06 — Tela branca no frontend (crash do AppLayout)

**Severidade:** Alta (aplicação inutilizável para todos os usuários do frontend dev)
**Duração:** ~30 min (18:40 → 19:10, horário local)
**Status:** Resolvido

## Sintoma
Página branca em http://localhost:5173 após login. Nenhuma mensagem de erro visível
ao usuário. Vite e API respondiam HTTP 200 — a falha era um crash de renderização
do React, não indisponibilidade de servidor.

## Causa raiz
**Descasamento de versão entre frontend e backend (contrato de API quebrado):**

1. Em 2026-08-06 o repositório local foi sincronizado com `origin/main` (+14 commits),
   trazendo um `AppLayout` novo que exibe badges de handoff por departamento lendo
   `GET /api/dashboard/handoffs` — agora esperando as chaves `expedicao`, `qualidade`
   e `compras`.
2. O backend em execução era o container Docker `evok-api` com **imagem construída
   46 horas antes** (código pré-sincronização), que responde o payload antigo — sem
   essas chaves.
3. `badgeCount()` em `client/src/layouts/AppLayout.tsx` acessava
   `handoffs.expedicao.ready_to_ship` sem optional chaining. Com `handoffs.expedicao
   === undefined`, o acesso lançou `TypeError`, derrubando o componente.
4. **Não há Error Boundary** em nenhum ponto de `client/src` — o crash de um badge
   decorativo derrubou a árvore inteira do React (tela branca), em vez de degradar
   só o menu.

Fatores agravantes:
- A interface `DashboardHandoffsSummary` (`client/src/api/dashboard.ts`) declara os
  campos como obrigatórios; o TypeScript confiou num contrato que o runtime não
  garantia. Tipo ≠ validação.
- O comentário no próprio código dizia "Falha da chamada nunca quebra o menu", mas a
  proteção cobria apenas a *chamada* (useQuery), não o *shape* da resposta.

## Correções aplicadas (mesmo dia)
1. **`badgeCount` blindado** com optional chaining em toda a cadeia
   (`handoffs.expedicao?.ready_to_ship`, etc.) — chave ausente ⇒ badge some,
   menu continua. Typecheck validado.
2. **Rebuild da imagem Docker** do backend (`docker compose up -d --build`) com o
   código sincronizado, realinhando o contrato da API.

## Precauções para não reincidir
| # | Ação | Status |
|---|------|--------|
| 1 | Optional chaining em todo acesso a payloads de API "decorativos" (badges, contadores, KPIs) | ✅ Aplicado no AppLayout |
| 2 | **Error Boundary global** (`client/src/components/AppErrorBoundary.tsx`, montado em `main.tsx`) — crash de componente agora exibe tela de erro amigável com botão de recarga, nunca mais tela branca muda | ✅ Aplicado em 2026-08-06 |
| 3 | **Regra operacional: após todo `git pull`/merge com mudanças em `server/`, reconstruir a imagem (`docker compose up -d --build`)** — o container não recarrega código do host | 🔲 Processo (documentado aqui e no runbook) |
| 4 | Expor a versão/commit do backend em `/health/ready` (ex.: `git_sha`) e logar no console do frontend quando divergir do esperado — detecção imediata de descasamento | 🔲 Pendente |
| 5 | Validação de shape em runtime (Zod) nos endpoints que alimentam layout crítico, tratando campos novos como opcionais por 1 versão (tolerância a payload antigo) | 🔲 Pendente |
| 6 | Ao evoluir contrato de API consumido pelo layout, campos novos entram como **opcionais** no tipo TS até o deploy do backend estar confirmado | 🔲 Convenção adotada |

## Notas de segurança correlatas (verificadas durante o incidente)
- O endpoint `/api/dashboard/handoffs` continua atrás de `authorizeModule('dashboard')`
  (RBAC) — o incidente não expôs dados.
- `docker compose up -d --build` não altera secrets; `.env` permanece fora do
  versionamento.
- O crash acontecia **após** autenticação; a tela de login continuava funcional —
  sem impacto em superfície de autenticação/rate-limit.
