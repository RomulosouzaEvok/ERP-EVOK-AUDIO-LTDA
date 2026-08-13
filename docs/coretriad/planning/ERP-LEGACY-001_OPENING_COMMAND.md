# ERP-LEGACY-001 — COMANDO DE ABERTURA (aguardando aprovação humana)

**Status:** PREPARADO, **NÃO EXECUTADO**. Nada deste documento foi rodado.
**Data:** 2026-08-13 · **Base normativa:** `docs/coretriad/CORETRIAD_MASTER_SPEC.md`
Parte VIII (Programa de Recuperação do Legado, passos 21–40).

---

## O que este programa é — e o que ele não é

O ERP Evok Áudio **não é ideia nova**. É `EXISTING_SYSTEM` entrando em programa
`LEGACY_RECOVERY_AND_MODERNIZATION`. A diferença em relação ao SIM-001/SIM-002 é
decisiva: lá o CoreTriad auditou software que ele mesmo construiu, com requisitos
escritos antes do código. Aqui o código **veio primeiro** e a documentação pode
estar errada.

**Regras do programa (Parte VIII), válidas desde o passo 21:**

- Não refatorar, não corrigir, não excluir código, não alterar banco nem
  arquitetura **durante o discovery**.
- **Não presumir que a documentação existente está correta** — incluindo
  `docs/project-memory/product/ERP_SSOT.md`. Ela é objeto de auditoria, não
  fonte de verdade, até ser validada contra código e evidência.
- Nada vira regra oficial sem validação humana: comportamento descoberto no
  código entra como `DISCOVERED_BUSINESS_BEHAVIOR`, não como BR.

---

## Fase 1 do programa — o que o comando executaria (passos 21–24)

Proponho abrir **apenas até o passo 24**, e parar para nova aprovação. Discovery
completo até o passo 30 antes de qualquer auditoria é muito trabalho para
autorizar em bloco sem ver o primeiro resultado.

### Passo 21 — Onboarding formal
`coretriad-director` registra o projeto no Control Plane:
`coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md` e `PROJECT_EVENT_LOG.md`,
com `PROJECT_ID: ERP-LEGACY-001`, tipo `EXISTING_SYSTEM`, programa
`LEGACY_RECOVERY_AND_MODERNIZATION`, estado inicial `DISCOVERY`.

### Passo 22 — Baseline imutável
Commit + **tag `legacy-baseline-001`** no estado atual do ERP. É o "era assim
antes da recuperação" — referência permanente contra a qual todo achado futuro
será medido. Sem isso, daqui a três meses ninguém distingue defeito histórico de
regressão introduzida pela recuperação.

### Passo 23 — Snapshot técnico (VeriCore, read-only)
Inventário do que **existe**, não do que deveria existir: módulos, rotas,
camadas, banco, migrations, APIs, jobs, integrações, permissões, auth, frontend,
testes, dependências, CI/CD, infra e documentação. Produz
`LEGACY_SYSTEM_INVENTORY.md`, `SYSTEM_MAP.md`, `MODULE_CATALOG.md` e os
inventários de API/DB/integrações/dependências/documentação.

### Passo 24 — Arquitetura real (AS-IS)
`CURRENT_ARCHITECTURE.md` — como o sistema **está** estruturado de fato,
provado por código. **Não** é arquitetura alvo; o passo 34 é que trata disso.

**PARAR** ao fim do 24 para sua aprovação antes dos passos 25–30 (domínios,
regras descobertas, requisitos recuperados, casos de uso, matriz de
rastreabilidade do legado, testes de caracterização).

---

## Escala e custo — seja avisado antes de aprovar

O SIM-002 tinha 16 arquivos. O ERP tem **2.808 arquivos** rastreados no git, com
`server/` em Node/TypeScript/Sequelize/PostgreSQL e uma suíte de **1.952 testes
unitários em 177 suítes**. O snapshot do passo 23 é a maior operação de leitura
que o CoreTriad já executou — várias trilhas VeriCore em paralelo, cada uma
sobre um recorte do sistema.

Estime **ordens de magnitude a mais** que o SIM-002 em tempo e tokens. É por isso
que proponho parar no passo 24.

---

## O que já está valendo para esta auditoria

- **Regra 24 do `CLAUDE.md`** (origem OBS-SIM-001-A / APR-2026-005): papel ou
  permissão declarado pelo cliente sem verificação server-side é finding
  **CRITICAL bloqueante para release** em projeto real — e `ERP-LEGACY-001` é
  citado nominalmente. **Nunca `RISK_ACCEPTED` em produção.**
- **A lição do FIND-SIM-002-014**: o SIM-002 provou que auditor pode ler a linha
  certa, achar um defeito nela e **não questionar a procedência** do atributo de
  autorização. A matriz de cobertura do ERP deve exigir explicitamente a
  verificação de **procedência**, não só de presença, de cada checagem de papel.
- **O padrão do teste falso-positivo** (FIND-SIM-002-007): suíte verde não é
  evidência. Com 1.952 testes no ERP, a trilha de qualidade precisa medir
  **poder de discriminação**, não contagem.

---

## Pendências do CoreTriad que este programa herda

Nenhuma bloqueia a abertura, mas todas devem ser visíveis:

| Item | Situação |
|---|---|
| SIM-001 e SIM-002 **não arquivados** | APR-2026-006 e APR-2026-010 exigem `finding-validator` nos findings `PROPOSED` antes do arquivamento definitivo, ou descarte com o ambiente |
| Lacuna na state machine | A transição `RETEST_PASSED → IN_REMEDIATION` não existe na tabela (`STATE_MACHINE.md` só prevê `RETEST_FAILED → IN_REMEDIATION`); o Director registrou o evento como ocorreu e deixou a conciliação para VeriCore + humano |
| `.codex/agents/*.toml` | 21 arquivos espelhando o roster pré-CoreTriad (`GAP_ANALYSIS.md` §6) |
| `audit-verification-runner` | Criado e exercitado com sucesso; o gap ALTO do `GAP_ANALYSIS.md` §1 está fechado na prática |

---

## O comando

Se você aprovar, executo:

```
/coretriad-onboard ERP-LEGACY-001
```

**Verificado:** essa skill **não existe** neste repositório — as skills
disponíveis são `coretriad-bootstrap`, `coretriad-materialize`,
`coretriad-sim-close`, `coretriad-sim002`, `coretriad-test-segregation` e
`evok-production-readiness`. O `GAP_ANALYSIS.md` §7 já listava
`/coretriad-onboard` como não implementada.

Portanto, o que executo é o **equivalente explícito**: o `coretriad-director`
abre o projeto (passos 21–22, com a tag de baseline) e convoca as trilhas
VeriCore read-only para os passos 23–24, entregando os artefatos listados acima
e parando para sua aprovação. Se preferir, crio antes a skill
`/coretriad-onboard` para que o fluxo fique reutilizável — diga qual dos dois.

**Sua aprovação abre apenas os passos 21–24.** Os passos 25–40 exigem novos
gates, um por bloco.
