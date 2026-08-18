# CASE_STATUS — ERP-LEGACY-001-CASE-002 (FIND-ERP-005)

CASE_ID: ERP-LEGACY-001-CASE-002
FINDING_ID: FIND-ERP-005
PROJECT_ID: ERP-LEGACY-001
BRANCH: `sana/ERP-LEGACY-001/FIND-ERP-005` (sem `push`)
REMEDIATION_COMMIT: correção 01 desta sessão — gap de contiguidade aplicado no código; hash final será o do commit local desta worktree

## Linha do tempo do caso

| Estado | Quando | Por quem |
|---|---|---|
| `REMEDIATION_CASE` recebido | 2026-08-14 | `coretriad-director` → SanaCore (`APR-2026-020` Decisão B) |
| Triagem concluída (causa-raiz, blast radius, plano, 3 perguntas ao dono) | 2026-08-14 | `sanacore-remediation-triage` |
| Decisões do dono registradas (respostas às 3 perguntas) | 2026-08-14 | `APR-2026-021` Parte B itens 3/4/5, reafirmados por `APR-2026-022` |
| Implementação (código + testes + doc) | 2026-08-14 | `sanacore-remediation-engineer` (`67b49fb`..`54572b7`) |
| Pacote de evidência v1 | 2026-08-14 | `sanacore-remediation-evidence` (`48c93cd`) |
| Revisão: fixture de integração corrigido, doc canônica de migrations corrigida, retratação da falsa lacuna de governança | 2026-08-14 | `sanacore-remediation-evidence` (commit desta revisão) |

## Estado atual

**`READY_FOR_RETEST`** — a correção 01 do gap de contiguidade foi aplicada
no código e validada por suíte unitária/tipo/build, mas a prova HTTP completa
continua dependente de `erp_evok_audio_test` estar acessível na porta
`5432` nesta máquina.

As duas lacunas apontadas na v1 continuam registradas como resolvidas no
código-base do caso:

| Lacuna da v1 | Estado |
|---|---|
| `APR-2026-021` não registrada | **Alarme falso.** A aprovação existe no repositório principal (`APPROVALS.md:573`), com `APR-2026-022` reafirmando. Erro causado por leitura do `coretriad/` defasado do worktree — armadilha registrada em §0.1 do pacote de evidência. |
| Suíte de integração HTTP inoperante (14/14 falhas) | **Corrigida.** 3 defeitos de fixture; **20/20 passando** contra `erp_evok_audio_test`. R1(b)(c), R2(a)-(d), R3(a)(b)(c)(e), R4(a)-(d) com prova dinâmica HTTP real. |

## Evidência executada (resumo)

| Suíte | Resultado |
|---|---|
| Unitários — alvo do caso | **52/52 PASSED** no alvo executado nesta correção |
| Unitários — completa | **2003/2004** (1 falha pré-existente, não relacionada: `docs-path-reference-guard`) |
| Integração — suíte do caso | **bloqueada no ambiente local**: o runner não conseguiu subir `erp_evok_audio_test` porque `localhost:5432` recusou conexão |
| Integração — completa | **não executada com sucesso nesta máquina** |
| Typecheck server | **exit 0** |
| Build server | **exit 0** |

## Pendências que NÃO são da SanaCore (ação humana)

1. **Aplicar a migration `20260814-000048` em `erp_evok_audio`** — banco
   PRODUÇÃO REAL (`APR-2026-016`); decisão de *quando* é do dono. Até lá,
   `cross-database-drift-guard` falha corretamente.
2. **Contar perfis `diretor`/`financeiro:'operate'` no banco de produção**
   (TRIAGE §3.3). No banco de teste: 0.
3. **Avaliar finding próprio** para `purchases`/`comex`, que replicam o
   padrão da Falha 2 em módulos de PRODUÇÃO.

## O que NÃO foi declarado (proibido à SanaCore)

- `RETEST_PASSED` — não declarado.
- `FINDING CLOSED` — não declarado.
- `RISK_ACCEPTED` — não declarado.
- Nenhuma edição em
  `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-005.md` nem em
  `remediation/cases/ERP-LEGACY-001-CASE-002/TRIAGE.md`.
- Nenhuma alteração no repositório principal; nenhum `push`.

## Próximo passo

Devolução ao `coretriad-director` para acionar a VeriCore
(`vericore-audit-verification-runner`) no reteste independente de R1-R6
contra o `REMEDIATION_COMMIT`, usando exclusivamente `erp_evok_audio_test`
quando a infraestrutura local estiver disponível.
