# PROJECT STATE — ERP-LEGACY-001

| Campo | Valor |
|---|---|
| Project ID | ERP-LEGACY-001 |
| Nome | ERP Evok Áudio LTDA — recuperação e modernização do legado |
| Tipo | `EXISTING_SYSTEM` |
| Programa | `LEGACY_RECOVERY_AND_MODERNIZATION` |
| Data de registro | 2026-08-13 |
| Estado atual | `IN_AUDIT` — **CAMPO CORRIGIDO EM 2026-08-16 (ver "Correção C-02" abaixo; texto anterior preservado ali).** A run `ERP-LEGACY-001-AUD-001` **não está mais em fase de escopo/plano com fieldwork bloqueado**: o **fieldwork está ENCERRADO (27/27 trilhas)**, a validação adversarial `T-25` teve **3 rodadas** (a 3ª concluída em 2026-08-16) e a consolidação `T-26` + `AUDIT_COVERAGE_EXECUTED.md` estão **CONCLUÍDAS**. A run segue **sem veredito**: nenhum `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED` ou `FINDING CLOSED` foi emitido, e o fechamento do déficit de cobertura do G3 (`APR-2026-024` Decisão A) precede qualquer veredito final. **Nota de concorrência registrada:** remediação preliminar SanaCore corre em paralelo (CASE-001/CASE-002) — a state machine linear não modela essa concorrência de programa legado; registrado como ocorreu, conciliação de modelo fica com VeriCore + humano (mesmo tratamento da dívida já registrada em `STATE_MACHINE.md`). |
| Situação do ciclo | Passos 21-24 CONCLUÍDOS — passos 25-30 AUTORIZADOS (`APR-2026-017`) — **passos 25, 26, 27, 28, 29 e 30 CONCLUÍDOS** (ver tabela "Progresso dos passos"). **O passo 30 encerrou a fase de discovery em 2026-08-14**: 9 arquivos de teste de caracterização, 66/66 verdes contra banco efêmero (`CHARACTERIZATION_TESTS.md`). **Passo 31 EM CURSO com fieldwork ENCERRADO** — ver seção "Passo 31 — estado corrente (2026-08-16)". A validação adversarial independente dos cinco findings `FIND-ERP-005`-`009` está **CONCLUÍDA** (todos CONFIRMED; `FIND-ERP-007` **rebaixado de HIGH a MEDIUM**, com item 3 em `NEEDS_MORE_EVIDENCE`, e por isso **não segue à SanaCore**). **Sete** achados foram promovidos a **findings formais preliminares**, fora da sequência do passo 31, por autorização humana explícita (`APR-2026-017` para 2; `APR-2026-018` para 5) — ver seção "Findings preliminares" abaixo. |
| Status de produção | **PARCIAL — classificação final resolvida por `APR-2026-016`** — ver seção "Status de produção" abaixo |
| Baseline imutável | tag `legacy-baseline-001` → commit `c9359be399c45191fe90e8e9707803125a5ba91d` (Regras 12 e 13 do `CLAUDE.md`; ver seção "Baseline imutável" abaixo) |
| `AUDIT_COMMIT` da run AUD-001 | `c1311a6f76b512fef893f7e60d934179cae3409f` — fixado por tripla verificação em disco (`00-scope/AUDIT_SCOPE.md`; `00-scope/AUDIT_COMMIT_BINDING_VERIFICATION.md`) |
| HEAD do repositório nesta sessão | `8cc650a` (pré-commit do passo 30) — **verificado por `git rev-parse` na sessão de 2026-08-14**, não por contexto injetado. **Este campo é histórico e não foi reverificado em 2026-08-16** (Regra 5 do programa: nenhum número relido não pode ser reafirmado). Ver seção "Incidentes de processo", item 3. |
| Aprovação humana de abertura | `APR-2026-015` em `coretriad/governance/APPROVALS.md` — **limitada aos passos 21-24** |
| Aprovação humana da fase atual | `APR-2026-020` (gate do passo 31 + encaminhamento dos 7 findings), `APR-2026-021`/`APR-2026-022`/`APR-2026-023` (gates G3-G11 e decisões de negócio) e **`APR-2026-024`** (Opção A no déficit de cobertura do G3; promoção do achado `js-yaml`; recriação do banco de teste) — todas em `coretriad/governance/APPROVALS.md` |
| Skill que rege o programa | Passos 21-24: `.claude/skills/coretriad-onboard/SKILL.md` (**ENCERRADA** ao final do passo 24). Passos 25-30: `.claude/skills/coretriad-legacy-discovery/SKILL.md` (**criada em 2026-08-13** especificamente para esta fase, com **PARE incondicional ao fim do passo 30** — **ENCERRADA**). |
| State machine | `coretriad/states/STATE_MACHINE.md` |
| Event log | `coretriad/states/ERP-LEGACY-001/PROJECT_EVENT_LOG.md` |
| Referência normativa | `docs/coretriad/CORETRIAD_MASTER_SPEC.md` — Parte VIII |

## Descrição

Abertura formal, sob o programa `LEGACY_RECOVERY_AND_MODERNIZATION`, do
levantamento e recuperação do ERP Evok Áudio LTDA — o sistema real que este
repositório contém e opera hoje (distinto dos simulados `SIM-001`/`SIM-002`,
que validaram o modelo operacional do CoreTriad, não este produto). Esta
abertura foi autorizada por `APR-2026-015`, condicionada à declaração prévia
`CORETRIAD OPERATIONALLY VALIDATED` (`APR-2026-014`, evidenciada por
`SIM-001` e `SIM-002`).

O ciclo previsto pela skill `coretriad-onboard` cobre, sem exceção e sem
avançar sozinho, os passos 21 a 24:

1. **Passo 21 — Onboarding formal** (este registro).
2. **Passo 22 — Baseline imutável** (confirmada abaixo, tag já existente).
3. **Pré-passo 23 — Classificação produção × não-produção**, obrigatória
   antes de qualquer trilha de snapshot, produzindo
   `PRODUCTION_STATUS_MAP.md`. **CONCLUÍDO** — divergência escalada pelo
   VeriCore resolvida por decisão humana em `APR-2026-016`.
4. **Passo 23 — Snapshot técnico** (VeriCore, read-only, sem execução de
   teste ou script que abra conexão de banco). **CONCLUÍDO** — 8 artefatos
   produzidos; ver seção "Passo 23 — Snapshot técnico (execução e
   observações)" abaixo.
5. **Passo 24 — Arquitetura AS-IS** (`CURRENT_ARCHITECTURE.md`). **CONCLUÍDO**
   — ver seção "Passo 24 — Arquitetura AS-IS (execução e observações)"
   abaixo.

**Ao final do passo 24 a skill `coretriad-onboard` parou incondicionalmente**
e foi encerrada. Os passos 25-30 só começaram após **novo gate humano
explícito**, dado pelo dono do CoreTriad em 2026-08-13 e formalizado em
`APR-2026-017`, e são regidos por uma skill nova e distinta
(`coretriad-legacy-discovery`) — ver seção "Fase atual" abaixo.

## Status de produção (declaração obrigatória — APR-2026-015, condição 1; resolvida por APR-2026-016)

O `ERP-LEGACY-001` está **PARCIALMENTE em produção real**: parte dos
módulos processa hoje dado real da empresa Evok Áudio LTDA; parte está em
desenvolvimento/homologação, sem dado real.

O pré-passo 23 (`PRODUCTION_STATUS_MAP.md`, conduzido por agente VeriCore em
modo read-only) identificou divergência direta (Regra 20 do `CLAUDE.md`)
entre esta declaração e a SSOT do produto/checklist de Go-Live do próprio
ERP, e classificou o sistema como `UNKNOWN — precisa confirmação humana`,
escalando ao `coretriad-director`/responsável humano em vez de decidir
sozinho.

**Esta divergência está resolvida.** O dono do CoreTriad decidiu, registrado
em `APR-2026-016` (`coretriad/governance/APPROVALS.md`), que **há dado real
de negócio em produção, mesmo sem Go-Live formal**: os 327 insumos reais da
fábrica — e qualquer outro dado real que venha a ser identificado nos
módulos antes classificados `UNKNOWN` — contam como produção real para fins
deste programa, **independentemente do rótulo formal de Go-Live**.

**Classificação final por módulo** (aplicada em
`PRODUCTION_STATUS_MAP.md`, que preserva o histórico de análise original do
VeriCore como evidência de auditoria):

- **PRODUÇÃO REAL (confirmada por decisão humana — APR-2026-016)**: `items`,
  `categories`, `departments`, `users` (somente a conta admin — não as 20
  contas de teste `@teste.evokaudio`), `auth`, `auditLogs`, e o banco por
  trás de `docker-compose.yml` (ambiente de desenvolvimento que hoje hospeda
  o dado real de catálogo, já que não existe banco de produção separado).
- **NÃO-PRODUÇÃO**: todos os demais módulos/diretórios já classificados como
  tal em `PRODUCTION_STATUS_MAP.md` (43 módulos backend + `client/` +
  `mobile/` + `tv/` + `docker-compose.prod.yml` + runbook de deploy + CI +
  scripts de backup + arquivos de credenciais locais) — não alterados por
  esta decisão.

O regime read-only reforçado (seção abaixo) se aplica **de forma permanente**
aos módulos classificados acima como produção real, **não condicionado a uma
futura declaração formal de Go-Live**.

## Regra permanente de segurança de dado real (repetida aqui por exigência do dono)

Permanentemente, para qualquer módulo classificado como produção real
(listados na seção acima), vale — sem exceção, para qualquer agente, em
qualquer passo do programa (21 a 40):

- **Permitido**: ler código-fonte, ler schema/migrations declarados, ler
  arquivos de configuração (sem extrair segredo/credencial em texto claro).
