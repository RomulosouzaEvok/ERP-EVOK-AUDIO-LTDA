# Residuais Abertos — fechamento da etapa "cadeia do produto"

**Data:** 10 de agosto de 2026
**Objetivo:** saber o que sobrou antes de abrir a próxima frente (n8n + IA +
integração Meta), para não deixar nada para trás.
**Método:** cada item foi **medido** contra o banco, o código ou a suíte — não
copiado do `TODO.md`. Onde o `TODO.md` diverge da realidade, está marcado.

---

## 1. Estado verificado hoje (medido, não declarado)

| O que | Resultado | Como foi medido |
|-------|-----------|-----------------|
| Migrations | **164 aplicadas**, última `20260810-000041` | `npm run migration:status` |
| Dev × Teste | **Bancos idênticos** — 0 divergência de coluna, tipo, índice ou constraint | `node server/scripts/comparar-bancos.cjs` |
| Suíte de integração real | **43 suítes, 166 testes, 100% passando, sem skips** | `npm run test:integration` |
| `purchase_orders.requester_id` | **NOT NULL** | `information_schema.columns` |
| Telas de Roteiro e Plano Mestre | **Existem** (`ProductionRoutesPage.tsx`, `MasterProductionPlanPage.tsx`) | `ls client/src/pages/production/` |
| Aprovadores distintos do solicitante | **Existem** (Diretor, Gerente de Compras) | `users` + `access_profile_permissions` |

**Conclusão:** a cadeia do produto (os 17 gaps) está de fato fechada, e a rede
de segurança de integração está armada e verde. O que falta não é código de
domínio — é **dado real, infraestrutura e aceite**.

---

## 2. Por que o `TODO.md` está desatualizado

**Números:** 6.942 linhas, 66 entradas datadas, 738 caixas de seleção — **190
ainda abertas** (`- [ ]`) e 548 fechadas.

**Causa raiz:** o arquivo acumula duas funções incompatíveis.

1. **Diário append-only** — o registro do que foi feito em cada entrega, que
   por definição *não deve* ser reescrito depois. Está correto assim.
2. **Checklist vivo** — a lista do que ainda falta, que *precisa* refletir o
   presente.

A caixa `- [ ]` pertence à segunda função, mas é escrita dentro da primeira. No
momento em que é escrita, é verdadeira. Quando um commit posterior resolve
aquilo, ninguém volta 2.000 linhas atrás para marcar `- [x]` — porque a entrada
antiga é tratada (com razão) como histórico congelado.

**Nada valida essas caixas.** Existem quatro guardas automáticas para o
*código* (`schema-model-drift-guard`, `column-name-drift-guard`,
`enum-literal-guard`, `cross-database-drift-guard`) e **zero** para a
documentação. Não há CI que pergunte "esta pendência ainda existe?".

### Exemplos concretos de divergência

| `TODO.md` afirma | Realidade medida hoje |
|------------------|------------------------|
| "MIGRATION NÃO APLICADA — `20260810-000032/33/34/35`" (4 ocorrências) | Todas aplicadas |
| "Banco reproduzível — a raiz ainda de pé (BLOQUEIA a compra do servidor)" | Baseline congelado; os dois bancos idênticos |
| "`purchase_orders.requester_id` é NULL-able" | `NOT NULL` desde a migration `000040` |
| "Tela web do roteiro em `client/` (backend pronto, sem UI)" | `ProductionRoutesPage.tsx` existe |
| "Tela web pendente (Plano Mestre)" | `MasterProductionPlanPage.tsx` existe |
| "G4 (apontamento obrigatório) segue não iniciado" | Entregue em `b954fa5` |

### A correção proposta — guarda automática ✅ IMPLEMENTADA em 2026-08-12

