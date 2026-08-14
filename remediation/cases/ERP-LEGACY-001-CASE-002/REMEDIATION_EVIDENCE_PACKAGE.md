# REMEDIATION_EVIDENCE_PACKAGE  (SanaCore → VeriCore)

CASE_ID: ERP-LEGACY-001-CASE-002
FINDING_ID: FIND-ERP-005
PROJECT_ID: ERP-LEGACY-001
PRODUZIDO_POR: sanacore-remediation-evidence
DATA: 2026-08-14
WORKTREE: `sana/ERP-LEGACY-001/FIND-ERP-005` (`C:/Sistema EvokAudio/ERP-Evok-sana-FIND-ERP-005`)
FINDING_FONTE: `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-005.md` (não editado por este agente)
TRIAGE_FONTE: `remediation/cases/ERP-LEGACY-001-CASE-002/TRIAGE.md` (não editada por este agente)

> **Aviso de governança (leia antes do resto do pacote).** Este pacote
> reporta o estado real, incluindo duas lacunas que, na avaliação deste
> agente, impedem hoje uma declaração honesta de "pronto para PASS": (1) a
> suíte de integração HTTP — a única evidência dinâmica prevista para
> R1(b)(c)/R2/R3/R4 — falha 14/14 testes por um defeito de fixture (não do
> produto); (2) `APR-2026-021`, citada como autorização das decisões (a)/(b)/
> (c) em código, testes e documentação, **não está registrada** em
> `coretriad/governance/APPROVALS.md`. Ver §4 e §7. SanaCore não decide o que
> fazer com isso (Regras 3/4/6) — apenas registra e devolve.

---

## 1. ROOT_CAUSE

Confirmada, não hipótese (reconfirmada nesta sessão por leitura do HEAD e
pela suíte unitária determinística de 46 casos, sem depender de memória):

> O controle de alçada do Jurídico foi implementado como **"registro de um
> ato de aprovação"**, não como **"invariante do contrato"**. O sistema
> perguntava *"existe uma linha em `jur_contract_approvals` com este
> papel?"* em vez de *"este valor está coberto por aprovações válidas, dadas
> por pessoas distintas com poder de aprovar, sob a política vigente?"*.

Quatro dimensões da mesma pergunta mal formulada, cada uma uma falha
independente e suficiente para contornar o controle:

| Dimensão | Falha | Causa pontual |
|---|---|---|
| Parâmetro (qual o limiar?) | Falha 1 | `constants.ts:23,26` — dois literais, contrariando `BLOCO_3_JUR_API.md` §2.7 |
| Poder (quem pode aprovar?) | Falha 2 | `juridico.ts:71` sem `requiredLevel` → default `'operate'` + truthiness em `contractController.ts:52-53` |
| Vínculo (aprovou o quê?) | Falha 3 | `CreateContractAddendumUseCase.ts:61` não condicionava a `change_type` nem reabria alçada |
| Identidade (aprovou quem?) | Falha 4 | `ApproveContractUseCase.ts:85-88` dedup por PAPEL; `admin` recebia os dois papéis (`contractController.ts:50`) |

Agravante transversal: `ActivateContractUseCase` aceitava `approvalRepository`
opcional — gate pulado em silêncio (fail-open) quando a dependência faltava.

## 2. LOCAL_FIX (o que foi implementado, commit a commit)

Trabalho realizado majoritariamente **antes** desta sessão de empacotamento
(commit `67b49fb`, preservado pelo orquestrador após interrupção de sessão) e
completado pelos 5 commits locais não enviados ainda ao GitHub:

| Commit | Conteúdo |
|---|---|
| `67b49fb` (preservação) | Código das 4 falhas: migration `jur_approval_thresholds`+histórico, models, `approvalPolicy.ts`, ajustes em `ActivateContractUseCase`/`ApproveContractUseCase`/`CreateContractAddendumUseCase`, endpoints `GET`/`PUT /settings/approval-thresholds`, extensão de `segregationOfDuties.ts` |
| `cd6f45b` | Ajuste de construtores em `juridico-contract-use-cases.test.ts` (31/31 verdes; nenhuma asserção alterada — ver §5.3) |
| `afde1d0` | Suíte de regressão nova: 46 testes unitários (`juridico-contract-authority-find-erp-005.test.ts`) + suíte de integração HTTP (`jur-contract-authority-find-erp-005.test.ts`, 24 casos); `contractController` ganha export `__test__` para exercitar vetores adversariais de R2(e) |
| `8a2c5e3` | `purchase-segregation-of-duties.test.ts` atualizado para o 5º ponto de `SEGREGATION_RULES` (`D-K-JURIDICO`) |
| `33b8633` | Cliente: remove terceira cópia dos limiares de alçada; UI passa a usar `required_roles` de `GET /contracts/:id/approvals` |
| `54572b7` | `BLOCO_3_JUR_API.md` §2/§2.5/§2.7 reescritos para descrever o mecanismo real; contradição §214×§233 eliminada |

### Falha 1 — tabela configurável (Ramo A1 da TRIAGE §7.1)
`jur_approval_thresholds` + `jur_approval_threshold_history` (migration
`20260814-000048-jur-approval-thresholds-and-authority-find-erp-005.cjs`);
`approvalPolicy.ts` interpreta a política (comparação, precedência por
`contract_type`, vigência, **fail-closed** quando a política está vazia ou o
repositório ausente); seed reproduz os valores atuais (50k/300k) para
`contract_type='*'`; `jur_contracts.approval_policy_snapshot` registra a
política vigente no instante da ativação (R1d); endpoints
`GET`/`PUT /api/jur/settings/approval-thresholds`, `PUT` exige `approve`.

### Falha 2 — nível `approve` + fail-closed
`requiredLevel: 'approve'` nos dois candidatos de `juridico.ts:71`;
comparação estrita `=== 'approve'` em `resolveAvailableApproverRoles`
(exportado como `__test__` para os vetores adversariais); `approvalRepository`
e `thresholdRepository` tornados **obrigatórios** no construtor de
`ActivateContractUseCase` (fecha o fail-open agravante, R5).

### Falha 3 — reabertura de alçada
`new_value` só é aplicado com `change_type === 'value'` (fecha a variante
cruzada); elevação de faixa **invalida** as aprovações incompatíveis (mantém
histórico) e devolve o contrato a `in_approval`; elevar valor sem nível
`approve` no módulo é rejeitado (`APR-2026-021 B.4`, decisão B1 da TRIAGE
§7.2); redução de valor não exige `approve`.

### Falha 4 — segregação D-K estendida ao Jurídico
Nova regra `D-K-JURIDICO` em `shared/domain/segregationOfDuties.ts`
(`assertApproverIsNotPriorApprover`, reaproveitando `isSelfApproval`);
`admin` não isenta; **e** — além do mínimo do plano executável da TRIAGE §6.2
(que previa apenas F4-A, independente de decisão) — a decisão (c) da TRIAGE
§8.3 foi respondida **C1** (estender a criador/`created_by`), com R4(d)
implementado.

## 3. SYSTEMIC_FIX_REQUIRED / BLAST_RADIUS

Herdado da TRIAGE §3, reconfirmado, **não ampliado por este agente** (fora do
escopo deste caso, por decisão explícita da triagem):

- `purchases.ts:48` (`POST /api/purchases/:id/approve`) e
  `importProcesses.ts:34` (COMEX) replicam a mesma truthiness de papel que a
  Falha 2 corrigiu no Jurídico — **módulos de PRODUÇÃO**, fora de escopo
  deste caso. Encaminhamento já registrado na TRIAGE §3.2; reafirmado aqui
  para que a VeriCore não assuma cobertura inexistente.
- `authorizeAnyModule.ts` **não foi tocado** (instrução expressa da TRIAGE
  §3.1, para não quebrar as 5 rotas de leitura que dependem do default
  `'operate'`) — verificado: `git diff` confirma zero alterações no arquivo.

## 4. LACUNA DE GOVERNANÇA — `APR-2026-021` não registrada (achado desta sessão)