- **Proibido, sem exceção**: executar suíte de teste, rodar script de
  diagnóstico, ou qualquer comando que abra conexão com o banco de dados
  real — nem para "só contar linhas" ou "só confirmar comportamento". Vale
  mesmo que o comando pareça inofensivo ou somente leitura no SQL.
- **Inspecionar dado real** (uma linha, uma query, um dump) **exige
  aprovação humana explícita, caso a caso** — nunca por extensão de uma
  aprovação anterior, nunca por inferência.
- Módulos classificados como não-produção (dev/homologação/sem dado real)
  seguem as regras normais de discovery (sem alterar nada, sem refatorar,
  sem corrigir — Regra 1 da skill).

Fonte: `.claude/skills/coretriad-onboard/SKILL.md` (seção "REGRA PERMANENTE"),
`APR-2026-015` (condição 3) e `APR-2026-016` (torna o regime permanente,
independente de Go-Live formal). A skill
`.claude/skills/coretriad-legacy-discovery/SKILL.md` (passos 25-30) herda esta
regra integralmente.

## Baseline imutável (passo 22)

A tag `legacy-baseline-001` **já existe** no repositório e aponta para o
commit `c9359be399c45191fe90e8e9707803125a5ba91d` — o commit imediatamente
anterior a qualquer trabalho de simulação/governança CoreTriad (`SIM-001`,
`SIM-002`) neste repositório, isto é, representa fielmente "como estava o
ERP real antes de o CoreTriad tocar nele".

Conforme instruído, **nenhuma tag nova foi criada**: esta é a baseline
oficial e permanente do `ERP-LEGACY-001` para o passo 22. Toda mudança
posterior a este commit, feita por qualquer organização, precisa de delta
audit ou nova auditoria para ser comparada contra ela (Regras 12, 13 e 14 do
`CLAUDE.md`).

| Campo | Valor |
|---|---|
| Tag | `legacy-baseline-001` (tag anotada `ad8e26cc0779f98b31f8d31bc865862e7f6b9452`, verificada em `.git/packed-refs:15`) |
| Commit | `c9359be399c45191fe90e8e9707803125a5ba91d` |
| Ação nesta etapa | Confirmação e registro (tag pré-existente, não criada agora) |
| Autoridade | `coretriad-director`, sob autorização de `APR-2026-015` |

## Passo 23 — Snapshot técnico (execução e observações)

**Concluído.** Os 8 artefatos previstos pela skill `coretriad-onboard` para o
passo 23 foram produzidos e estão versionados em
`docs/coretriad/projects/ERP-LEGACY-001/discovery/`:

`LEGACY_SYSTEM_INVENTORY.md`, `SYSTEM_MAP.md`, `MODULE_CATALOG.md`,
`API_INVENTORY.md`, `DATABASE_INVENTORY.md`, `INTEGRATION_INVENTORY.md`,
`DEPENDENCY_INVENTORY.md`, `DOCUMENTATION_INVENTORY.md`.

### Método de execução (registrado por exigência de transparência — não omitido)

Das 6 trilhas VeriCore despachadas para produzir estes artefatos:

- **Inventário estrutural/arquitetura** (`LEGACY_SYSTEM_INVENTORY.md`,
  `SYSTEM_MAP.md`, `MODULE_CATALOG.md`) e **inventário de banco de dados**
  (`DATABASE_INVENTORY.md`): a trilha caiu por queda de conexão e precisou
  ser **redespachada uma vez** antes de completar.
- **Inventário de API** (`API_INVENTORY.md`) e **inventário de
  dependências** (`DEPENDENCY_INVENTORY.md`): completaram na primeira
  tentativa útil, mas **nenhuma das duas tinha ferramenta Write disponível**
  — relataram o conteúdo como texto na resposta, sem gravá-lo diretamente.
- **Inventário de integrações** (`INTEGRATION_INVENTORY.md`): caiu **4 vezes
  seguidas** por erro de conexão e acabou sendo produzida **diretamente pelo
  `coretriad-director`, via Read/Grep/Glob, sem subagente VeriCore**.

Em todos os casos o conteúdo final foi **persistido pelo
`coretriad-director`** a partir da resposta do agente (nos dois casos sem
Write) ou de leitura direta (no caso de integrações), **sem alteração de
conteúdo**, com uma única exceção: uma correção de consistência registrada
no próprio `LEGACY_SYSTEM_INVENTORY.md` — o `PRODUCTION_STATUS_MAP.md`
divergia da sua própria contagem no texto corrido (dizia 49/43 módulos;
tabela e disco confirmam 48/42) — já corrigida no `PRODUCTION_STATUS_MAP.md`.

Esta ressalva não é uma reclassificação de autoria: o conteúdo técnico
permanece atribuído às trilhas VeriCore que o produziram (ou, no caso de
integrações, ao levantamento direto do `coretriad-director` em modo
read-only, sem juízo de auditoria); não houve neste passo nenhuma
implementação, correção ou edição de `src/`/`product/`/`tests/` (Regra 5 do
`CLAUDE.md`).

### Observações preliminares de discovery (não são findings formais)

As observações abaixo emergiram do levantamento do passo 23 e são
registradas aqui **apenas para visibilidade de quem retomar o programa** —
elas **não constituem finding formal**: findings formais só existem a partir
do passo 25+/31 (auditoria 360°), com o rigor de proposta → validação →
confirmação previsto na state machine de finding
(`coretriad/states/STATE_MACHINE.md`).

1. O módulo **CNAB** (financeiro) tem todas as camadas implementadas, mas
   **nunca é montado em `server/app.ts`** — há decisão de escopo já
   documentada no próprio código ("CNAB fica fora desta v1"); não é bug.
   **Segue o fluxo normal até o passo 31** (decisão do dono, 2026-08-13).
   **Reconfirmado de forma independente no passo 26** (ver seção do passo 26).
2. **Ausência total de soft delete** no schema declarado — nenhuma tabela
   tem coluna de exclusão lógica, nenhum model usa `paranoid: true` — apesar
   de **9+ arquivos** chamarem `.destroy()` (hard delete) em fluxos
   sensíveis.
3. **13 triggers de banco de imutabilidade** (RH/Jurídico/SST) confirmam que
   parte da integridade é imposta pelo Postgres, não só pela aplicação — mas
   **nenhuma proteção equivalente** foi encontrada para `AuditLog`, NF-e
   emitida ou lançamento contábil. **→ PROMOVIDO a `FIND-ERP-002`**
   (ver seção "Findings preliminares" abaixo).
4. Vários **endpoints de escrita crítica** (pagamento, emissão de NF-e,
   remessa CNAB, lançamento de estoque, conversão de MRP) **sem evidência de
   idempotency-key** na camada de rota. **→ PROMOVIDO a `FIND-ERP-001`**,
   com escopo corrigido pela validação adversarial (ver abaixo: só 2 das 8
   rotas são de fato vulneráveis).
5. **Nenhuma migration/tabela/FK mudou** entre o inventário antigo
   (commit `dc52081`) e a baseline atual — 169/207/478, idêntico.

## Passo 24 — Arquitetura AS-IS (execução e observações)

**Concluído.** O artefato previsto pela skill `coretriad-onboard` para o
passo 24 foi produzido e está versionado em
`docs/coretriad/projects/ERP-LEGACY-001/discovery/CURRENT_ARCHITECTURE.md`.

### Método de execução

Produzido por um agente `vericore-architecture-auditor`, em modo read-only
(Read/Grep/Glob apenas — nenhum comando executado, nenhuma conexão de banco
aberta, nenhum teste rodado), a partir dos 8 artefatos do passo 23 e do
`PRODUCTION_STATUS_MAP.md`. O agente **não tinha ferramenta Write
disponível**; o conteúdo foi relatado como texto na resposta e **persistido
pelo `coretriad-director`, sem alteração de conteúdo** (mesmo padrão de
ressalva de transparência já aplicado no passo 23 a duas trilhas). Escopo
amostrado: os 6 módulos PRODUÇÃO REAL lidos por inteiro
(controller+use-cases+repositório+domínio), mais amostra aprofundada de 9
módulos NÃO-PRODUÇÃO representando financeiro/produção/RH/jurídico/
qualidade/TI/SST/facilities.

### Achados de discovery (não são findings formais)

Assim como no passo 23, tudo abaixo é **observação de arquitetura AS-IS**,
não finding formal — a promoção a finding (`PROPOSED → VALIDATING →
CONFIRMED`) só ocorre no passo 31, sob autoridade VeriCore. **Decisão do dono
em 2026-08-13: estes achados de arquitetura (V1-V4, ownership do `auditLogs`,
CNAB órfão) seguem o fluxo normal até o passo 31 — não foram promovidos a
finding formal preliminar.**

O estilo real confirmado é "Clean Architecture por módulo"
(`domain/application/infrastructure/presentation`) em 48/48 módulos
estruturalmente, mas com **quatro classes de violação de camada
sistemáticas, não isoladas**:

1. **V1 — Nenhum composition root**: todo controller (camada de
   apresentação) instancia diretamente a classe concreta
   `Sequelize<X>Repository` no escopo do próprio arquivo, em vez de recebê-la
   de um container de DI/factory central — confirmado nos 6 módulos
   PRODUÇÃO REAL e em amostra de 9 módulos NÃO-PRODUÇÃO (15+ arquivos de
   evidência); nenhum `container`/`DIContainer`/`awilix`/`InversifyContainer`
   encontrado no código.
2. **V2 — Casos de uso tipados com `express.Request`**: 7 arquivos de
   `application/` (`accessProfiles`, `ti`, `users`) importam o tipo
   `Request` do Express ou recebem `req: any`, para viabilizar
   `logAction(req, ...)` — a camada de aplicação, que deveria ser agnóstica
   de transporte, fica acoplada ao Express.
3. **V3 — Models Sequelize globais com regra de negócio real**, fora de
   qualquer árvore Clean Architecture de módulo: `User.ts` (hook
   `beforeSave` com hash de senha e `passwordVersion`) e `AuditLog.ts`
   (método `register()` com normalização de vocabulário de auditoria e
   fallback de `ENUM`).