> **Status:** a parte automatizável desta proposta **foi implementada em
> 2026-08-12**. A separação editorial `TODO.md` × diário (abaixo) continua
> aberta — é decisão de processo, não de código.
>
> O que entrou:
>
> | Guarda | Onde | O que reprova |
> |---|---|---|
> | `docs-reality-drift-guard` (ampliada) | `server/tests/integration/docs-reality-drift-guard.test.ts` | Migration citada como pendente em **qualquer** doc vivo (`docs/**/*.md` + `CLAUDE.md` + `AGENTS.md`) que já conste em `SequelizeMeta`; e divergência do total de migrations nos **dois pontos de medição canônica** (`CLAUDE.md` §1 e `docs/database/00-INDICE.md`) |
> | `docs-path-reference-guard` (nova, unitária) | `server/tests/unit/docs-path-reference-guard.test.ts` | Caminho de arquivo citado em crase num doc vivo que **não existe no disco** — a classe de drift que a auditoria de 2026-08-11 achou em 12+ arquivos (D3: `scripts/comparar-bancos.cjs` sem o prefixo `server/`) |
>
> A convenção de isenção (banner de arquivo histórico, citação `>`, caixa
> `- [x]`, marcador `(a criar)`) está documentada em
> `server/tests/helpers/docsGuardConventions.ts`. Nenhuma das duas guardas
> carrega lista de arquivos isentos: um documento se declara histórico
> escrevendo o banner no próprio topo, à vista do leitor.

Separar os dois papéis em dois arquivos:

- `DIARIO_BORDO_GO_LIVE_G6.md` — já existe e já é append-only. O histórico das
  entregas vai inteiro para lá, **sem caixas de seleção**.
- `TODO.md` — vira só o presente: pendências abertas, curto, reescrito a cada
  fechamento. Uma pendência resolvida **sai do arquivo** em vez de ganhar um
  `[x]`.

E uma guarda barata: um teste que falha se `TODO.md` passar de N linhas ou se
citar migration que já consta em `SequelizeMeta`. Documentação sem guarda
desatualiza — é a mesma lição que o código já aprendeu quatro vezes.

---

## 3. O que realmente falta

### 3.1 🔴 Cadastro real — a frente maior, recém-iniciada

Ver `docs/carga-inicial/GUIA_CARGA_INICIAL.md` para o passo a passo.

| Pendência | Responsável | Bloqueia |
|-----------|-------------|----------|
| Conferir os 59 insumos marcados (5 bobinas com identificação suspeita) | Engenharia | BOM |
| Corrigir 22 unidades de medida (cola, cordoalha) | Compras + Engenharia | Custo e MRP |
| Preencher custo padrão (327 itens em zero) | Compras + Controladoria | Custeio, preço, balanço |
| NCM/CEST de cada item | Contador | Emissão de NF-e |
| Cadastrar os ~22 produtos acabados | Engenharia | OP e venda |
| Montar a BOM | Engenharia | MRP, custo, baixa de estoque |
| Inventário físico de abertura | Almoxarifado | Tudo |

### 3.2 🟢 Cadastro mestre de itens com trilha de auditoria

**Resolvido em 2026-08-18.** O `itemController` passou a chamar `logAction`
em `create`, `update` e `inactivate`, e a guarda de cobertura de auditoria
foi atualizada para remover `items` do débito conhecido.

Evidência:
- `server/src/modules/items/presentation/controllers/itemController.ts`
- `server/tests/unit/item-audit-trail.test.ts`
- `server/tests/unit/audit-coverage-guard.test.ts`

Validação:
- `npm run typecheck` no `server/`
- `npx jest --runInBand tests/unit/item-audit-trail.test.ts`
- `npx jest --runInBand tests/unit/audit-coverage-guard.test.ts`

### 3.2b 🟢 `purchase_receipts` e `product_cost_ledgers` com FKs críticas

**Resolvido em 2026-08-18.** A migration
`server/migrations/20260818-000050-add-purchase-receipts-and-product-cost-ledger-fks.cjs`
adicionou:

- `purchase_receipts.purchase_id -> purchase_orders.id`
- `purchase_receipts.received_by -> users.id`
- `product_cost_ledgers.product_id -> products.id`

