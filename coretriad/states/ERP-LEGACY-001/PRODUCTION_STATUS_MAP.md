# PRODUCTION_STATUS_MAP — ERP-LEGACY-001 (pré-passo 23)

| Campo | Valor |
|---|---|
| Projeto | `ERP-LEGACY-001` |
| Produzido por | agente VeriCore, modo read-only reforçado |
| Baseline referenciada | tag `legacy-baseline-001` → commit `c9359be399c45191fe90e8e9707803125a5ba91d` (ver `PROJECT_STATE.md`) |
| Data | 2026-08-13 |
| Método | leitura de código-fonte, configs declaradas, migrations declaradas e documentação versionada (SSOT, checklist de Go-Live, resíduos abertos). **Nenhum comando executado, nenhuma conexão de banco aberta, nenhum teste rodado.** |
| Regra que rege este passo | `.claude/skills/coretriad-onboard/SKILL.md`, seção "REGRA PERMANENTE" |
| **Status desta divergência** | **RESOLVIDA em 2026-08-13 por decisão humana — `APR-2026-016`** (ver nota de resolução logo abaixo, após o achado original do VeriCore, que permanece intacto como evidência de auditoria) |

---

## ACHADO CRÍTICO — divergência de fonte autoritativa (Regra 20 do `CLAUDE.md`)

> **NOTA DE RESOLUÇÃO (coretriad-director, 2026-08-13):** a divergência
> descrita nesta seção foi **resolvida por decisão humana**, registrada em
> `APR-2026-016` (`coretriad/governance/APPROVALS.md`). O texto original do
> VeriCore abaixo **não foi alterado nem apagado** — é evidência da análise
> que motivou a escalada e permanece como registro de auditoria. A decisão
> do dono foi: **há dado real de negócio em produção, mesmo sem Go-Live
> formal**; os 327 insumos reais da fábrica — e qualquer outro dado real
> identificado nos módulos abaixo classificados `UNKNOWN` — contam como
> produção real para fins deste programa, **independentemente do rótulo
> formal de Go-Live**. Esta resolução se reflete na tabela por módulo e no
> resumo por categoria mais abaixo, ambos atualizados; o texto de análise
> original do VeriCore nesta seção foi preservado sem edição.

Antes da tabela por módulo, um conflito direto entre duas fontes que este
agente **não tem autoridade para resolver sozinho** e que deve ser escalado
ao `coretriad-director` / responsável humano antes do passo 23 prosseguir:

- **`coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md`** declara: *"O
  `ERP-LEGACY-001` está **PARCIALMENTE em produção real**: parte dos módulos
  processa hoje dado real da empresa Evok Áudio LTDA."*
- **A própria SSOT do produto e o checklist de Go-Live do ERP** (fontes
  internas do sistema auditado, portanto sujeitas à Regra 2 da skill —
  "não presumir que a documentação do próprio ERP está correta", mas aqui
  citadas porque são as únicas fontes escritas e datadas sobre o assunto)
  dizem o oposto, de forma explícita e repetida:
  - `docs/project-memory/product/ERP_SSOT.md:14` — Status: **"🟡 Pré-Go-Live
    G6"**.
  - `docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md:6` — *"Deploy (Fase 2
    deste checklist — Go-Live Day) **NÃO autorizado** — falta servidor de
    produção."*
  - `docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md:1095-1101` — Decision
    Point 1: **"🔴 NO-GO (estado atual, 2026-08-06)"**.
  - `docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md:1356` — pendência (a):
    *"Servidor de produção — `[PENDENTE]` — compra **adiada 3-4 meses** por
    decisão do dono (2026-08-10). Bloqueia o deploy."*
  - `docs/infra/DEPLOY_UBUNTU.md:188-189` — *"Não cobre ainda o cenário de
    provisionamento de servidor novo do zero (só existirá servidor real para
    testar isso após a compra)."*
  - `docker-compose.prod.yml:1-8` (cabeçalho do arquivo) — *"STATUS: não
    exercitado ainda (servidor de produção/VPS ainda não foi adquirido)...
    Este arquivo existe para ficar PRONTO quando a infra existir, não para
    ser aplicado agora."*

**Conciliação parcial (o que as duas fontes têm em comum, medido, não
interpretado):** `docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md:1268-1307`
(seção "(g)") e `docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md:94-108`
registram que, em 2026-08-10, o único banco existente (`erp_evok_audio`, o
banco de **desenvolvimento**, não um banco de produção separado) recebeu
**327 insumos reais da fábrica** via `POST /api/items`, com nomes/specs
genuínos da Evok Áudio (não fictícios) — mas **zero fornecedores, zero
clientes, zero produtos acabados, zero BOM, zero roteiro de produção**
(tabela completa citada abaixo). Isso é plausivelmente a origem da leitura
"PARCIAL em produção" no `PROJECT_STATE.md`: existe dado real de catálogo,
mas não existe operação de negócio real (nenhuma compra, venda ou OP pode
ocorrer hoje — `G6-START-NO-ROUTE` impede toda OP de sair de `planned`).