4. **V4 — Domínio sem entidade própria em ~46/48 módulos**: o "domínio" é só
   a interface do repositório, tipada `any`/`Promise<any>`; a implementação
   Sequelize devolve a instância do model ORM diretamente até o controller.
   Únicas exceções com mapper explícito (`infrastructure/mappers/*Mapper.ts`)
   desacoplando o shape do domínio do shape do Sequelize: `sst` e `ti`
   (~4% dos módulos).

Fronteiras entre módulos são **heterogêneas**: padrão antigo (`mrp`, `rfq`,
`comex`, `purchaseRequisitions`, `suppliers`, `inventory`) importa domínio —
ou, no caso do controller de `mrp`, infraestrutura concreta — de módulos
vizinhos sem porta local; padrão mais novo (`facilities`, `juridico`, `sst`,
`ti`) define porta local + adapter, mais disciplinado mas ainda alcançando o
use-case do módulo fornecedor, não uma API exposta por ele. Nenhuma
dependência circular encontrada nos pares inspecionados.

**Ownership de dado quebrado**: o módulo `auditLogs` possui a leitura da
tabela `audit_logs` (`SequelizeAuditLogsRepository.ts`), mas a escrita nunca
passa por esse módulo — acontece via `server/src/services/
auditLogService.ts` (fora de qualquer módulo), chamado por **101 arquivos,
403 ocorrências**, espalhados por quase todos os 48 módulos. Dois caminhos
de código totalmente independentes para a mesma tabela.

**AuthZ resolvida 100% na borda HTTP**: `middlewares/auth.ts` consulta
`User`/`AccessProfile`/`AccessProfilePermission` direto do banco a cada
requisição, sem passar por nenhum módulo; nunca há reverificação de
autorização na camada de aplicação/domínio. A lógica de "quem pode aprovar"
aparece duplicada em **três mecanismos distintos**: (a) na rota
(`authorizeModule`/`authorize`, padrão dominante); (b) no controller
(`contractController.ts` de `juridico`, com `hasApprove()`/
`resolveAvailableApproverRoles()`); (c) dinamicamente pelo corpo da
requisição (`rh`, `authorizeContractDecision`).

O artefato inclui um diagrama Mermaid de camadas com as violações marcadas
e 8 ADRs implícitos documentados — entre eles, a confirmação de que **existe
sim um kernel compartilhado real e deliberado**
(`server/src/shared/{domain,application}`), que convive com uma segunda
"camada compartilhada" **não deliberada** (`server/src/models/`,
`server/src/services/`, `server/src/middlewares/`) — infraestrutura legada
que todo módulo acessa por atalho, sem ter sido desenhada como kernel.

### Explicitação do PARE incondicional (mandato da skill `coretriad-onboard`)

**Skill `coretriad-onboard` ENCERRADA ao final do passo 24, conforme PARE
incondicional.** Nenhum passo 25+ foi convocado por ela. A retomada ocorreu
apenas após novo gate humano explícito (2026-08-13), sob skill nova — ver
seção seguinte.

## Fase atual — passos 25-30 (autorizados em 2026-08-13, `APR-2026-017`)

### Decisão do dono

O dono do CoreTriad, em 2026-08-13, decidiu explicitamente, nesta ordem:

- **(a)** Promover **dois** achados de discovery a **findings formais
  preliminares**, fora da sequência normal do passo 31, por serem risco
  financeiro / de integridade de dados. São `FIND-ERP-001` e `FIND-ERP-002`
  (seção abaixo). **Ambos já foram formalizados e validados
  adversarialmente; ambos estão `CONFIRMED`.**
- **(b)** Prosseguir com os **passos 25-30** da Parte VIII do master spec.
- **(c)** Os demais achados de arquitetura (Clean Architecture V1-V4,
  ownership do `auditLogs`, CNAB órfão) **seguem o fluxo normal até o passo
  31** — não são promovidos agora.
- **(d)** O **delta audit do `SIM-002`** (`OBS-SIM-002-009` /
  `OBS-SIM-002-010`) fica **em espera** e **não bloqueia** o
  `ERP-LEGACY-001`.

Estas quatro decisões estão formalizadas em `APR-2026-017`
(`coretriad/governance/APPROVALS.md`). Uma segunda aprovação, `APR-2026-018`,
autorizou depois a promoção de **mais cinco** achados, levantados no passo 26
— ver seção "Findings preliminares".

### Skill que rege a fase

Foi criada a skill `.claude/skills/coretriad-legacy-discovery/SKILL.md`,
específica para reger os **passos 25 a 30**, com **PARE incondicional ao fim
do passo 30** — mesmo mecanismo aplicado à `coretriad-onboard` nos passos
21-24. O passo 31 (auditoria 360°) **não é convocado por ela**, nem por
inferência, nem por analogia: exige novo gate humano explícito e registrado.

### Progresso dos passos

| Passo | Descrição | Estado | Artefato |
|---|---|---|---|
| 25 | Domínios descobertos | **CONCLUÍDO** | `docs/coretriad/projects/ERP-LEGACY-001/discovery/DOMAIN_MAP.md` |
| 26 | Regras de negócio descobertas (`DISCOVERED_BUSINESS_BEHAVIOR`) | **CONCLUÍDO** | 6 × `docs/coretriad/projects/ERP-LEGACY-001/discovery/BUSINESS_RULE_CANDIDATES_*.md` |
| 27 | Requisitos recuperados | **CONCLUÍDO** | `docs/coretriad/projects/ERP-LEGACY-001/discovery/REQUIREMENTS_BASELINE.md` |
| 28 | Casos de uso recuperados | **CONCLUÍDO** | 6 × `USE_CASES_RECOVERED_*.md` (~200 UCs) |
| 29 | Matriz de rastreabilidade do legado | **CONCLUÍDO** — nasceu quebrada, como previsto (0 cadeias completas canônicas) | 6 × `LEGACY_TRACEABILITY_MATRIX_*.md` + `LEGACY_TRACEABILITY_MATRIX.md` (consolidação) |
| 30 | Testes de caracterização | **CONCLUÍDO** (2026-08-14) — 9 arquivos, 66/66 verdes contra `erp_evok_audio_test`; trava `APR-2026-016` respeitada | `CHARACTERIZATION_TESTS.md` + `server/tests/characterization/` |
| 31 | Auditoria 360° | **EM CURSO — LINHA CORRIGIDA EM 2026-08-16 (ver "Correção C-02").** Gate aprovado (`APR-2026-020` Decisão A); run `ERP-LEGACY-001-AUD-001` com **fieldwork ENCERRADO (27/27 trilhas)**, `T-25` em **3 rodadas** e `T-26` (consolidação + cobertura executada) **concluída**. **Sem veredito.** Extensão de cobertura autorizada por `APR-2026-024` em execução (4 trilhas `T-27_DEF-*`) | `audit/runs/ERP-LEGACY-001-AUD-001/` |

## Passo 26 — Regras de negócio descobertas (execução e observações)

**CONCLUÍDO.** Seis clusters de domínio foram auditados por agentes
`vericore-business-rule-auditor`, recuperando **~130 regras de negócio
candidatas** diretamente do código. Artefatos versionados em
`docs/coretriad/projects/ERP-LEGACY-001/discovery/`:

| Cluster | Artefato |
|---|---|
| Identidade e acesso | `BUSINESS_RULE_CANDIDATES_identidade-acesso.md` |
| Cadastro e suprimentos | `BUSINESS_RULE_CANDIDATES_cadastro-suprimentos.md` |
| Planejamento e produção | `BUSINESS_RULE_CANDIDATES_planejamento-producao.md` |
| Qualidade e estoque | `BUSINESS_RULE_CANDIDATES_qualidade-estoque.md` |
| Comercial e financeiro | `BUSINESS_RULE_CANDIDATES_comercial-financeiro.md` |
| Pessoas e governança | `BUSINESS_RULE_CANDIDATES_pessoas-governanca.md` |

Tudo o que foi extraído entra obrigatoriamente como
`DISCOVERED_BUSINESS_BEHAVIOR`, **nunca como regra de negócio oficial**, até
confirmação humana (Regra 6 do `CLAUDE.md` e regra 3 do programa).

### Achado transversal mais importante do passo 26

**Nenhuma das ~130 regras recuperadas tem BR-ID versionado nem OWNER nominal
em artefato.** A rastreabilidade que existe de fato em runtime é por **código
de gap** (`G1`…`G18`, `D-C`, `D-G`, `D-K`) — que são **rótulos de correção e
de decisão, não BR-IDs canônicos**. Não existe hoje, no repositório, um
identificador estável de regra de negócio ao qual requisito, caso de uso e
teste possam se ancorar.

### Risco conhecido do passo 29 (registrado antecipadamente)

Consequência direta do achado acima, registrada aqui **antes** de o passo 29
começar, para que não seja descoberta como surpresa no meio dele:

> **A matriz de rastreabilidade `BR → REQ → UC → TC` do passo 29 nasce
> quebrada.** Sem BR-ID canônico e sem OWNER nominal, a coluna `BR` da matriz
> não tem chave primária real — ela só pode ser ancorada em códigos de gap
> (`G1`…`G18`, `D-C`, `D-G`, `D-K`), que identificam *correções e decisões*,
> não *regras*. Qualquer matriz produzida no passo 29 sem resolver isso será
> uma matriz de rastreabilidade **aparente**, não real.

Este risco é **registro de estado**, não decisão técnica: a definição de como
resolver (criar esquema de BR-ID, atribuir OWNER nominal, ou aceitar a
limitação de forma explícita e registrada) é **decisão do dono**, e o
`coretriad-director` não a antecipa nem escolhe caminho.

### Achados de discovery do passo 26 NÃO promovidos a finding

