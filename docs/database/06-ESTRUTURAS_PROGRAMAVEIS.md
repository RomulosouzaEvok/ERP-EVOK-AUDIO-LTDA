# Estruturas Programáveis — ERP EVOK ÁUDIO

## Verificação real (2026-08-06)

```sql
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public';
```

Resultado: **nenhuma function customizada de negócio**. As únicas funções
listadas em `public` pertencem à extensão `pgcrypto` (`digest`, `hmac`,
`crypt`, `gen_salt`, `encrypt`/`decrypt`, `gen_random_uuid`,
`gen_random_bytes`, `pgp_sym_*`, `pgp_pub_*`, `armor`/`dearmor`) — usadas
apenas para gerar UUIDs (`gen_random_uuid()`, PKs de `items` e tabelas
relacionadas). Nenhuma foi escrita pelo time; são parte padrão da
extensão instalada pela migration de baseline.

```sql
SELECT * FROM information_schema.triggers WHERE trigger_schema = 'public';
-- 0 linhas
```

**Nenhum trigger.** `grep -n "CREATE TRIGGER\|CREATE FUNCTION\|CREATE PROCEDURE"`
no dump completo de `docs/database/schema.sql` também retorna zero
ocorrências.

## Decisão arquitetural (confirmada, não apenas presumida)

**Toda a lógica de negócio do ERP EVOK ÁUDIO vive na camada de aplicação
(Node.js/TypeScript, Clean Architecture — use cases em
`server/src/modules/*/application/use-cases/`), nunca no banco de
dados.** O PostgreSQL é tratado estritamente como um mecanismo de
persistência com integridade referencial forte (FKs, CHECK constraints,
UNIQUE constraints, ENUMs) — não como uma camada de execução de regras.

### Por que essa decisão faz sentido para este projeto

- **Testabilidade:** use cases em TypeScript são testados com Jest
  (unitário, com repositórios mockados) sem precisar de um Postgres real
  rodando — impossível com lógica em PL/pgSQL.
- **Rastreabilidade em code review/Git:** toda mudança de regra de
  negócio (ex.: fórmula de `quality_score` de fornecedor, fórmula de OEE,
  regra de quarentena de lote) é um diff de TypeScript revisável, não uma
  migration com corpo de function opaco.
- **Consistência com o padrão do projeto:** o próprio CLAUDE.md declara
  Clean Architecture com use-cases desacoplados do Sequelize direto em
  22+ módulos — manter lógica no banco quebraria esse desacoplamento (a
  regra passaria a existir em dois lugares, banco e aplicação, com risco
  de divergência).
- **Onde o banco AINDA impõe regra (isso é esperado e correto):**
  `CHECK` constraints (ex.: `warehouse_transfers`: `quantity > 0`,
  `from_warehouse_id <> to_warehouse_id`; `production_cost_settings`:
  `overhead_rate_percent BETWEEN 0 AND 1000`), `UNIQUE`/índices únicos
  parciais (ex.: `uq_production_downtimes_open_per_work_center` — no
  máximo uma parada aberta por centro de trabalho, mesmo sob concorrência
  de escrita) e `FOREIGN KEY` (integridade referencial). Essas são
  "últimas linhas de defesa" contra corrida de escrita concorrente que a
  aplicação sozinha não consegue garantir de forma atômica — não
  contradizem a decisão acima, são um nível diferente (invariante
  estrutural, não regra de negócio processual).

### Trade-off assumido

- **Performance de operações em massa:** algumas rotinas (ex.: cálculo de
  variância de contagem cíclica, reconciliação de custo) fazem múltiplas
  idas ao banco a partir da aplicação em vez de uma única `function`
  server-side. Aceitável no volume atual (~100-150 colaboradores, escala
  de manufatura industrial de porte médio); se o volume crescer
  significativamente, pontos quentes específicos podem justificar uma
  function isolada — não uma mudança de padrão geral.
- **Nenhuma regra "sobrevive" a um bypass da API** (ex.: alguém rodando
  `UPDATE` manual via `psql` não aciona nenhuma regra de negócio,
  incluindo os efeitos colaterais como ajuste de estoque ou geração de
  conta a pagar). Isso é esperado — acesso direto ao banco fora da API já
  é, por si, uma operação administrativa excepcional e fora do fluxo
  normal, coberta pela recomendação de segregação de roles em
  [05-ACESSOS_E_ISOLAMENTO.md](05-ACESSOS_E_ISOLAMENTO.md).

## Se isso mudar no futuro

Qualquer proposta de mover lógica de negócio para o banco (function,
trigger, ou procedure) deve ser tratada como uma **exceção arquitetural
deliberada**, documentada nesta seção com o racional específico (ex.:
"invariante que precisa ser atômica sob concorrência extrema e a
aplicação não consegue garantir isso de forma performática") — não como
prática padrão.

## Exceção aplicada — BLOCO 1 SST (2026-08-06)

O módulo SST (Segurança e Saúde do Trabalho, migrations
`server/migrations/20260806-000131/000135/000136/000137-*.cjs`) introduz os
**primeiros triggers do projeto**, todos com o mesmo racional estreito:
imutabilidade estrutural de registros com valor probatório legal
(EntregaEPI, Acidente, CAT) e garantia de não-descarte de eventos eSocial
em fila — não decisão de fluxo de negócio, não cálculo. Detalhado em
`docs/business/BLOCO_1_SST_MODELO_DADOS.md` §10.

| Function/trigger | Tabela | O que impede |
|---|---|---|
| `sst_lock_entrega_epi` | `sst_entregas_epi` | UPDATE/DELETE de linha com `confirmada = true` (RNF-SST-01, BR-SST-006) |
| `sst_lock_acidente` | `sst_acidentes` | UPDATE de qualquer coluna exceto `dias_perdidos`/`houve_cat`, e DELETE, quando `confirmado = true` (RNF-SST-01, BR-SST-017) |
| `sst_lock_cat` | `sst_cats` | UPDATE de conteúdo legal (tudo exceto colunas de status eSocial) e DELETE, desde a emissão (RNF-SST-01) |
| `sst_block_delete_evento_esocial` | `sst_eventos_esocial` | DELETE em qualquer estado (RNF-SST-03, RF-SST-043 — "nenhum evento perdido ou descartado silenciosamente") |

Enforcement de aplicação (repositório nunca expõe `update`/`delete` para
linha confirmada/emitida) continua sendo a primeira linha de defesa; a
trigger é defesa em profundidade contra bypass direto via `psql`/acesso
administrativo — mesmo racional já aceito para
`uq_production_downtimes_open_per_work_center` (índice único parcial),
aqui levado a trigger porque um `UNIQUE`/`CHECK` sozinho não expressa
"imutável após confirmado". Não é precedente para mover regra de negócio
processual (cálculo de prazo, notificação, fluxo de aprovação) para o
banco — essas continuam 100% em `server/src/modules/sst/` quando
implementado.