**Este agente não decide qual das duas fontes prevalece.** Marco a
classificação de sistema como um todo como `UNKNOWN — precisa confirmação
humana` no resumo abaixo, e uso a tabela de dados medida (RESIDUAIS_ABERTOS)
como evidência de nível mais fino por módulo, já que é a única fonte com
números concretos e data de medição.

*(Fim do texto original do VeriCore nesta seção — não alterado. A resolução
desta escalada está registrada na nota no topo da seção e refletida na
tabela por módulo e no resumo por categoria abaixo.)*

---

## Evidência primária de nível de dados (medida, citada, não re-executada)

Tabela reproduzida de `docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md:1275-1288`
("Medido no banco `erp_evok_audio` em 2026-08-12"):

| Cadastro | Registros | Nota da fonte |
|---|---|---|
| `items` | 327 | reais, carregados via API; custo 0, estoque 0, 59 marcados para revisão (5 críticas) |
| `suppliers` | 0 | "nenhuma requisição vira pedido de compra" |
| `clients` | 0 | "nenhuma venda pode ser registrada" |
| `employees` | 0 | "sem apontamento nominal de produção" |
| `products` (acabados) | 0 | "não há o que fabricar" |
| `bill_of_materials` | 0 | "sem BOM, o MRP não explode necessidade" |
| `production_routes` | 0 | "nenhuma OP inicia" (gate `G6-START-NO-ROUTE`) |
| `work_centers` | 1 | "capacidade real não cadastrada" |
| `users` | 21 | 1 admin + 20 **usuários de teste** (`@teste.evokaudio`) |
| `departments` | 17 | "ok — seed oficial" (reflete o organograma real da empresa) |

Esta tabela é o insumo mais fino disponível sem violar o modo read-only; não
foi reexecutada nem verificada por este agente contra o banco.

---

## Tabela por módulo/diretório

Legenda de confiança: **ALTA** (evidência documental direta e datada),
**MÉDIA** (inferência razoável a partir de evidência indireta),
**BAIXA** (pouca evidência, próxima de UNKNOWN por definição).

> **Nota de atualização (coretriad-director, 2026-08-13, `APR-2026-016`):**
> as classificações originais `UNKNOWN — precisa confirmação humana`
> atribuídas pelo VeriCore às linhas `items`, `categories`, `departments`,
> `users`, `auth` e `auditLogs` abaixo foram **resolvidas por decisão
> humana** para `PRODUÇÃO REAL (confirmada por decisão humana —
> APR-2026-016)`. A coluna "Evidência" original do VeriCore foi preservada
> sem edição; a mudança de classificação está marcada explicitamente em
> cada linha afetada.

### `server/` — backend (49 módulos em `server/src/modules/`)