Registrados aqui para visibilidade. **Seguem o fluxo normal até o passo 31 —
`APR-2026-018` é explícita ao vedar promoção por analogia.** Nenhum deles é
finding formal hoje:

1. **Scan mobile furando quarentena e depósito** — o fluxo de scan do mobile
   não respeita a segregação de material em quarentena nem o depósito de
   destino.
2. **ICMS divergente em 19 das 27 UFs**, e **IPI documentado 10%/15% ×
   implementado 0%**.
3. **Desconto do pedido não chega à NF-e nem ao recebível** — o desconto
   concedido na venda se perde no faturamento e no contas a receber.
4. **`effectiveness_result` de RNC sem caminho de escrita** — não existe
   código que grave o campo; consequência prática: **toda RNC fechada fica
   permanentemente vermelha no painel**.
5. **Nível de permissão "somente ver" (`V`)** documentado na matriz de
   permissões e **inexistente no código**.
6. **CNAB órfão** — reconfirmação independente da observação 1 do passo 23.
7. **MRP e OP explodem BOM com regras de parada diferentes** — dois
   algoritmos de explosão de estrutura de produto que divergem no critério de
   parada.

## Findings preliminares (fora da sequência do passo 31)

Existem hoje **sete** findings formais preliminares no `ERP-LEGACY-001`
(além dos 247 findings emitidos pelas 27 trilhas de fieldwork da run
`AUD-001` — ver "Passo 31 — estado corrente"). Todos os sete foram
promovidos **fora da sequência normal do passo 31**, por autorização humana
explícita e caso a caso — **nunca por analogia**:

- `FIND-ERP-001` e `FIND-ERP-002` — autorizados por **`APR-2026-017`** (risco
  financeiro e de integridade de dados).
- `FIND-ERP-005` a `FIND-ERP-009` — autorizados por **`APR-2026-018`** (risco
  de autorização, compliance regulatório ou registro legal), levantados no
  passo 26.

Todos os demais achados dos passos 23, 24 e 26 permanecem como
**observações/achados de discovery**, não findings.

### Lacuna de numeração — `FIND-ERP-003` e `FIND-ERP-004` NUNCA EXISTIRAM

Registrado aqui de forma deliberada e explícita, replicando `APR-2026-018`,
**para que nenhuma auditoria futura conclua que dois findings sumiram**:

> A numeração salta de `FIND-ERP-002` para `FIND-ERP-005` porque os IDs
> `003` e `004` **nunca foram atribuídos a nenhum achado**. **Nenhum finding
> foi descartado, rebaixado, mesclado ou suprimido.** A lacuna é um salto de
> numeração na mensagem de autorização do dono, não uma supressão.

**Precedente estabelecido (`APR-2026-018`):** ID de finding não é reciclado
nem renumerado para "fechar buraco". Se um finding for descartado no futuro,
o ID permanece registrado com o motivo do descarte — nunca desaparece da
sequência.

### Tabela consolidada dos 7 findings

Severidade, confiança e status são **autoridade VeriCore** — apenas
transcritos aqui. **Atualização 2026-08-14 (`APR-2026-020` Decisão B): o
encaminhamento à SanaCore foi AUTORIZADO pelo dono**, na sequência: 2
CRITICAL primeiro (`FIND-ERP-001` → `ERP-LEGACY-001-CASE-001`;
`FIND-ERP-005` → `ERP-LEGACY-001-CASE-002` — casos em
`coretriad/handoffs/ERP-LEGACY-001/`, triagem SanaCore em curso); depois os
4 HIGH (`002`, `006`, `008`, `009` — aguardando abertura de caso);
`FIND-ERP-007` (MEDIUM) **não segue** até o item 3 voltar ao autor. Nenhum
finding foi fechado — fechamento continua autoridade exclusiva VeriCore
(Regra 4).

| ID | Tema | Sev. | Confiança declarada no artefato | Validação adversarial independente | Status | Autorização |
|---|---|---|---|---|---|---|
| `FIND-ERP-001` | Idempotência (estoque + pagamento parcial) | **CRITICAL** | `CONFIRMED` | **CONCLUÍDA** (`vericore-finding-validator`) | `OPEN` | `APR-2026-017` |
| `FIND-ERP-002` | Imutabilidade de tabelas críticas | **HIGH** | `CONFIRMED` | **CONCLUÍDA** (`vericore-finding-validator`) | `OPEN` | `APR-2026-017` |
| `FIND-ERP-005` | Alçada de contrato jurídico — 4 falhas encadeadas | **CRITICAL** | `CONFIRMED` | **CONCLUÍDA** — CONFIRMED (reforçado) | `OPEN` | `APR-2026-018` |
| `FIND-ERP-006` | LGPD — sem DPO; retenção sem enforcement; sem prazo ANPD | **HIGH** | `CONFIRMED` | **CONCLUÍDA** — CONFIRMED | `OPEN` | `APR-2026-018` |
| `FIND-ERP-007` | RH — motivo de rescisão descartado; aviso prévio fixo | **MEDIUM** (rebaixado de HIGH) | `CONFIRMED` (itens 1-2) | **CONCLUÍDA** — item 3 `NEEDS_MORE_EVIDENCE`; **não segue à SanaCore** | `OPEN` | `APR-2026-018` |
| `FIND-ERP-008` | SST — tipo do CAT × gravidade sem checagem cruzada | **HIGH** | `CONFIRMED` | **CONCLUÍDA** — CONFIRMED | `OPEN` | `APR-2026-018` |
| `FIND-ERP-009` | Segregação de função só em Compras (sistêmico) | **HIGH** | `CONFIRMED` | **CONCLUÍDA** — CONFIRMED (4·21·3) | `OPEN` | `APR-2026-018` |

Arquivos: `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-00{1,2,5,6,7,8,9}.md`.

**Atualização (2026-08-13) — validação adversarial CONCLUÍDA:** a validação
independente pelo `vericore-finding-validator` dos cinco `FIND-ERP-005` a
`FIND-ERP-009` foi **concluída**. Resultado: todos `CONFIRMED`; `FIND-ERP-007`
**rebaixado de HIGH a MEDIUM** (item 3, 409×422, em `NEEDS_MORE_EVIDENCE` — por
isso **não segue à SanaCore** até voltar ao autor); `FIND-ERP-009` com aritmética
corrigida para 4·21·3. As seções `## Validação (finding-validator)` estão
anexadas aos cinco arquivos. **Nenhum é DUPLICATE nem FALSE_POSITIVE.** A ressalva
abaixo fica como registro histórico do estado anterior.

**Ressalva original (histórica) sobre a coluna "Confiança declarada"
(Regra 20 do `CLAUDE.md` — divergência registrada, não silenciada):** os
cinco arquivos `FIND-ERP-005` a `FIND-ERP-009` já traziam
`CONFIDENCE: CONFIRMED` no cabeçalho, **declarado pelo próprio agente que
produziu o finding**, enquanto a **validação adversarial independente pelo
`vericore-finding-validator` estava EM CURSO naquele momento**, não concluída.
São coisas diferentes e o Control Plane não as trata como equivalentes: até
o validador devolver resultado, **o `CONFIRMED` dos cinco é autodeclaração do
produtor, não confirmação independente**. `FIND-ERP-001` e `FIND-ERP-002`,
sim, têm validação independente concluída. Nenhum dos sete pode ser tratado
como fechado, e nenhum foi fechado — só a VeriCore declara `RETEST_PASSED`/
`CLOSED` (Regra 4 do `CLAUDE.md`).

### Ambiente — condição uniforme de `APR-2026-018`

Os cinco findings `005`-`009` estão em módulos classificados
**NÃO-PRODUÇÃO** em `PRODUCTION_STATUS_MAP.md`. A severidade atribuída se
justifica pelo **padrão que será promovido a produção** (e, nos casos de LGPD
e SST, pelo risco regulatório/previdenciário no momento da promoção), **não
por exposição atual de dado real**. Cada finding traz essa classificação no
próprio cabeçalho. Ressalva relevante já registrada em `FIND-ERP-005`: a
conta `admin` — vetor de uma das quatro falhas — já é **PRODUÇÃO REAL** por
`APR-2026-016`, embora o módulo `juridico` que ela destravaria não seja.

### FIND-ERP-001 — Ausência de proteção de idempotência (CRITICAL, CONFIRMED)