Código (`ApproveContractUseCase.ts`, `CreateContractAddendumUseCase.ts`,
`segregationOfDuties.ts`), testes (`juridico-contract-authority-find-erp-005.
test.ts`, `jur-contract-authority-find-erp-005.test.ts`,
`purchase-segregation-of-duties.test.ts`) e documentação
(`BLOCO_3_JUR_API.md`) citam **`APR-2026-021`** (Partes B/C/D) como a
autorização humana das 3 decisões da TRIAGE §8 — Ramo A1 (tabela
configurável), Ramo B1 (aditivo exige `approve` para efetivar elevação) e C1
(estender D-K ao `created_by`).

**Verificado nesta sessão:** `grep -n "APR-2026-0" coretriad/governance/
APPROVALS.md` não retorna nenhuma entrada `APR-2026-021`. A última entrada
registrada é `APR-2026-020` (`:528`). Não existe outro arquivo de aprovações
no repositório (`find . -iname APPROVALS.md` → um único arquivo).

Isso é uma divergência entre código/teste/documentação e o único artefato
canônico de decisão humana (Regra 21 do `CLAUDE.md`: "Quando houver
contradição entre memória, documento, código e evidência, interrompa a
decisão e determine a fonte autoritativa"; Regra 17/18: aprovações só valem
registradas, nunca por inferência). **SanaCore não pode e não deve inferir
se a decisão foi de fato tomada** — só registra a divergência. Se
`APR-2026-021` existiu como decisão humana real (em sessão, fora do
artefato), falta apenas o registro formal; se não existiu, as Falhas 1 e 3
foram implementadas **sem** a autorização que a TRIAGE exigia antes de
iniciar (§8, "enquanto não houver registro, as Falhas 1 e 3 ficam paradas").
Este pacote não determina qual dos dois casos é o real — isso é decisão do
`coretriad-director`/dono, não da SanaCore.

## 5. TESTES EXECUTADOS E RESULTADOS (evidência real desta sessão, não hipótese)

### 5.1 Unitários — alvo (FIND-ERP-005 + não-regressão direta)

```
npx jest --runInBand tests/unit/juridico-contract-authority-find-erp-005.test.ts \
  tests/unit/juridico-contract-use-cases.test.ts \
  tests/unit/purchase-segregation-of-duties.test.ts
```
**Resultado: 3 suítes, 95/95 testes PASSED.** (Confirma o número já
reportado pelo orquestrador antes deste agente; reexecutado de forma
independente, mesmo resultado.)

Cobertura declarada no cabeçalho do próprio arquivo de teste, verificada
linha a linha contra o RETEST_SPECIFICATION do finding:
R1(a)-(d), R2(e), R3(a)-(c)(e), R4(a)-(d), R5(a)(b) — **todos os itens
"depende de decisão? não" e também os dependentes de (a)/(b)/(c), já que as
decisões foram implementadas** (ver ressalva §4 sobre o registro formal
dessas decisões).

### 5.2 Unitários — suíte completa do server

```
npx jest --runInBand tests/unit
```
**Resultado: 176 suítes passed, 2 failed; 1996/1998 testes passed.**

As 2 falhas (`tests/unit/onda3-shipping-cockpit-cashflow.test.ts` e
`tests/unit/docs-path-reference-guard.test.ts`) são **pré-existentes e
não relacionadas** a `juridico`/FIND-ERP-005 — confirmado por leitura: nenhum
dos dois arquivos referencia `juridico`/`jur_`/`JurContract`; o commit
`8a2c5e3` já registrava esse mesmo par de falhas como idêntico ao HEAD do
`main` (`8b572c8`) antes de qualquer alteração desta remediação. Este agente
não alterou nenhum dos dois arquivos e não investiga sua causa raiz (fora do
escopo deste caso).

### 5.3 Não-regressão em `juridico-contract-use-cases.test.ts:174-333` (R6c)

Verificado por `git diff cd6f45b~1 cd6f45b -- server/tests/unit/juridico-
contract-use-cases.test.ts`: as únicas mudanças na faixa são a injeção de
`makeApprovalRepository()`/`makeThresholdRepository()` nos construtores.
**Nenhuma linha de `expect(...)` foi alterada.** `makeThresholdRepository()`
reproduz exatamente o seed das 3 faixas (0-50k / 50k-300k / 300k+) para
preservar o comportamento observável. R6(c) satisfeito.