| Módulo | Classificação | Evidência | Confiança |
|---|---|---|---|
| `items` | **PRODUÇÃO REAL (confirmada por decisão humana — APR-2026-016)** — antes `UNKNOWN — precisa confirmação humana` | 327 registros reais e não-fictícios carregados via API (`RESIDUAIS_ABERTOS_2026-08-10.md:14`), mas dados "crus" (custo 0, 59 a revisar) e sistema formalmente pré-Go-Live | ALTA (dado real existe) / mas classificação sistema-nível é o que diverge |
| `categories` | **PRODUÇÃO REAL (confirmada por decisão humana — APR-2026-016)** — antes `UNKNOWN — precisa confirmação humana` | Referenciada pelos 327 itens reais (`server/src/scripts/backfill/02b-bis_category_to_item_categoria.ts`), sem contagem própria medida na tabela de RESIDUAIS_ABERTOS | BAIXA |
| `departments` | **PRODUÇÃO REAL (confirmada por decisão humana — APR-2026-016)** — antes `UNKNOWN — precisa confirmação humana` | 17 registros = organograma real declarado da empresa ("seed oficial"), não dado de teste, mas inserido por seed de sistema, não por operação de negócio | MÉDIA |
| `users` | **PRODUÇÃO REAL, parcial (confirmada por decisão humana — APR-2026-016): apenas a conta admin** — as 20 contas `@teste.evokaudio` permanecem NÃO-PRODUÇÃO | 21 registros: 1 admin + **20 explicitamente "de teste"** (`@teste.evokaudio`) por `RESIDUAIS_ABERTOS`/checklist; a conta admin isolada era UNKNOWN, agora resolvida como produção real | MÉDIA |
| `auth` | **PRODUÇÃO REAL (confirmada por decisão humana — APR-2026-016)** — antes `UNKNOWN — precisa confirmação humana` | A carga dos 327 itens exigiu login autenticado real (usuário do time de implantação); não há evidência se isso conta como "operação real da empresa" ou "trabalho de implantação/dev" | BAIXA |
| `auditLogs` | **PRODUÇÃO REAL (confirmada por decisão humana — APR-2026-016)** — antes `UNKNOWN — precisa confirmação humana` | Tabela tinha só 2 linhas (os 2 logins) após a carga de 327 itens (`RESIDUAIS_ABERTOS_2026-08-10.md:113-114`); além disso achado documentado: `itemController.ts` **não chama `logAction`**, então a carga real de itens não ficou auditada | MÉDIA |
| `suppliers` | NÃO-PRODUÇÃO | 0 registros medidos (2026-08-12) | ALTA |
| `clients` | NÃO-PRODUÇÃO | 0 registros medidos | ALTA |
| `employees` | NÃO-PRODUÇÃO | 0 registros medidos | ALTA |
| `products` | NÃO-PRODUÇÃO | 0 registros medidos (produtos acabados) | ALTA |
| `bom` | NÃO-PRODUÇÃO | `bill_of_materials` com 0 registros medidos | ALTA |
| `production` | NÃO-PRODUÇÃO | `production_routes` = 0; gate `G6-START-NO-ROUTE` impede qualquer OP de sair de `planned` | ALTA |
| `workCenters` | NÃO-PRODUÇÃO | 1 registro, descrito na própria fonte como "só o mínimo; capacidade real não cadastrada" | ALTA |
| `mrp` | NÃO-PRODUÇÃO | Depende de BOM (0) e roteiro (0) para explodir necessidade — não pode operar sobre dado real hoje | ALTA |
| `purchases` | NÃO-PRODUÇÃO | Depende de `suppliers` (0) | ALTA |
| `purchaseRequisitions` | NÃO-PRODUÇÃO | Depende de `suppliers`/MRP real (0) | ALTA |
| `sales` | NÃO-PRODUÇÃO | Depende de `clients` (0) e `products` (0) | ALTA |
| `maintenance` | NÃO-PRODUÇÃO | Depende de `work_centers` reais (1, mínimo) e ativos cadastrados | MÉDIA |
| `serviceOrders` | NÃO-PRODUÇÃO | Sem `clients`/`products` reais para vincular OS | MÉDIA |
| `quality` (`qualityInspections`) | NÃO-PRODUÇÃO | Sem produção real ocorrendo (roteiro=0) para inspecionar | MÉDIA |
| `nonConformities` | NÃO-PRODUÇÃO | Idem — sem fluxo produtivo real em curso | MÉDIA |
| `traceability` | NÃO-PRODUÇÃO | Depende de lotes/produção real (0) | ALTA |
| `mobileInventory` | NÃO-PRODUÇÃO | App `mobile/` explicitamente **não validado em hardware real** (ver seção mobile/) | MÉDIA |
| `inventory` (`inventoryCounts`) | NÃO-PRODUÇÃO | Sem inventário físico de abertura ainda (`RESIDUAIS_ABERTOS_2026-08-10.md:108`: "Inventário físico de abertura" listado como pendência) | ALTA |
| `assets` | NÃO-PRODUÇÃO | Sem evidência de ativos reais cadastrados; módulo dependente de carga ainda não feita | BAIXA |
| `rfq` | NÃO-PRODUÇÃO | Depende de `suppliers` (0) | ALTA |
| `comex` (`importProcesses`) | NÃO-PRODUÇÃO | Sem evidência de processo de importação real em curso | BAIXA |
| `financial` (`finance`, `cnab`, `reconciliation`) | NÃO-PRODUÇÃO | Sem compras/vendas reais (fornecedores e clientes ambos em 0) para gerar títulos | ALTA |
| `accounting` | NÃO-PRODUÇÃO | Sem lançamentos de origem real (compras/vendas em 0) | ALTA |
| `budget` | NÃO-PRODUÇÃO | Sem evidência de orçamento real carregado | BAIXA |
| `treasury` | NÃO-PRODUÇÃO | Sem fluxo financeiro real (contas a pagar/receber dependem de compras/vendas, ambas em 0) | ALTA |
| `facilities` | NÃO-PRODUÇÃO | Sem evidência de dado real carregado | BAIXA |
| `marketing` | NÃO-PRODUÇÃO | Sem evidência de dado real carregado | BAIXA |
| `juridico` | NÃO-PRODUÇÃO | Sem evidência de dado real carregado | BAIXA |
| `ti` | NÃO-PRODUÇÃO | Sem evidência de dado real carregado | BAIXA |
| `rh` | NÃO-PRODUÇÃO | Depende de `employees` (0) | ALTA |
| `sst` | NÃO-PRODUÇÃO | Depende de `employees` (0) | ALTA |
| `engineering` | NÃO-PRODUÇÃO | Depende de `products`/BOM reais (0) | ALTA |
| `laboratory` | NÃO-PRODUÇÃO | Sem evidência de dado real carregado | BAIXA |
| `directorate` | NÃO-PRODUÇÃO | Painel agregador de dados de outros módulos, todos NÃO-PRODUÇÃO/vazios | MÉDIA |
| `masterProduction` (`masterProductionPlans`) | NÃO-PRODUÇÃO | Depende de `products`/roteiro reais (0) | ALTA |
| `spreadsheetImport` (`catalogImport`) | NÃO-PRODUÇÃO | Ferramenta de carga; a carga real registrada (327 itens) foi feita via API direta, não citada como tendo passado por este módulo | BAIXA |
| `reports` | NÃO-PRODUÇÃO | Reflete dados de outros módulos, majoritariamente vazios | MÉDIA |
| `dashboard` | NÃO-PRODUÇÃO | Idem | MÉDIA |
| `accessProfiles` | NÃO-PRODUÇÃO | Estrutura de permissões, sem indício de perfis reais de negócio ativos além dos de teste | BAIXA |
| `webhooks` | NÃO-PRODUÇÃO | Memória do projeto registra "bot n8n fora do ar" — endpoint existe mas não processa tráfego real hoje | MÉDIA |
| `fiscal` | NÃO-PRODUÇÃO | Sem `clients`/`products`/vendas reais para emitir NF-e | ALTA |
| `intelligentAuditor` | NÃO-PRODUÇÃO | Audita dados de outros módulos, majoritariamente vazios/de teste | MÉDIA |

