# REMEDIATION EVIDENCE PACKAGE — ERP-LEGACY-001-CASE-012

**Finding:** FIND-ERP-007 — rescisão de contrato de experiência (RH)
**Branch:** `sana/ERP-LEGACY-001/CASE-012`
**Worktree:** `C:\Sistema EvokAudio\ERP-Evok-sana-CASE-012`
**Commit de implementação:** `fd1cc0b`
**Data:** 2026-08-18

## 1. Escopo e decisões aplicadas

A remediação aplica integralmente APR-2026-057:

- **P11:** o motivo passa a ser persistido em `hr_termination_processes`, e não apenas em auditoria;
- **P12:** `termination_reason` é `TEXT` livre;
- **P13:** o motivo é obrigatório e simétrico nos dois produtores: decisão `rescindir` e criação direta do processo;
- **P14:** contratos de experiência da Evok possuem cláusula assecuratória do art. 481 da CLT; por isso o fluxo usa aviso prévio normal, e não a indenização do art. 479. A referência está junto ao repasse em `DecideEmployeeContractUseCase.ts:108-111`;
- **P15:** a modalidade `trabalhado`/`indenizado` é selecionada manualmente pelo RH na tela.

O item 3 do finding, referente a HTTP 409 versus 422 para processo já aberto, ficou deliberadamente fora deste escopo. Ele permanece **NEEDS_MORE_EVIDENCE**, dependente da decisão humana Q3a. A condição de conflito em `CreateTerminationProcessUseCase.ts` não foi alterada.

## 2. Causa-raiz e correções

| Causa-raiz antes da correção | Evidência anterior | Correção e evidência atual |
|---|---|---|
| O schema da decisão aceitava `termination_reason` como opcional, mas o use case não o consumia. | TRIAGE §1.1: `employeeContractValidators.ts:27-28`; `DecideEmployeeContractUseCase.ts:60-108`. | Regra condicional obrigatória em `employeeContractValidators.ts:24-52`; validação defensiva e repasse em `DecideEmployeeContractUseCase.ts:101-112`. |
| A modalidade era congelada no literal `trabalhado`. | TRIAGE §1.2: `DecideEmployeeContractUseCase.ts:104`; teste anterior em `rh-contract-use-cases.test.ts:107-109`. | Campo recebido e repassado em `DecideEmployeeContractUseCase.ts:29,101-112`; seleção manual em `EmployeeContractsTab.tsx:288,311-312,323-334,368-385`; teste de repasse em `rh-contract-use-cases.test.ts:102-121`. |
| O processo e o model não possuíam destino persistente para o motivo. | TRIAGE §1.1/§3.1: `HrTerminationProcess.ts:16-47`; cadeia encerrava em repositório pass-through. | Migration `20260818-000051-hr-termination-reason.cjs:13-18`, model `HrTerminationProcess.ts:25` e repasse `CreateTerminationProcessUseCase.ts:34,53-54,73`. O repositório permaneceu inalterado por ser pass-through. |
| O POST direto rejeitaria o novo campo por usar schema `.strict()` sem `termination_reason`. | TRIAGE §4.2: `terminationValidators.ts:18-24`. | Campo obrigatório em `terminationValidators.ts:23`, payload/tipo em `client/src/api/hr.ts:259-271,303-311` e formulário em `TerminationTab.tsx:276-316,372-383`. |
| Contrato publicado e comportamento dos dois endpoints eram assimétricos. | TRIAGE §1.1 e §4.2; documentação antiga em §5.2/§6.1. | Somente `docs/business/BLOCO_6_RH_API.md` §5.2 (`:523-545`) e §6.1 (`:578-605`) foram atualizados, conforme autorização expressa. |

O baseline congelado, `audit/`, `coretriad/` e `.claude/` não foram modificados.

## 3. Migration e banco de teste

A migration foi executada exclusivamente com `DB_NAME=erp_evok_audio_test`. Output real da aplicação:

```text
== 20260818-000051-hr-termination-reason: migrating =======
== 20260818-000051-hr-termination-reason: migrated (0.014s)
```

Confirmação direta no catálogo do banco de teste:

```text
termination_reason|text|NO
20260818-000051-hr-termination-reason.cjs
```

Confirmação pelo status do Sequelize:

```text
> erp-evok-audio-server@1.0.0 migration:status
> node src/scripts/run-sequelize-cli.cjs db:migrate:status

up 20260812-000047-hr-absences-open-unique.cjs
up 20260814-000048-jur-approval-thresholds-and-authority-find-erp-005.cjs
up 20260817-000048-inventory-movements-operation-id.cjs
up 20260817-000049-create-financial-payment-events.cjs
up 20260818-000050-add-purchase-receipts-and-product-cost-ledger-fks.cjs
up 20260818-000051-hr-termination-reason.cjs
```

Guarda de drift model × banco, com `RUN_INTEGRATION=true` e `DB_NAME=erp_evok_audio_test`:

```text
Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Snapshots:   0 total
Time:        1.281 s
Ran all test suites matching tests/integration/schema-model-drift-guard.test.ts.
```

## 4. Testes do módulo RH

Bateria ampliada de todos os testes unitários `rh-*.test.ts`:

```text
Test Suites: 12 passed, 12 total
Tests:       211 passed, 211 total
Snapshots:   0 total
Time:        0.865 s, estimated 1 s
```

Ela inclui os fluxos de `payment_deadline`, conclusão, ASO e checklist já existentes. Testes novos/alterados provam:

- repasse de `termination_reason` e `notice_modality` no caminho `decision=rescindir`;
- HTTP 400 quando qualquer um dos dois campos falta nesse caminho;
- HTTP 400 quando `termination_reason` falta no POST direto;
- persistência do motivo pelo use case de criação.

Guardas estruturais solicitadas:

```text
Test Suites: 3 passed, 3 total
Tests:       39 passed, 39 total
Snapshots:   0 total
Time:        9.18 s
Ran all test suites matching tests/unit/export-assignment-guard.test.ts|tests/unit/model-association-attribute-guard.test.ts|tests/unit/rh-validators.test.ts.
```

A interface local dos use cases permaneceu não exportada.

## 5. Integração HTTP isolada

A API temporária foi iniciada na porta 3123 com `DB_NAME=erp_evok_audio_test`; o teste criou funcionário sintético, abriu o processo por POST e recuperou o mesmo valor por GET:

```text
CASE012_ISOLATED_HTTP_TEST_OK
Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        0.412 s, estimated 1 s
Ran all test suites matching tests/integration/rh-termination-reason.test.ts.
```

As asserções relevantes estão em `server/tests/integration/rh-termination-reason.test.ts:43-60`.

## 6. Typecheck, builds e dependências

Server:

```text
> erp-evok-audio-server@1.0.0 typecheck
> tsc -p tsconfig.json --noEmit

> erp-evok-audio-server@1.0.0 build
> tsc -p tsconfig.build.json

Process exited with code 0
```

Client:

```text
> client@0.0.0 build
> tsc -b && vite build

vite v8.2.0 building client environment for production...
✓ 2310 modules transformed.
✓ built in 576ms
Process exited with code 0
```

O Vite manteve apenas o aviso não bloqueante já conhecido de chunk maior que 500 kB. Auditoria de dependências de produção:

```text
server: found 0 vulnerabilities
client: found 0 vulnerabilities
```

## 7. Registro de ocorrência do executor

Uma tentativa inicial com `node scripts/run-api-suite.cjs integration rh-termination-reason` foi descartada: o runner combinou o diretório posicional `tests/integration` e `--testPathPatterns` como alternativa, executando 60 suítes em vez de uma. O resultado foi 57 suítes aprovadas e 3 reprovações alheias ao CASE-012.

Durante essa expansão indevida, `cross-database-drift-guard.test.ts` invocou uma comparação **somente-leitura de schema** entre `erp_evok_audio` e `erp_evok_audio_test`, contrariando a fronteira operacional do despacho. Não houve migration, fixture nem escrita no banco principal; todas as mutações da tentativa foram dirigidas à API configurada com `DB_NAME=erp_evok_audio_test`. O processo temporário foi encerrado e a porta 3122 confirmada livre. Nenhum resultado dessa tentativa é usado como evidência de aprovação.

Depois da ocorrência, tanto a prova HTTP quanto a guarda de drift model × banco foram repetidas por comandos isolados, sem a guarda cross-database, e exclusivamente contra `erp_evok_audio_test`; esses são os outputs registrados nas seções 3 e 5.

## 8. Limites de autoridade

A remediação de código está completa e comprovada, mas a avaliação final do finding pertence à VeriCore. Este pacote não altera o estado do finding e não decide Q3a.