Evidência:
- `npm run migration:up` aplicado com sucesso
- `server/tests/integration/critical-foreign-keys-guard.test.ts` passou

Risco residual: zero linhas existentes hoje, então não houve backfill nem
conflito histórico.

### 3.3 🔴 Pré-requisitos de configuração da produção

- **`work_centers` tem 1 centro ("Montagem Final") com `cost_per_hour = 0`.**
  Custo de mão de obra sai zerado. Medido no banco hoje. Isso não é bug de
  código: depende de valor real vindo da operação/Controladoria.
- **Nenhum produto tem roteiro ativo.** Hoje o banco tem `production_routes = 0`
  linhas, `active_routes = 0` e `products_with_active_route = 0`. Desde o G6,
  iniciar OP sem roteiro falha (`G6-START-NO-ROUTE`) — correto, mas significa
  que **nenhuma OP pode começar** até que os roteiros sejam cadastrados e
  aprovados pelo negócio.
- **`production_cost_settings` existe, mas sem API.** A linha singleton está
  com `overhead_calculation_basis = material_labor`, `overhead_rate_percent = 0`
  e `default_labor_rate_per_hour = 0`. O fallback global de mão de obra só é
  editável direto no banco, então qualquer mudança aqui exige decisão explícita:
  manter como parâmetro de DB ou abrir endpoint administrativo.

### 3.4 🟡 Infraestrutura de produção

- Servidor de produção **não adquirido** — bloqueia reverse proxy/TLS,
  `docker-compose.prod.yml` exercitado e cron de backup.
- **Credencial de runtime ainda é `evok_admin`**, não a role de privilégio
  mínimo `evok_app` (que já existe — migration `000041`). Troca pendente.
- Sem rotação de log (`LOG_FILE` sem logrotate).

### 3.5 🟡 Funcionalidades incompletas (com decisão de negócio pendente)

- **CNAB** (boleto/remessa/retorno) — só OFX foi implementado.
- **Histórico multi-NF-e por pedido** — `Sale.nfe_*` guarda só a mais recente.
- **Bloco K (SPED)** — a obrigação de apontamento existe, mas a **geração do
  arquivo** K200/K230/K235/K280 não foi iniciada.
- **AP automática dos tributos de importação** — depende de decisão sobre
  moeda estrangeira.
- **Mapeamento departamento → centro de custo** na AP automática.
- **PCP sem data de entrega prometida** — `sales` não tem a coluna, então o
  Plano Mestre trabalha com demanda consolidada, sem baldes de tempo.

### 3.6 🟡 Governança e pessoas

- **Usuários reais.** Os 21 usuários são de teste (`@teste.evokaudio`, senha
  aleatória). O Go-Live exige pelo menos um aprovador real em
  `@evokaudio.com.br`. É decisão de pessoa, não de código.
- **UAT** com os departamentos e **aprovação formal G6** — o gate final.

### 3.7 ⏸️ Deixado de lado por decisão do dono (10/08)

- Validação de `mobile/` e `tv/` em hardware real. Ambos entregues e validados
  só por typecheck/bundle.

---

## 4. Recomendação sobre a próxima frente (n8n + IA + Meta)

Ela **não depende** de nada da seção 3 para começar: o webhook já existe
(`POST /api/webhooks/n8n`, exercitado na suíte de integração de hoje) e a API
está estável.

Duas ressalvas, para não criar dívida nova:

1. **A integração vai ler e escrever dados que ainda não existem.** Um fluxo de
   n8n que consulte estoque ou preço hoje recebe zero. Vale começar pelos
   fluxos que não dependem do cadastro (atendimento, captura de lead,
   notificação) e deixar os de estoque/pedido para depois da carga.
2. **Credencial de integração.** O webhook não deve usar o token de uma pessoa.
   Vale criar um perfil de acesso dedicado, de escopo mínimo, antes do primeiro
   fluxo em produção — senão a segregação de função (D-K) fica furada por um
   robô com poderes de admin.