### `client/` (frontend)

| Item | Classificação | Evidência | Confiança |
|---|---|---|---|
| `client/` (app inteiro) | NÃO-PRODUÇÃO (pré-Go-Live) | Mesma base de evidência de sistema (Go-Live NO-GO, servidor não adquirido); `CORS_ORIGIN` de dev aponta para `localhost:5173` em `docker-compose.yml:55` | ALTA — mas ver ressalva de sistema no topo |

### `mobile/` (Expo/React Native)

| Item | Classificação | Evidência | Confiança |
|---|---|---|---|
| `mobile/` (app inteiro) | NÃO-PRODUÇÃO | `mobile/README.md:113` — "smoke test sem dispositivo real"; `GO_LIVE_G6_CHECKLIST.md:56` pendência (e) — "sem validação em hardware real" | ALTA |

### App Android TV (`tv/`)

| Item | Classificação | Evidência | Confiança |
|---|---|---|---|
| `tv/` (app inteiro) | NÃO-PRODUÇÃO | `tv/README.md:89-90` — "o que não pôde ser validado aqui... hardware real" listado como pendente; `tv/README.md:288` — referência a `android.tvBanner` "antes do lançamento em produção" (futuro, não realizado); `GO_LIVE_G6_CHECKLIST.md:56` pendência (e) | ALTA |

### Infra / deploy / CI-CD

| Item | Classificação | Evidência | Confiança |
|---|---|---|---|
| `docker-compose.yml` (dev) | **PRODUÇÃO REAL (confirmada por decisão humana — APR-2026-016)** — antes `UNKNOWN — precisa confirmação humana` | É o **único ambiente em execução hoje**; `NODE_ENV: ${NODE_ENV:-development}` (linha 43); é o banco que contém os 327 itens reais (ver seção de dados acima) — decisão humana trata este banco como hospedeiro de produção real, apesar de ser rotulado ambiente de dev | MÉDIA — mistura ambiente-de-dev com dado real de catálogo |
| `docker-compose.prod.yml` | NÃO-PRODUÇÃO | Cabeçalho do próprio arquivo: "STATUS: não exercitado ainda... existe para ficar PRONTO quando a infra existir, não para ser aplicado agora" (linhas 1-8) | ALTA |
| `docs/infra/DEPLOY_UBUNTU.md` (runbook) | NÃO-PRODUÇÃO | Linhas 188-189: "só existirá servidor real para testar isso após a compra" | ALTA |
| `.github/workflows/server-ci.yml` (CI) | NÃO-PRODUÇÃO | Banco efêmero `erp_evok_audio_ci`, `NODE_ENV: test`, segredos de teste hard-coded no próprio workflow (linhas 17-40) | ALTA |
| `server/scripts/schedule-backup-cron.sh` e demais scripts de backup/infra | NÃO-PRODUÇÃO | Referenciados como rotina a rodar **no servidor de produção que ainda não existe** (`docker-compose.prod.yml:20-22`) | ALTA |
| `server/CREDENCIAIS_TESTE.local.txt`, `server/CREDENCIAIS_APROVADOR.local.txt`, `server/ACESSOS_N8N.local.txt` | NÃO-PRODUÇÃO (por nome) — **conteúdo não lido** | Nomes indicam credenciais de teste/aprovador local; por serem candidatos a segredo em texto claro, não foram abertos, conforme restrição desta etapa | BAIXA (classificação por nome de arquivo, não por conteúdo) |