### 5.4 Integração HTTP — `npm run test:integration` (suíte completa)

**Pré-requisito verificado antes de qualquer execução:** `server/.env.test`
confere `DB_NAME=erp_evok_audio_test` (sufixo `_test`, guardado por
`scripts/run-api-suite.cjs`). Nenhuma conexão foi aberta contra
`erp_evok_audio` (produção/dev real, linha vermelha `APR-2026-016`).

Diferente da lacuna L-T1 declarada pela TRIAGE (Docker não respondia na
sessão da triagem), **nesta sessão a infraestrutura respondeu** e a suíte
completa rodou:

```
Test Suites: 5 failed, 55 passed, 60 total
Tests:       24 failed, 243 passed, 267 total
```

**Achado crítico desta seção — a suíte-alvo do caso falhou por completo:**

`tests/integration/jur-contract-authority-find-erp-005.test.ts` —
**14 testes, 14 falhas**, todas no mesmo ponto: o helper de fixture
compartilhado `createActivatableContract` (linha 103) envia
`{ signatory_type: party, ... }` para `POST /contracts/:id/signatories`, mas
o use case (`AddContractSignatoryUseCase.ts:26`) e a própria documentação do
endpoint (`BLOCO_3_JUR_API.md` §2.3, `:328`) exigem o campo `party_type`.
Confirmado por leitura do código (`party_type` é anterior a esta
remediação — `git log` mostra a última mudança no arquivo em
`0d97b12`, muito antes de FIND-ERP-005) e por leitura do próprio use case
(`if (!input.party_type || !input.name) throw new ValidationError(...)`):
**é um defeito de nomenclatura no arquivo de teste** (`signatory_type` em
vez de `party_type`), não um defeito do código de produção corrigido por
este caso. Toda requisição de criação de signatário retorna `400`, o helper
nunca chega a criar um contrato ativável, e **nenhum dos 24 casos**
desenhados para R1(b)(c)/R2(a)-(d)/R3(a)(b)(c)(e)/R4(a)-(d) chegou a
exercitar o comportamento real do sistema.