Origem: observação preliminar 4 do passo 23 ("endpoints de escrita crítica
sem evidência de idempotency-key").

**O escopo original foi reduzido pela validação — e isso é o ponto
importante deste registro.** O auditor **não aceitou** a severidade
`CRITICAL` uniforme sugerida para as 8 rotas: releu as 8 e separou em dois
grupos.

- **GRUPO A — 6 rotas com proteção real** (lock pessimista + guarda de
  estado), **incluindo emissão de NF-e e conversão de MRP**. Não são
  vulneráveis; `CRITICAL` **não se aplica** a elas.
- **GRUPO B — 2 rotas de fato vulneráveis**, às quais o `CRITICAL` se
  restringe:
  1. `POST /api/inventory/movements` — **sem nenhuma proteção**: duplo
     clique dobra o lançamento de estoque; o índice em
     `reference_type`/`reference_id` **não é unique**.
  2. **Pagamento parcial repetido** em `PayPayableUseCase` /
     `ReceivePaymentUseCase` — a guarda só rejeita título já `paid`, **não
     cobre o estado `partial`**.

O `vericore-finding-validator` confirmou o GRUPO B como `CONFIRMED` e
atestou que a diferenciação GRUPO A/B é **honesta**, tendo relido de forma
independente 2 das rotas do GRUPO A para checar se a proteção alegada
existe mesmo.

### FIND-ERP-002 — Ausência de imutabilidade em tabelas críticas (HIGH, CONFIRMED)

Origem: observação preliminar 3 do passo 23 ("13 triggers de imutabilidade
sem cobertura equivalente").

`audit_logs`, `sale_invoices` (NF-e emitida) e `accounting_entries`
(lançamento contábil postado) **não têm nenhum trigger, RULE ou REVOKE de
imutabilidade**, enquanto 13 tabelas de RH/Jurídico/SST têm.

**Agravante:** a role de runtime `evok_app`, criada com a justificativa de
"privilégio mínimo", recebe `GRANT` de `UPDATE`/`DELETE` em **todas** as
tabelas de `public`, sem exceção.

O validador varreu migrations posteriores, hooks de Sequelize e proxies de
query em busca de controle compensatório: **nenhum encontrado**. `CONFIRMED`.

### Os 5 findings do passo 26 — e o que os agentes acharam ALÉM do insumo

Esta subseção registra deliberadamente os **agravantes descobertos pelos
próprios agentes**, que não estavam no insumo que os originou. Ficam no
Control Plane porque **são a evidência de que a verificação funcionou** — os
agentes não se limitaram a confirmar o que lhes foi dito (Regra 19 do
`CLAUDE.md`: evidência tem precedência sobre consenso).

**`FIND-ERP-005` — Alçada de contrato jurídico (CRITICAL).** Quatro falhas
encadeadas, cada uma suficiente por si só para contornar o único controle
financeiro do módulo Jurídico. Agravantes descobertos além do insumo:
- O **aditivo altera o valor do contrato mesmo quando declarado como
  `change_type='term'`** — o rótulo do tipo de alteração não restringe o que
  a alteração de fato faz.
- O **gate de alçada é condicionado a uma dependência opcional no
  construtor**: se a dependência não é injetada, **a alçada é simplesmente
  pulada, sem erro, sem log, sem falha visível**.

**`FIND-ERP-006` — LGPD (HIGH).** Agravantes descobertos além do insumo:
- **Resolver um pedido de exclusão grava `answered` sem apagar nada** — o
  fluxo marca a solicitação do titular como atendida sem executar expurgo ou
  anonimização.
- **Não existe agendador algum no backend** — logo, retenção "com prazo" não
  tem sequer o mecanismo que poderia vir a aplicá-la.

**`FIND-ERP-007` — RH, rescisão (HIGH).** Agravantes descobertos além do
insumo:
- **Não existe coluna de destino** para o motivo de rescisão: o campo é
  aceito, validado e **descartado**.
- O **aviso prévio presumido está congelado por teste** — a suíte fixa o
  comportamento atual, de modo que corrigi-lo quebra teste existente.

**`FIND-ERP-008` — SST, CAT × gravidade (HIGH).** Agravantes descobertos além
do insumo:
- A combinação errada **é o único comportamento possível da UI**: o cliente
  envia `tipo:'inicial'` **hard-coded**.
- **A suíte de testes aprova essa combinação** — o defeito está coberto por
  teste que o valida como correto.

**`FIND-ERP-009` — Segregação de função (HIGH, sistêmico).** O agente **mapeou
28 pontos de aprovação** do ERP: **4 com segregação, 20 sem, 4 N/A** — e
**11 desses pontos não eram citados por nenhum documento existente**.
Enquadramento fixado por `APR-2026-018`: o achado **não** é que a segregação
esteja errada onde existe (onde existe está correta, é o melhor controle
interno do sistema e não tem curto-circuito nem para `admin` — decisão
`D-K`, 2026-08-10). O achado é a **assimetria não decidida**: existe decisão
registrada mandando aplicar em Compras; **não existe nenhuma decisão
registrada dizendo que os demais pontos não devem ter**. É **lacuna de
política de controle interno**, não bug isolado — e por isso a remediação
correta começa por **decisão do dono sobre o escopo da política**, não por
código (aplicar sem decisão violaria a Regra 6 do `CLAUDE.md`).

## Passo 31 — auditoria 360° e remediação preliminar (execução em curso)

**Run:** `ERP-LEGACY-001-AUD-001`, `AUDIT_COMMIT c1311a6f76b512fef893f7e60d934179cae3409f`
(tripla verificação em disco). **Fieldwork NÃO autorizado** — a run para no gate
humano do plano.

> **TEXTO ACIMA SUPERADO — ver "Correção C-02" e "Passo 31 — estado corrente
> (2026-08-16)".** O parágrafo é preservado como registro histórico do estado
> em 2026-08-14 (Regra 15: evidência histórica não é apagada). O fieldwork foi
> autorizado e está **encerrado**.

**Estágios concluídos:** escopo (10 exclusões, conflito de interesse sem
impedimento, com restrição vinculante de que autor de finding preliminar não
reexamina o próprio achado como voz única) e inventário revalidado (21 contagens
confirmadas, 7 com dupla validação; estratificação 6/20/22 módulos = 48 e
39/381/261 endpoints = 681, fechando com duas contagens independentes).

### OBS-INV-01 — a baseline não representa o código auditado (material)

O commit `3dee99f` (2026-08-13, "espelhamento item↔produto e recebimento de
imobilizado") alterou 8 arquivos de `server/src` **depois da tag
`legacy-baseline-001` (`c9359be`) e antes do discovery (`1979beb`)** —
verificado pelo orquestrador com `git merge-base --is-ancestor` nos dois
sentidos. Consequência: **os 7 findings preliminares estão ancorados em
`c9359be`, um commit que já não refletia o código no momento do discovery**;
apenas `FIND-ERP-001` foi re-ancorado (pela triagem do CASE-001). Os outros 6
**não**. `itemProductMirrorService.ts` e `fixedAssetReceiptService.ts` são
código que nenhuma auditoria examinou. Isso **não invalida os findings a
priori** — invalida a premissa de que a baseline representa o código auditado.
Re-ancoragem dos 6 é item do plano.

#### Correção C-01 (2026-08-16) — o placar de re-ancoragem acima está DESATUALIZADO

**O texto do `OBS-INV-01` acima permanece integralmente preservado como
evidência histórica** (Regra 15) e descreve corretamente o estado **anterior à
execução da onda W0**. A afirmação *"apenas `FIND-ERP-001` foi re-ancorado […]
Os outros 6 não"* **deixou de ser verdadeira** e é corrigida aqui por adição,
nunca por reescrita silenciosa (Regras 7 e 20 — o artefato versionado vence).

**Fonte relida diretamente pelo `coretriad-director` nesta data:**
`audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-00_REANCHORING_REPORT.md`
(v3, §0 sumário executivo) e
`audit/runs/ERP-LEGACY-001-AUD-001/24-coverage/AUDIT_COVERAGE_EXECUTED.md`
§1.1, que escalou a correção ao director precisamente porque `coretriad/` não
é namespace de escrita da VeriCore (Regra 16).

**Estado real: T-00 executou RA-01…RA-07 e registrou veredito individual para
7 de 7 findings, todos `ÂNCORAS_VÁLIDAS` — zero `ÂNCORAS_DERIVADAS`, zero
`ÂNCORAS_INVÁLIDAS`.**

| Finding | RA | Veredito | Profundidade declarada pelo próprio T-00 |
|---|---|---|---|
| `FIND-ERP-001` (CRITICAL) | RA-07 | `ÂNCORAS_VÁLIDAS` | 14 arquivos / 24 faixas — **confirmação independente** da re-ancoragem da triagem SanaCore, que entrou como hipótese e nunca como prova |
| `FIND-ERP-002` (HIGH) | RA-01 | `ÂNCORAS_VÁLIDAS` | 5 arquivos / 12 faixas + varredura própria |
| `FIND-ERP-005` (CRITICAL) | RA-02 | `ÂNCORAS_VÁLIDAS` | 9 arquivos / 17 faixas; leitura na árvore de `main`, **jamais** na worktree SanaCore |
| `FIND-ERP-006` (HIGH) | RA-03 | `ÂNCORAS_VÁLIDAS` | **amostra dirigida às âncoras load-bearing** — 5 arquivos / 8 faixas |
| `FIND-ERP-007` (MEDIUM) | RA-04 | `ÂNCORAS_VÁLIDAS` | 3 arquivos / 5 faixas (as 3 load-bearing) |
| `FIND-ERP-008` (HIGH) | RA-05 | `ÂNCORAS_VÁLIDAS` | 4 arquivos / 6 faixas, server + client |
| `FIND-ERP-009` (HIGH) | RA-06 | `ÂNCORAS_VÁLIDAS` | alegação de exaustividade **reproduzida por varredura própria** (4 call sites de `assertApproverIsNotRequester`) |

Registrado também que a reconciliação dos 8 arquivos de `3dee99f` com as
âncoras dos 7 findings deu **interseção vazia** em `server/src`,
`server/migrations`, `server/database`, `client/src`, `*.sql` e `server/tests`
(`T-00` §2.2 + §2.4 ADENDO-02) — o que **explica** por que as âncoras
sobreviveram. A frase histórica de que `itemProductMirrorService.ts` e
`fixedAssetReceiptService.ts` "nenhuma auditoria examinou" também foi superada:
os dois serviços receberam cobertura integral por `RA-08`/`T-05`
(**265 linhas, 100%**, 14 regras extraídas, 13 sem BR).

**RESSALVA QUE ACOMPANHA A CORREÇÃO — 7/7 não significa profundidade
uniforme.** Levantada pelo consolidador em `AUDIT_COVERAGE_EXECUTED.md` §1.1 e
§8 (`RES-T26-05`), registrada aqui para não se perder:

- Nos findings **006, 007, 008 e 009** a reconferência foi **dirigida às
  âncoras load-bearing**, e o próprio T-00 declarou isso finding a finding.
  As âncoras **documentais** e as não-load-bearing foram **delegadas** a T-12,
  T-17, T-20 e T-23 — não reconferidas por T-00.
- **T-17 aceitou o elo 4 de T-12 como insumo, não como verificação própria**
  (declaração textual em `T-17_CONTRATO_DE_API.md`), de modo que a cadeia de
  verificação dessas âncoras é **mais rasa do que "7/7 re-ancorados" sugere**.
- Em `FIND-ERP-009`, **23 das 28 linhas da tabela do finding não foram
  reconferidas** por T-00 — delegadas a T-09.
- Re-ancoragem **não é validação de mérito**, não é remediação, não é
  `RETEST_PASSED` e não fecha nada (T-00 §6). O mérito é objeto de `T-25`.

### Remediação — triagens concluídas (SanaCore não implementou nada ainda)

- **CASE-001 (`FIND-ERP-001`)**: causa-raiz reconfirmada com evidência dinâmica
  (66/66 verdes); **constraint UNIQUE de negócio descartada com evidência**
  (quebraria transferência entre depósitos e recebimento parcial); plano por
  `operation_id` UUID + UNIQUE parcial + tabela `financial_payment_events`.
  **3 superfícies irmãs** com a mesma causa-raiz (`POST /api/products/movements`,
  `/api/mobile-inventory/scan`, `/batch`) — **não incorporadas por analogia**,
  decisão do dono.
- **CASE-002 (`FIND-ERP-005`)**: 4 falhas reconfirmadas, zero divergência.
  Falhas 2 e 4 com plano executável (blast radius **1 rota**; instrução
  explícita de **não tocar o middleware compartilhado**, cuja mudança de default
  quebraria 5 rotas de leitura em 4 módulos). Falhas 1 e 3 dependem de **3
  decisões do dono**, com desenho condicional por ramo. Regra 24 **não** enquadra
  (permissões recarregadas do banco a cada request) — registrado que isso não
  rebaixa a severidade. Lacuna declarada: reprodução dinâmica não executada
  (`psql` fora do PATH, Docker sem resposta); estática determinística nas 4
  cadeias.

> **Atualização de estado (registro, não juízo técnico):** o `CASE-002` está
> hoje em `REMEDIATION_COMPLETE` / `READY_FOR_RETEST`, `REMEDIATION_COMMIT`
> `1046e16`, com **duas pendências de ação humana** que bloqueiam o fechamento
> (DDL da migration `jur_approval_thresholds` no banco de produção; contagem de
> perfis `diretor`/`financeiro` em nível `operate` em produção) — ambas
> registradas em detalhe no `PROJECT_EVENT_LOG.md` (2026-08-14). **Nenhum
> `RETEST_PASSED` ou `FINDING CLOSED` foi declarado**; `FIND-ERP-005` permanece
> `OPEN` e o reteste é autoridade exclusiva da VeriCore (Regras 3 e 4).

### Achado material da triagem do CASE-002 — NÃO promovido

O padrão da Falha 2 (aprovação por presença de módulo, `authorizeModule`/
`authorizeAnyModule` com default `operate`, mais truthiness no controller)
**se repete idêntico nas alçadas de Compras e COMEX** —
`purchaseController.ts:54`, `purchases.ts:48`, `importProcesses.ts:34` — que são
**módulos de PRODUÇÃO**, ao contrário do `juridico`. Registrado para finding
próprio; **não promovido por analogia** (precedente `APR-2026-018`). Contexto
favorável cruzado do FIND-ERP-009: dos ~55 endpoints de ato aprovatório, **51
declaram `approve`** — o defeito está em 4 linhas / 3 pontos, não é o padrão
dominante.

## Passo 31 — estado corrente (2026-08-16)

Seção **nova**, criada pela correção de estado desta data. Todos os números
abaixo foram **relidos diretamente dos artefatos** pelo `coretriad-director`,
não copiados de contexto injetado (regra 5 do programa). Severidade, confiança
e status permanecem **autoridade VeriCore** — aqui apenas transcritos.

### Fieldwork — ENCERRADO

**27 de 27 trilhas** do plano concluídas e persistidas em
`audit/runs/ERP-LEGACY-001-AUD-001/07-findings/` (T-00 a T-24, com `T-15`
fechada por adendo e o bloqueante de `T-18` fechado pela extensão dirigida
`T-18-A`).

### `T-25` — validação adversarial em 3 rodadas

| Rodada | Escopo | Resultado |
|---|---|---|
| **Rodada 1** | 14 trilhas | 4 CRITICAL + 9 HIGH `CONFIRMED`; arbitragens registradas (inclui `AUD-SEC-T04-01`) |
| **Rodada 2** | as 13 trilhas sem refutação própria (T-01, T-03, T-05, T-07, T-09, T-10, T-11, T-13, T-19, T-20, T-21, T-22, T-23) | 32 HIGH submetidos a refutação ativa; **20 CONFIRMED, 12 `NEEDS_MORE_EVIDENCE`, 0 REFUTED, 0 FALSE_POSITIVE, 0 DUPLICATE**. Cobertura adversarial declarada completa para as 27 trilhas |
| **Rodada 3** (A/B/C — concluída em 2026-08-16) | exatamente os 12 `NEEDS_MORE_EVIDENCE` da Rodada 2 | **11 `CONFIRMED` + 1 `FALSE_POSITIVE` (`T11-F10`), 0 remanescentes em `NEEDS_MORE_EVIDENCE`** |

Detalhe da Rodada 3, por bloco, conforme os três relatórios:
- **3-A** (`T-05-02`, `T-05-05`, `T-05-06`, `T-10-02`): **4 CONFIRMED**, nenhuma
  severidade rebaixada; acolhida correção de redação em `T-05-05`.
- **3-B** (`T11-F02`, `T11-F04`, `T11-F10`, `AUD-SERVICE-3`): **3 CONFIRMED + 1
  FALSE_POSITIVE** (`T11-F10`, refutado por controle compensatório na própria
  camada); corrigida a atribuição de trilha de `AUD-SERVICE-3` (T-07, não T-16).
- **3-C** (`T13-F01`, `T13-F04`, `T19-F02`, `T23-F02`): **4 CONFIRMED**, com
  **recomendação de rebaixamento HIGH → MEDIUM** em `T13-F01` e `T13-F04`
  (acolhida pela consolidação).

**Divergência aritmética registrada, não conciliada (Regra 20):** o
`T-26_CONSOLIDACAO.md` §1.4 compõe os 41 `CONFIRMED` como
"4 + 9 (R1) + 20 (R2) + **8** (Rodadas 3-A/B/C)", enquanto a soma dos três
relatórios de Rodada 3 lidos diretamente é **11 CONFIRMED** (4 + 3 + 4). O
`coretriad-director` **não resolve** a divergência — não é sua autoridade
(Regras 5 e 20). **Escalada ao `vericore-software-audit-director`** para
determinação da fonte autoritativa antes de qualquer veredito.

### `T-26` — consolidação e cobertura executada (concluídas, 2026-08-16)

Artefatos: `07-findings/T-26_CONSOLIDACAO.md` e
`24-coverage/AUDIT_COVERAGE_EXECUTED.md` (par obrigatório).

**Placar consolidado** (transcrição — autoridade VeriCore):

| Origem / severidade | Qtd |
|---|---|
| Findings preliminares do discovery (`FIND-ERP-*`) | 7 |
| Findings emitidos pelas 27 trilhas de fieldwork | 247 |
| **Total de IDs** | **254** |
| menos 1 `FALSE_POSITIVE` (`T11-F10`) | −1 |
| **Total vigente** | **253** |
| **CRITICAL** | **6** (`FIND-ERP-001`, `FIND-ERP-005`, `AUD-AUTHN-01`, `AUD-INTEG-03`, `T08-F01`, `T24-F01`) |
| **HIGH** | **67** (4 preliminares + 63 de trilha) |
| **MEDIUM** | **118** (1 preliminar + 117 de trilha) |
| **LOW** | **57** |
| **INFO** | **5** |

Estado de validação declarado pela consolidação: **41 `CONFIRMED`**, **1
`FALSE_POSITIVE`**, **0 `NEEDS_MORE_EVIDENCE` remanescentes** da Rodada 2, **1
`NEEDS_MORE_EVIDENCE` de origem** (`FIND-ERP-007` item 3, pendência
procedimental de `APR-2026-020` B.3), e **211 `PROPOSED` sem passagem pela
Regra 22 — todos MEDIUM/LOW/INFO, que a Regra 22 não exige**. Nenhum CRITICAL
ou HIGH ficou sem tentativa de refutação registrada.

Decisões de severidade registradas pela consolidação, nunca silenciosas:
`T11-F10` → `FALSE_POSITIVE` com propagação executada; `T13-F01` e `T13-F04`
→ HIGH rebaixados a MEDIUM com custo declarado; `AUD-SEC-T04-01` → MEDIUM
elevado a HIGH (elevação já aprovada pelo dono em 2026-08-14 e formalizada por
adendo de agente VeriCore).

**Nenhum veredito foi emitido:** a consolidação declara expressamente que não
emite `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED` nem
`FINDING CLOSED`.

### Déficit de cobertura medido (o achado material de `T-26`)

Medido em `AUDIT_COVERAGE_EXECUTED.md`, com número nominal e declaração da
própria trilha em cada caso:

| Item | Medição |
|---|---|
| `DEF-01` — `juridico` D3+D4 | prometido E 75/75, executado A(38/75) ⇒ **37 endpoints** |
| `DEF-02` — `rh`+`sst` D3+D4 | prometido E 132/132, executado A(~24/132) ⇒ **108 endpoints** |
| `DEF-03` — `rfq` D3+D4 | prometido E 7/7, executado parcial ⇒ **≈5 endpoints + tabelas de preço** |
| **Soma dos déficits de W2 em D3/D4** | **≈150 endpoints**, todos em categorias que G3 veda amostrar |
| 43 endpoints rasos do tier 3 | **70 das 137 células elevadas pela EMENDA-02 NÃO executadas** — a maior divergência planejado × executado da run |
| `client/` | **126 páginas não amostradas** (executado A(41/167)) |
| `mobile/` e `tv/` | **não explorados nem estruturalmente** |
| Schema | **185 de 207 tabelas sem semântica de coluna** (executado A(22/207)) |
| Agregado | das 137 células elevadas, **≈81 não entregues como `E`** |

Divergências escaladas ao `vericore-software-audit-director` e ainda abertas:
`DIV-SEV-01` (`T17-F05` MEDIUM × `T23-F03` HIGH sobre o mesmo fato) e
`INV-01` × `INV-02` (673 × 676 endpoints alcançáveis — irreconciliáveis sem
uma decisão de definição do que conta como endpoint).

### Decisões humanas de 2026-08-16 (`APR-2026-024`)

1. **Opção A no déficit do G3** — estender a auditoria agora e fechar os ≈150
   endpoints de `DEF-01`/`DEF-02`/`DEF-03`; **Opção B recusada**. Quatro
   trilhas complementares despachadas (`T-27_DEF-01_JURIDICO_D3D4`,
   `T-27_DEF-02A_RH_D3D4`, `T-27_DEF-02B_SST_D3D4`,
   `T-27_DEF-03_RFQ_PRECOS_D3D4`). **Ressalva vinculante:** fechar os ≈150 não
   autoriza declarar o G3 integralmente cumprido — as 70 células, as 126
   páginas, `mobile/`, `tv/` e as 185 tabelas **permanecem decisão aberta do
   dono**.
2. **Promoção do achado `js-yaml` HIGH (`CVE-2026-59870`) a finding formal**,
   com prioridade para a SanaCore avaliar a atualização da dependência,
   **independentemente da decisão sobre o G3**. Trilha despachada:
   `vericore-dependency-security-auditor` → `07-findings/AUD-DEP-JSYAML-01.md`.
   **Condição da Regra 22: sendo HIGH, o finding precisa passar pelo
   `finding-validator` antes de seguir à remediação — e isso ainda NÃO
   ocorreu.**
3. **Recriação do banco `erp_evok_audio_test` do zero**, isolado de qualquer
   branch SanaCore não mesclada, com confirmação de integridade, antes de
   qualquer trilha que dependa de teste dinâmico (G4). Trilha despachada:
   agente `docker` → `G4_PRECONDICAO_BANCO_TESTE.md`. **Resolve a pendência
   (b)** da bateria dinâmica 01; **as pendências (a)** (prova literal de
   escrita em `audit_logs` por exceção nomeada) **e (c)** (bateria dinâmica 02
   com o servidor no ar) **permanecem ABERTAS**.

**Estado de verificação em disco no momento deste registro:** os artefatos
`AUD-DEP-JSYAML-01.md` e `G4_PRECONDICAO_BANCO_TESTE.md`, bem como os quatro
relatórios `T-27_DEF-*`, **ainda não existem no repositório** (verificado por
Glob nesta sessão). As trilhas foram **despachadas**, não concluídas — o
registro acima é de decisão e despacho, jamais de resultado.

## Correções de registro aplicadas em 2026-08-16

Registradas por adição, no padrão já usado neste arquivo; **nenhum texto
histórico foi apagado** (Regra 15), e cada correção nomeia a fonte relida
(Regra 7 — o artefato versionado vence).

- **Correção C-01 — `OBS-INV-01`, placar de re-ancoragem.** Dizia "1 de 7";
  o executado é **7/7 `ÂNCORAS_VÁLIDAS`**. Detalhe e ressalvas na própria
  seção `OBS-INV-01` acima. Fontes: `T-00_REANCHORING_REPORT.md` §0;
  `AUDIT_COVERAGE_EXECUTED.md` §1.1 (que escalou a correção ao director por
  não poder escrever em `coretriad/` — Regra 16).
- **Correção C-02 — campo "Estado atual" e linha do passo 31.** Descreviam a
  run como "fase de escopo/plano, fieldwork bloqueado até gate humano do
  plano". Isso deixou de ser verdade: o fieldwork foi liberado
  (`APR-2026-023` Parte C, G11 opção (c), e liberações subsequentes) e está
  **encerrado com 27/27 trilhas**; `T-25` teve 3 rodadas e `T-26` está
  concluída. Os textos anteriores permanecem visíveis no próprio campo e no
  parágrafo de abertura da seção "Passo 31 — auditoria 360° e remediação
  preliminar", marcados como superados.
- **O que estas correções NÃO fazem:** não emitem juízo de auditoria, não
  alteram severidade, confiança ou status de nenhum finding, não fecham
  finding e não declaram veredito. O `coretriad-director` registra estado
  (Regra 5).

## Incidentes de processo registrados (transparência)

Registrados aqui porque **são exatamente o tipo de comportamento que o modelo
de segregação do CoreTriad existe para tornar visível** (Regras 14 e 19 do
`CLAUDE.md`):

1. **Sobrescrita acidental e restauração de `FIND-ERP-002.md`
   (2026-08-13).** Durante a validação do `FIND-ERP-002`, o agente
   `vericore-finding-validator`, ao **sondar se tinha permissão de escrita**,
   sobrescreveu o arquivo do finding com **texto de teste**, e em seguida o
   **restaurou integralmente**. **Nenhuma perda de conteúdo permaneceu.** O
   incidente fica registrado por transparência de processo, não por dano
   consumado.
2. **O hook de segregação funcionou (2026-08-13).** O hook bloqueia
   corretamente escrita de agentes VeriCore fora de `audit/`. Isso obrigou o
   `coretriad-director` (orquestrador) a **persistir manualmente** as seções
   de validação nos arquivos de finding, a partir do texto relatado pelo
   agente — mesmo padrão de ressalva de transparência já aplicado nos passos
   23 e 24. O conteúdo técnico permanece atribuído ao VeriCore; o
   `coretriad-director` não emitiu juízo de auditoria, não alterou severidade
   e não fechou finding (Regras 2, 4 e 5 do `CLAUDE.md`).
3. **Commit reportado a partir de contexto injetado desatualizado
   (2026-08-13) — `FIND-ERP-009`.** O agente que produziu o `FIND-ERP-009`
   relatou o HEAD do repositório como **`65bd66d`**, número que veio de
   **contexto injetado desatualizado**, não de leitura direta. O **HEAD real,
   verificado por leitura direta nesta sessão, é `1979beb`**
   (`1979beb1fd0edc167f5d6460dec68d674ce4772c`, em `.git/refs/heads/main`), e
   a tag `legacy-baseline-001` aponta para
   `c9359be399c45191fe90e8e9707803125a5ba91d` (`c9359be`). **Corrigido por
   nota no próprio finding** (`FIND-ERP-009.md`, linhas 332-333). É a **mesma
   classe de achado de calibração já registrada no passo 23**
   (`LEGACY_SYSTEM_INVENTORY.md`), o que a torna **recorrente, não isolada**.

   **Regra reforçada por este incidente, válida para todo agente do programa,
   em qualquer passo:** *nenhum agente deve citar número de commit, tag,
   contagem, versão ou qualquer identificador vindo de contexto injetado sem
   releitura direta da fonte.* Contexto injetado é conveniência, não
   evidência (Regras 8 e 19 do `CLAUDE.md`).
4. **Quarta ocorrência da mesma classe, em sentido inverso (2026-08-16) —
   registro deste arquivo.** O próprio `PROJECT_STATE.md` passou a divergir
   materialmente da evidência versionada em dois pontos (re-ancoragem 1/7 ×
   7/7; passo 31 "fieldwork bloqueado" × fieldwork encerrado). A divergência
   foi detectada **por um agente VeriCore lendo o Control Plane**
   (`AUDIT_COVERAGE_EXECUTED.md` §1.1) e escalada ao director em vez de
   corrigida por quem a encontrou — comportamento correto (Regra 16).
   **Lição registrada: artefato de Control Plane também envelhece, e
   envelhecer sem correção é, na prática, alimentar contexto injetado
   desatualizado para toda a organização.**

## Regras do programa que valem do passo 21 ao 40 (sem exceção)

1. Não refatorar, não corrigir, não excluir código, não alterar banco nem
   arquitetura durante o discovery (passos 21-30) — é levantamento, não
   remediação. **Vale inclusive para os sete findings confirmados: finding
   confirmado no discovery não autoriza remediação; remediação é trabalho de
   SanaCore, sob encaminhamento do Control Plane.**
2. Não presumir que a documentação existente do próprio ERP está correta —
   inclusive qualquer SSOT do sistema (ex.: `docs/project-memory/product/
   ERP_SSOT.md`) é objeto de auditoria, não fonte de verdade, até validada
   contra código e evidência.
3. Nada vira regra de negócio oficial sem validação humana — comportamento
   descoberto no código entra como `DISCOVERED_BUSINESS_BEHAVIOR`, nunca
   como BR, até o dono confirmar. **As ~130 regras candidatas do passo 26
   estão exatamente nesse estado.**
4. Regra 24 do `CLAUDE.md` (papel/permissão declarado sem verificação
   server-side = CRITICAL bloqueante) vale integralmente aqui — nunca
   `RISK_ACCEPTED` em produção.
5. **Nenhum número (commit, tag, contagem, versão) pode ser citado a partir
   de contexto injetado sem releitura direta da fonte** — regra reforçada
   pelo incidente 3 acima e reafirmada pelo incidente 4.

## Pendências fora deste projeto (não bloqueantes)

- **Delta audit do `SIM-002`** (`OBS-SIM-002-009`, `OBS-SIM-002-010`,
  mencionados em `HANDOFF_2026-08-13.md`): **em espera por decisão do dono
  (2026-08-13, `APR-2026-017` decisão C)**. Explicitamente **não bloqueia** o
  `ERP-LEGACY-001`.

## Decisões do dono ainda ABERTAS (não antecipadas pelo `coretriad-director`)

1. **Segunda leva do déficit de cobertura do G3** — 70 células do tier 3
   raso, 126 páginas do `client/`, `mobile/`, `tv/`, 185 de 207 tabelas sem
   semântica de coluna. `APR-2026-024` **não** as cobre.
2. **Pendência (a) da bateria dinâmica 01** — prova literal de escrita em
   `audit_logs` por exceção nomeada e controlada ao veto de escrita em banco.
3. **Pendência (c) da bateria dinâmica 01** — bateria dinâmica 02 com o
   servidor de fato no ar.
4. **As duas pendências humanas do `CASE-002`** — DDL da migration
   `jur_approval_thresholds` em `erp_evok_audio` (banco PRODUÇÃO REAL) e
   levantamento em produção dos perfis `diretor`/`financeiro` em nível
   `operate`.
5. **Atribuição incremental de OWNER por área** no `BR_CATALOG.md` — 100% das
   linhas seguem `PENDENTE — decisão humana`; **vedado a agente decidir ou
   inferir** (`APR-2026-019` parte 2, reafirmada em `APR-2026-020` e
   `APR-2026-021` Parte E).
6. **Etapa 3 da chave de idempotência** (`APR-2026-023` Parte A) — gate humano
   obrigatório entre as etapas 2 e 3, ainda não dado.
7. **`FIND-ERP-007` item 3** — pendência procedimental da `APR-2026-020` B.3
   (retorno ao autor de origem) não verificada.

## Notas de governança

- Este registro é feito exclusivamente pelo `coretriad-director`, que não
  implementa, não audita, não corrige e não toca `src/`/`product/`/`tests/`
  (Regra 5 do `CLAUDE.md`) — este arquivo é registro de Control Plane, não
  decisão técnica. A severidade, a confiança e o status de todos os findings
  citados são **autoridade VeriCore**, apenas transcritos aqui.
- Nenhum teste, script de diagnóstico ou comando de banco foi executado para
  produzir este registro. As verificações da atualização de 2026-08-16 foram
  exclusivamente leitura de arquivo (`T-00_REANCHORING_REPORT.md`,
  `T-26_CONSOLIDACAO.md`, `AUDIT_COVERAGE_EXECUTED.md`, os três relatórios de
  `T-25` Rodada 3, `DYN_VERIFICACAO_BATERIA_01.md`, `APPROVALS.md` e o
  `PROJECT_EVENT_LOG.md`) e uma listagem por Glob.
- **Pendência de governança RESOLVIDA (correção de registro anterior):** este
  arquivo afirmava, em versões anteriores, que a autorização humana dos
  passos 25-30 e da promoção dos dois primeiros findings **ainda não tinha
  entrada numerada** em `coretriad/governance/APPROVALS.md` (Regra 17). Essa
  afirmação **deixou de ser verdadeira**: `APR-2026-017` existe e cobre as
  quatro decisões (a)-(d), com nota própria de que foi criada retroativamente
  na mesma sessão. Os campos e seções que ainda declaravam a pendência foram
  corrigidos naquela atualização, sob Regra 20 (divergência entre documento e
  evidência resolvida em favor do artefato versionado — Regra 7). **Nenhuma
  evidência histórica foi apagada**: o histórico da pendência permanece
  íntegro no `PROJECT_EVENT_LOG.md` e na nota de registro do próprio
  `APR-2026-017`.
- **Precedente que continua valendo:** promover finding formal fora da
  sequência do passo 31 é **exceção autorizada caso a caso pelo dono**, não
  regra nova do programa. `APR-2026-018` é explícita: os demais candidatos do
  passo 26 (scan mobile, ICMS/IPI, desconto perdido no faturamento,
  `effectiveness_result` inescrevível, permissão `V` inexistente, CNAB órfão,
  divergência MRP × OP na explosão de BOM) **seguem o fluxo normal** e **não
  podem ser promovidos por analogia**. `APR-2026-024` Decisão B reafirma o
  precedente: a promoção do `js-yaml` vale só para ele.
- **Passo 30 CONCLUÍDO (2026-08-14) — a fase de discovery (passos 25-30)
  terminou e a skill `coretriad-legacy-discovery` está ENCERRADA.** Execução:
  3 trilhas OpusCore de teste + 1 de infraestrutura; 9 arquivos em
  `server/tests/characterization/`; 66/66 verdes contra `erp_evok_audio_test`
  (guard do runner recusa banco sem sufixo de teste — `APR-2026-016`
  respeitada; o banco real não recebeu conexão). Consolidação:
  `docs/coretriad/projects/ERP-LEGACY-001/discovery/CHARACTERIZATION_TESTS.md`.
  A 1ª execução refutou empiricamente uma premissa de leitura estática
  (cancelamento de NF-e reverte `invoiced → confirmed` desde a correção D-M) —
  divergência registrada no §5 do artefato, corrigida no teste, nunca em
  `src/`.
- **O risco conhecido do passo 29 se confirmou:** a matriz nasceu quebrada na
  origem (ausência de BR-ID canônico e de OWNER em ~167 regras; 90 RFs sem AC/TC).
  **Atualização 2026-08-14 — a parte do BR-ID foi RESOLVIDA por decisão do
  dono (`APR-2026-019`):** o esquema canônico foi adotado como convenção
  técnica — os IDs provisórios do passo 26 (`BR-<ÁREA>-NNN`) foram promovidos
  a canônicos **sem renumeração**, materializados em
  `docs/coretriad/projects/ERP-LEGACY-001/BR_CATALOG.md`. **A parte do OWNER
  segue PENDENTE por decisão explícita do dono:** nenhum OWNER foi atribuído
  em lote; a atribuição por área será feita aos poucos, pelo dono, com os
  responsáveis reais de cada área da empresa — **é vedado a agente decidir ou
  inferir OWNER** (tabela de atribuição no próprio `BR_CATALOG.md`, 100%
  `PENDENTE — decisão humana`).

## Classe de risco de governança RC-PROC-01 (aberta em 2026-08-16)

A seção "Incidentes de processo registrados" acima (`:888-935`) permanece
**íntegra e inalterada**. Esta seção é **adição**: eleva o padrão transversal
por trás daqueles incidentes a item de governança formal, por decisão humana
explícita do dono (Regra 18).

**Artefato:** `coretriad/governance/RISK_CLASS-RC-PROC-01_CONTENCAO_POR_DISCIPLINA.md`.
**Classe:** restrição categórica cuja contenção dependeu da disciplina do
agente, não de controle técnico — evidência empírica de que a **Regra 23** do
`CLAUDE.md` não estava satisfeita para as restrições inventariadas.
**Status:** ABERTA. **Encerramento:** decisão do dono sobre evidência VeriCore
(Regra 4); **o `coretriad-director` não fecha esta classe.**

**Pertencem à classe** os incidentes **1, 3, 4** da lista acima e o **5º**
(`AUD-PROC-CUSTODIA-01`). **O incidente 2 NÃO pertence** — é registro de
mecanismo funcionando corretamente, e sua presença na mesma lista é
precisamente o hábito que esta classe corrige: "o controle funcionou" e "o
agente se comportou" não são a mesma coisa.

**Divergência de contagem registrada, não conciliada (Regra 20):** "5º
incidente" é ordinal de lista (correto); em desvios efetivos é o 4º. "2º contido
apenas por disciplina" vale sob critério estrito; sob o critério literal da
classe são 4 de 5.

**Vetores ainda sem controle técnico, verificados em disco em 2026-08-16:**
escrita de agente VeriCore sobre artefato de finding em `docs/` (`ORG_RULES` da
`vericore` em `org-isolation.js:31-39` não lista `docs/`); citação de número
vindo de contexto injetado (não imponível por hook, por natureza); Control Plane
envelhecido sem gatilho de reconciliação. Controle **criado** para o vetor de
banco de produção via shell (`org-isolation.js:100-152,188-200`).

**Correção de registro:** o guard citado em `APPROVALS.md:787` **existe** —
`server/scripts/run-api-suite.cjs:517-536` — e a afirmação da aprovação é
verdadeira no escopo da fila DYN executada pela suíte. O que não existia era
controle para `docker exec … psql`.

Esta atualização não emite juízo de auditoria, não altera severidade, confiança
ou status de finding, não fecha finding e não declara veredito (Regra 5).

### Nota de correção factual do orquestrador (posterior ao registro do director)

O registro acima diz que a eficácia do controle criado em D-1 "é objeto de
reteste da VeriCore, não declarada aqui" e lista D-2/D-4 como não concluídos.
Isso era verdade quando o director leu o disco; deixou de ser em seguida.
Corrigido por adição, sem alterar o texto original (Regra 15):

- **D-2 (documentação) CONCLUÍDO.** Seis arquivos de `docs/` passaram a citar
  `APR-2026-016`/`AUD-PROC-CUSTODIA-01`; `03-MODELO_FISICO.md` migrou para
  `erp_evok_audio_test`. O agente varreu `docs/` inteiro e tratou **7**
  arquivos, não os 2 nomeados, mantendo ~40 menções narrativas intactas por
  Regra 15.
- **D-4 (validação) CONCLUÍDO, com 8/8 PASS.**
  `docs/coretriad/planning/SEGREGATION_TEST_REPORT_2026-08-16.md`. As quatro
  fronteiras organizacionais originais seguem impostas por hook (não houve
  regressão), a nova guarda de banco bloqueia em subagente **e na sessão
  principal**, e os controles negativos (`_test`, `_ci`, `postgres`) passam —
  provando discriminação, não bloqueio indiscriminado. Hook validado:
  `7eb8316d2936a40e86d37a54158ff15bf9050be1`.

**Limites da eficácia demonstrada**, para que o `PASS` não seja lido como
cobertura maior do que é: a guarda é **sintática sobre a string do comando** —
não cobre `PGDATABASE` exportado em chamada anterior, indireção por script
(`bash deploy.sh`, `npm run <script>`), ofuscação trivial, nem conexão por
código executado. E `evok_admin` segue superusuária sobre os dois bancos; o
controle complementar é a role `evok_audit`, sem `CONNECT` em produção.