---

## Resumo por categoria

> Tabela atualizada em 2026-08-13 por resolução humana (`APR-2026-016`). Os
> totais originais do VeriCore (`PRODUÇÃO REAL: 0`, `UNKNOWN: 6 módulos + 1
> infra`) constam no histórico de versionamento do arquivo; os totais abaixo
> refletem a decisão vigente.

| Categoria | Contagem (módulos backend + apps + infra) |
|---|---|
| PRODUÇÃO REAL (confirmada por decisão humana — APR-2026-016) | **7** — 6 módulos backend (`items`, `categories`, `departments`, `users` [parcial — só a conta admin], `auth`, `auditLogs`) + `docker-compose.yml` (banco de dev que hospeda o dado real) |
| NÃO-PRODUÇÃO | **43** módulos backend + `client/` + `mobile/` + `tv/` + `docker-compose.prod.yml` + `DEPLOY_UBUNTU.md` + CI + scripts de backup + 3 arquivos de credenciais locais (por nome) + as 20 contas de teste `@teste.evokaudio` dentro de `users` |
| UNKNOWN — precisa confirmação humana | **0** — resolvido por `APR-2026-016` |
| **Classificação de sistema como um todo** | **PARCIALMENTE EM PRODUÇÃO REAL, resolvida por decisão humana (`APR-2026-016`)**: a divergência entre `PROJECT_STATE.md` e a SSOT/checklist de Go-Live do ERP (ver seção "ACHADO CRÍTICO" acima) foi decidida pelo dono do CoreTriad — há dado real de negócio em produção mesmo sem Go-Live formal, e o regime read-only reforçado se aplica de forma permanente aos módulos listados acima como produção real |

Nenhum módulo recebeu `PRODUÇÃO REAL` de forma isenta de ressalva **na análise
original do VeriCore**: a evidência então disponível (checklist de Go-Live,
SSOT do produto, runbook de infra) apontava que o Go-Live nunca ocorreu e que
não existe servidor de produção. O único "dado real" comprovado (327 itens de
catálogo) vive dentro do mesmo banco de desenvolvimento usado por CI/dev, sem
separação de ambiente — por isso a classificação `UNKNOWN`, e não `PRODUÇÃO
REAL`, atribuída então pelo VeriCore aos módulos que o tocam. **Esta ressalva
foi resolvida por decisão humana em `APR-2026-016`**, que determinou que a
ausência de Go-Live formal não impede a classificação de produção real quando
há dado real de negócio, conforme refletido na tabela acima.

## Recomendação para o passo 23

**Situação atual (2026-08-13):** a divergência abaixo descrita foi **resolvida
por decisão humana em `APR-2026-016`** — ver nota de resolução na seção
"ACHADO CRÍTICO" e classificação final no resumo por categoria acima. O texto
da recomendação original do VeriCore é preservado abaixo como evidência de
auditoria; a ação que ele recomendava (tratar os módulos citados com regime
read-only reforçado) já é a decisão vigente e permanente, e não mais uma
precaução condicional:

> Enquanto a divergência acima não for resolvida por decisão humana explícita,
> recomendo que **todas** as trilhas do passo 23 tratem `items`, `categories`,
> `departments`, `users`, `auth`, `auditLogs` e o banco por trás de
> `docker-compose.yml` com o mesmo regime read-only reforçado de um módulo de
> produção confirmado — por precaução, não por classificação definitiva — até
> que o `coretriad-director` ou o responsável humano decida qual fonte
> prevalece (Regra 20 do `CLAUDE.md`) e, se necessário, atualize o
> `PROJECT_STATE.md` de acordo.