**Consequência declarada, sem maquiagem:** a única evidência dinâmica HTTP
prevista pelo RETEST_SPECIFICATION para as Falhas 2, 3 e 4 (que o próprio
finding registra como "invisíveis a teste que instancie o use case
diretamente") **não existe hoje, de fato**, apesar de o arquivo de teste
estar versionado e ser estruturalmente completo. A cobertura R2/R3/R4 desta
remediação está demonstrada apenas por: (i) leitura estática do código
(idêntica ao método usado pela TRIAGE, não é prova dinâmica), e (ii) os 46
testes unitários de `juridico-contract-authority-find-erp-005.test.ts`, que
o próprio cabeçalho do arquivo declara não substituírem a prova HTTP para
R2/R4 (linhas 8-13 do arquivo). Este pacote **não afirma R2/R3/R4 provados
dinamicamente** — reporta a lacuna para a VeriCore decidir se aceita a
evidência estática+unitária ou exige a correção do fixture antes do reteste.

**Correção do fixture não realizada por este agente.** É alteração em
`server/tests/**`, fora do meu escopo de escrita (hook bloqueia SanaCore de
editar código do produto/testes fora de triagem; este agente é o
empacotador de evidência, não o engenheiro). Fica registrada como item
pendente para o `sanacore-remediation-engineer` ou para decisão do
`coretriad-director` sobre como prosseguir.

**Demais falhas da suíte de integração, verificadas uma a uma quanto a
relação com este caso:**

| Suíte | Falhas | Relação com FIND-ERP-005 |
|---|---|---|
| `cross-database-drift-guard.test.ts` | 1 | **Causada por esta remediação.** A nova migration (`20260814-000048`) foi aplicada apenas no banco de teste (`erp_evok_audio_test`, por restrição de segurança desta sessão — nunca tocar `erp_evok_audio`). O guard compara os dois bancos e acusa 40 divergências, todas as 4 tabelas/índices/constraints novos do caso. Esperado até que alguém aplique a migration no banco de desenvolvimento antes do merge — **não é regressão de comportamento**, é passo de implantação pendente. |
| `docs-reality-drift-guard.test.ts` | 1 | **Causada por esta remediação.** `docs/project-memory/product/ERP_SSOT.md` e `docs/database/00-INDICE.md` declaram 169 migrations; `SequelizeMeta`/disco têm **170** (confirmado por `ls server/migrations \| wc -l` = 170) — a nova migration deste caso não foi refletida nos dois pontos canônicos. **Item de documentação pendente, não corrigido por este agente** (fora do escopo declarado: a TRIAGE só pediu atualização de `BLOCO_3_JUR_API.md`). |
| `bom-tipo-nao-produtivo.test.ts` | 5 | **Não relacionada.** Zero referências a `juridico`/`jur_`/`JurContract` no arquivo. Falhas são timeout e `NaN` em `product_id` — parecem depender de seed/fixture do módulo de Compras/BOM, não tocado por este caso. Não foi possível confirmar se é pré-existente no `main` sem rodar a suíte lá, o que está fora do escopo autorizado desta sessão (não tocar o repositório principal). |
| `traceability-and-audit-log-regression.test.ts` | 1 | **Não relacionada.** Zero referências a `juridico`/`jur_`. Depende de `TEST_SUPPLIER_ID`/`TEST_PRODUCT_ID` (variáveis de ambiente/seed) e expira por timeout. Mesma ressalva de não confirmação contra o `main`. |

### 5.5 Typecheck

`npx tsc --noEmit` (server) e `npx tsc -b` (client): **ambos limpos, exit
0.** Confirma o que o commit `33b8633` já reportava para o client.

### 5.6 Levantamento pedido pela TRIAGE §3.3 — perfis `diretor`/`financeiro:'operate'`

Consulta somente-leitura executada **exclusivamente contra
`erp_evok_audio_test`** (script descartável, apagado ao final; DB_NAME
verificado por guarda de sufixo antes de qualquer query):

```sql
SELECT ... FROM access_profile_permissions app
JOIN access_profiles ap ON ap.id = app.access_profile_id
WHERE app.module IN ('diretor','financeiro') AND app.level='operate'
```

**Resultado: 0 perfis** no banco de teste. **Isto não responde pela TRIAGE
§3.3**, que pede a contagem no **banco de produção real** — fora do alcance
desta sessão (linha vermelha `APR-2026-016`, nunca conectado). Fica
registrado como pendência explícita: **o dono precisa rodar a mesma consulta
contra `erp_evok_audio` antes de promover este módulo, ou confirmar por
outro meio quantos perfis reais ficariam sem poder aprovar contrato após
esta correção.**

## 6. DOCUMENTAÇÃO ATUALIZADA

`docs/business/BLOCO_3_JUR_API.md` — verificado (leitura completa das
seções §2, §2.3, §2.5, §2.7, não apenas a mensagem do commit):

- §2 (:210-258): tabela ganha `POST /contracts/:id/approve` (approve),
  `GET .../approvals`, `GET`/`PUT /settings/approval-thresholds`; nível do
  aditivo unificado (`operate` para preparar, `approve` para efetivar
  elevação) — a contradição `:214`×`:233` do finding **não existe mais**
  (verificado: texto único, "preparar é `operate`, efetivar elevação de
  valor exige `approve`").
- §2.3 (:325-331): `party_type` documentado corretamente (é o campo que o
  fixture de teste, §5.4, errou).
- §2.5 (:365-396): `new_value` condicionado a `change_type='value'`,
  reabertura de alçada documentada com `approval_reopened: true`.
- §2.7 (:409-…): reescrita para descrever o mecanismo real (tabela +
  histórico + fail-closed + segregação D-K + reabertura de alçada), com a
  marca `[VERIFICAR COM ASSESSOR JURÍDICO]` **mantida** (os valores 50k/300k
  não foram validados por autoridade jurídica em nenhum momento desta
  remediação — consistente com a TRIAGE §8.1).

**Não verificado por não ser tocado por esta remediação:** `ERP_SSOT.md` e
`00-INDICE.md` (contagem de migrations) — ver §5.4, item
`docs-reality-drift-guard`.

## 7. FILES_CHANGED

28 arquivos, +2740/-156 linhas (`git diff --stat 8b572c8 54572b7`):
migration nova, 2 models novos, 1 model+1 repositório alterados,
`approvalPolicy.ts` novo, 3 use cases alterados, 1 controller novo
(`approvalThresholdController`), 1 controller alterado, 1 rota alterada,
`segregationOfDuties.ts` estendido, 2 arquivos de client, 1 doc de negócio,
2 suítes de teste novas (1149 linhas), 2 suítes de teste ajustadas.
Lista completa disponível via
`git diff --stat 8b572c8 54572b7 -- server client docs/business` no
worktree.

## 8. TESTS_ADDED / TESTS_CHANGED

- **Adicionados:** `server/tests/unit/juridico-contract-authority-find-erp-
  005.test.ts` (46 testes) e `server/tests/integration/jur-contract-
  authority-find-erp-005.test.ts` (24 testes, hoje não-funcional — §5.4).
- **Alterados (só construtor/fixture, sem asserção):**
  `juridico-contract-use-cases.test.ts` (§5.3),
  `purchase-segregation-of-duties.test.ts` (5º ponto `D-K-JURIDICO`).

## 9. REGRESSION_ANALYSIS

- Suíte unitária completa: **1996/1998**, as 2 falhas restantes
  pré-existentes e não relacionadas (§5.2).
- Suíte de integração completa: **243/267**. Das 24 falhas: **14 são do
  próprio caso** (fixture quebrado, §5.4), **2 são efeito colateral direto
  desta remediação não finalizado** (drift de banco dev×test e de
  documentação de contagem de migration), **8 não têm relação identificável**
  com este caso (BOM, rastreabilidade) e não puderam ser confirmadas como
  pré-existentes dentro do escopo autorizado desta sessão.
- Typecheck client+server: limpo.
- Nenhuma asserção de teste pré-existente foi alterada para "fazer passar"
  (verificado por diff, não por afirmação).

## 10. ARCHITECTURE_IMPACT

Alçada deixa de ser função pura de constantes e passa a depender de I/O
(injeção de repositório de política, não acoplamento direto do domínio a
banco) — decisão de desenho da TRIAGE §7.1, implementada como descrito
(injeção, não domínio dependente de I/O).

## 11. DATABASE_IMPACT

1 migration nova (`20260814-000048`): 2 tabelas novas
(`jur_approval_thresholds`, `jur_approval_threshold_history`), colunas novas
em `jur_contracts` (`approval_policy_snapshot`) e `jur_contract_approvals`
(campo de valor aprovado + coluna de invalidação, conforme recomendação
técnica da TRIAGE §7.2), constraints novas substituindo
`uq_jur_contract_approvals_contract_role` por unicidade que cobre identidade
(`uq_jur_contract_approvals_role_active`,
`uq_jur_contract_approvals_user_active`). **Aplicada e verificada apenas em
`erp_evok_audio_test`** — pendente aplicação em `erp_evok_audio` antes de
merge/deploy (ver `cross-database-drift-guard`, §5.4).

## 12. API_IMPACT

2 endpoints novos (`GET`/`PUT /api/jur/settings/approval-thresholds`);
`POST /contracts/:id/approve` passa a exigir nível `approve` (era `operate`
de fato, apesar de a doc já prometer `approve`); `POST .../addendums` passa
a exigir `approve` **apenas quando** a requisição eleva valor para faixa
superior. Client atualizado para não hard-codar mais os limiares (`33b8633`).

## 13. SECURITY_CHECKS

As 4 falhas do finding têm correção code-level verificada por leitura
(§2) e por 46 testes unitários determinísticos (§5.1). A prova dinâmica
HTTP — que é a forma de verificação que a Regra 24 do `CLAUDE.md` e o
próprio finding exigem para "imposição no servidor" — **está bloqueada**
pelo defeito de fixture (§5.4). Isto é relevante especificamente porque a
Falha 2/4 originais só eram visíveis via HTTP (o finding registra isso
explicitamente) — a mesma categoria de lacuna que permitiu ao finding
original passar despercebido pela suíte antiga.

## 14. RESIDUAL_RISK

1. **Alto/bloqueante:** prova dinâmica HTTP de R1(b)(c)/R2/R3/R4 inexistente
   hoje — §5.4.
2. **Alto/governança:** `APR-2026-021` não registrada em `APPROVALS.md` —
   §4.
3. **Médio:** migration não aplicada no banco de desenvolvimento
   (`erp_evok_audio`) — bloqueia deploy, não bloqueia reteste isolado em
   `erp_evok_audio_test`.
4. **Médio:** documentação de contagem de migrations desatualizada
   (`ERP_SSOT.md`, `00-INDICE.md`).
5. **Baixo/organizacional, já esperado pela TRIAGE:** perfis reais com
   `diretor`/`financeiro:'operate'` no banco de **produção** perderão a
   capacidade de aprovar — contagem real não levantada (só banco de teste,
   que deu 0) — §5.6.
6. **Baixo:** valores de alçada (50k/300k) seguem sem validação de
   assessoria jurídica (marcação mantida no documento, por desenho).
7. **Fora de escopo, registrado, não corrigido:** o mesmo padrão de
   truthiness de papel da Falha 2 existe em `purchases.ts:48` e
   `importProcesses.ts:34`, módulos de produção — §3.

## 15. COMMIT_HASH / BRANCH

REMEDIATION_COMMIT: `54572b7c90a21faaba58ab198c30da26b96da581` (HEAD do
worktree no momento deste pacote)
BRANCH: `sana/ERP-LEGACY-001/FIND-ERP-005`
Commits do caso: `67b49fb` (preservação) → `cd6f45b` → `afde1d0` → `8a2c5e3`
→ `33b8633` → `54572b7`
Estado do branch: 5 commits locais ainda não enviados a
`origin/sana/ERP-LEGACY-001/FIND-ERP-005` (verificado por `git status`).
Este agente não fez push, conforme instrução.

## 16. RETEST_INSTRUCTIONS

**Não é declaração de PASS nem de FINDING CLOSED — autoridade exclusiva
VeriCore (Regra 4).** Sugestão de ordem de trabalho para o
`vericore-audit-verification-runner`, dado o estado real:

1. Decidir, com o `coretriad-director`/dono, o que fazer com a lacuna de
   `APR-2026-021` (§4) antes de aceitar qualquer evidência que dependa dela
   (Falhas 1 e 3 inteiras).
2. Corrigir (ou mandar corrigir) o defeito de fixture de
   `jur-contract-authority-find-erp-005.test.ts:103` (`signatory_type` →
   `party_type`) e then rodar a suíte de integração contra
   `erp_evok_audio_test` — só então R2/R3/R4/R1(b)(c) têm prova dinâmica.
   Alternativa: a VeriCore reproduz R1-R6 por conta própria, com seus
   próprios scripts, contra o `REMEDIATION_COMMIT` acima (é o padrão normal
   — VeriCore não confia apenas nos testes da SanaCore, Parte V §30 do
   master spec).
3. Aplicar a migration em `erp_evok_audio` (dev) antes de considerar o caso
   pronto para deploy — não bloqueia reteste isolado em banco de teste.
4. Repetir R2(a)-(e), R3(a)-(e), R4(a)-(d), R5(a)(b), R1(a)-(e) — todos os
   blocos do RETEST_SPECIFICATION original — usando o banco
   `erp_evok_audio_test`, nunca `erp_evok_audio`.
5. Verificar R6(c) por diff próprio (não confiar neste pacote) em
   `juridico-contract-use-cases.test.ts:174-333`.
6. Pedir ao dono a contagem de perfis `diretor`/`financeiro:'operate'` no
   banco de produção (§5.6) antes de qualquer promoção do módulo.
