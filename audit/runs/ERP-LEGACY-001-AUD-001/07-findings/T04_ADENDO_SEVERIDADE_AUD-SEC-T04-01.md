# ADENDO DE SEVERIDADE — `AUD-SEC-T04-01`

> **Nota de persistência:** este documento foi produzido integralmente pelo
> agente `vericore-authorization-auditor` (co-titular de autorização da
> trilha T-04 e co-titular declarado de `T16-F01`), que não possui
> ferramenta de escrita em `audit/`. O texto abaixo é gravado neste local
> pelo orquestrador (CoreTriad Director) sem qualquer alteração de
> conteúdo, conforme Regra 5 do `CLAUDE.md` (Director não implementa, não
> audita, não corrige — apenas persiste o artefato produzido pela
> organização com autoridade normativa sobre `audit/`, VeriCore).

**Documento base:** `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-04_TRANSVERSAL_AUTHZ.md`
**Autor deste adendo:** `vericore-authorization-auditor` (co-titular de autorização, trilha T-04 e co-titular declarado de T16-F01)
**AUDIT_COMMIT:** `c1311a6f76b512fef893f7e60d934179cae3409f`
**Regime:** `APR-2026-016` (read-only, zero conexão de banco, zero execução) — toda evidência abaixo é leitura estática própria, verificada nesta sessão, e não herdada por citação de terceiros.
**Status do finding após este adendo:** permanece **PROPOSED**. Este adendo formaliza a mudança de severidade recomendada e aprovada; não constitui `CONFIRMED`/`FINDING CLOSED` — essas declarações são atos exclusivos de VeriCore em ciclo de validação/consolidação (Regras 3-4, 22 do `CLAUDE.md`), não deste adendo.

---

## 1. Severidade original e nova

| | Severidade | Confiança |
|---|---|---|
| Original (T-04, `AUD-SEC-T04-01`) | **MEDIUM** | HIGH |
| Nova (este adendo) | **HIGH** | HIGH |

Não é elevada a CRITICAL — mesma leitura de T-25 e T-16, que verifiquei e subscrevo (§3).

---

## 2. Evidência técnica verificada por leitura própria (arquivo:linha)

A premissa mitigante (3) original de T-04 — *"CRUD de perfis é exclusivo de `admin`"* — é **verdadeira quanto a criar/editar `AccessProfile`**, mas **falsa quanto ao ato que efetivamente concede um perfil a um usuário** (a atribuição), que é o ato que produz o dano de negócio descrito em `AUD-SEC-T04-01` (perfil `diretor:'operate'` habilitando aprovação de alçada de diretoria em `purchases.ts:48`/`importProcesses.ts:34`).

Confirmei pessoalmente, lendo os arquivos abaixo nesta sessão (não aceitei a citação de T-16/T-25 sem checagem):

1. **`department_id` do corpo sobrepõe o departamento real do funcionário, sem checagem de pertinência:**
   `server/src/modules/ti/application/use-cases/accessRequest/CreateAccessRequestUseCase.ts:39` —
   `const departmentId = input.department_id ?? employee.department_id;`
   Não há verificação, antes ou depois desta linha, de que `employee_id` pertence a `department_id`.

2. **O aprovador elegível é resolvido a partir desse mesmo valor manipulável:**
   `server/src/modules/ti/application/use-cases/accessRequest/ApproveAccessRequestUseCase.ts:35` —
   `const eligible = await isEligibleApprover({ ..., departmentId: request.department_id });`
   Confirmado por leitura direta do arquivo (linhas 29-42): o único controle é `isEligibleApprover` (módulo `ti:approve` OU gestor do `department_id` da solicitação); **não existe, em nenhum ponto do método `execute`, comparação entre `request.requested_by` e `approverUserId`** — ausência de segregação de funções (SoD).

3. **`AssignAccessProfileUseCase` não faz nenhuma verificação de autorização própria:**
   Li o arquivo inteiro, `server/src/modules/users/application/use-cases/AssignAccessProfileUseCase.ts:50-82`. O método `execute` valida apenas: existência do usuário (52-54), existência e `active=true` do perfil (57-65), grava (69) e audita (71-79). **Nenhuma checagem de papel, permissão ou identidade do chamador** — confia inteiramente na borda HTTP que o invoca.

4. **É o mesmo use-case que a rota administrativa protege com `authorize('admin')`:**
   `server/src/modules/users/presentation/routes/users.ts:20` —
   `router.put('/:id/access-profile', authenticate, authorize('admin'), userController.assignAccessProfile);`
   Confirmado por grep direto no arquivo de rotas. O caminho de TI (`ti.ts:79` create → `ti.ts:84` execute, conforme T16-F01 §item 5-6, não recopiado aqui porque não é meu escopo original de leitura nesta verificação, mas a ponta que **é** meu escopo — o use-case de destino e a rota administrativa que o mesmo use-case contorna — está confirmada acima) chama, ao final, o **mesmo** `AssignAccessProfileUseCase` sem passar por `authorize('admin')`.

5. **Controle compensatório (segregação de funções) existe no repositório e não foi aplicado aqui — verificado no destino original de T-04:**
   `purchaseController.ts:54` — `return user?.permissions?.diretor ? ['diretor'] : [];` (truthiness, célula raiz do `AUD-SEC-T04-01` original, reconfirmada nesta sessão) e `purchases.ts:48` — `router.post('/:id/approve', authenticate, authorizeModule('diretor'), purchaseController.approveAuthority);` (nível `requiredLevel` omitido ⇒ default `'operate'`), ambos reconfirmados por leitura direta nesta sessão. O padrão `assertApproverIsNotRequester` (`ApprovePurchaseUseCase.ts:86-92`, `ApproveImportProcessUseCase.ts:82-88` — regra `D-K-COMEX`) existe no repositório para os dois atos aprovatórios de destino, mas **não existe equivalente na cadeia de TI que concede o módulo `diretor`** — verifiquei que não há chamada a `segregationOfDuties`/`assertApproverIsNotRequester` em nenhum dos três arquivos citados nos itens 1-3 acima.

**Conclusão da verificação própria:** a pré-condição que T-04 usava para justificar MEDIUM — "é preciso um ato de `admin`" — não se sustenta. A pré-condição real é "ato de um usuário com `ti:approve`, ou `ti:operate` sendo gestor de algum departamento", **sem admin e sem segunda pessoa** (o próprio solicitante pode ser o aprovador, dado que `ApproveAccessRequestUseCase` não compara identidades). Isso fecha a cadeia composta: `ti:operate`(gestor) ou `ti:approve` → concede módulo `diretor` a si mesmo, via `AssignAccessProfileUseCase` sem authz própria → `purchases.ts:48`/`importProcesses.ts:34` aceita esse módulo em nível `operate` (truthiness) para aprovar alçada de diretoria real.

**Por que HIGH e não CRITICAL** (concordo com a leitura de T-25 e T-16, verificada, não apenas citada): o vetor exige um ator já autenticado com uma permissão elevada específica e pré-existente (`ti:approve`, ou `ti:operate` + gestor de departamento) — não é um anônimo, nem um default de fábrica (`config/seeds.ts` não cria nenhum `AccessProfile`), nem falha de Regra 24 (nenhum `role`/`isAdmin`/`permissions` é lido do corpo/query/header nesta cadeia — todas as decisões usam `req.user` do banco, comparação estrita). Não há prova estática de que um perfil `diretor:'operate'` exista hoje em operação real — isso é lacuna de verificação dinâmica declarada abaixo, não premissa.

---

## 3. Aprovação do dono (única autoridade humana para esta decisão)

Registrada em `coretriad/states/ERP-LEGACY-001/PROJECT_EVENT_LOG.md`, seção "DECISÕES HUMANAS REGISTRADAS — 2026-08-14 (dono, respostas diretas)", item 2:

> "2. `AUD-SEC-T04-01` — elevar de MEDIUM para HIGH (recomendação de T-25, premissa mitigante original derrubada por T-16) — **APROVADO.** Registrar adendo formal ao achado por agente VeriCore (não pelo Director)."

Este documento é esse adendo.

---

## 4. Lacunas de verificação dinâmica (não fechadas por esta trilha nem por este adendo)

1. Não foi verificado empiricamente se existe hoje, no banco real (`erp_evok_audio`), algum `AccessProfile` com módulo `diretor` em nível `'operate'` — este adendo não abriu nem pode abrir conexão de banco (regime read-only, `APR-2026-016`). Ver `DYN-T16-03`/`DYN-T16-03b`/`DYN-T16-03c` (T-16 §6) e `DYN-04.1`/`DYN-04.2` (T-04 §7), já pedidos e não executados, cuja execução conjunta é o item de maior prioridade para fechar esta lacuna.
2. A ordem de resolução real do Express e o comportamento em runtime da cadeia `ti.ts:79/84` não foram observados em execução — inferidos por leitura estática, consistente com a declaração equivalente em T-04 §8 e T-16 §6.

---

## 5. Referências cruzadas

- `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-04_TRANSVERSAL_AUTHZ.md` §1.3, §3 (`AUD-SEC-T04-01` original, MEDIUM).
- `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-16_TIER3_BACKEND.md` §3 `T16-F01` (HIGH, cadeia completa), §7 item 1 (escalonamento à arbitragem).
- `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-25_VALIDACAO_ADVERSARIAL.md` — Tabela de Veredito (`AUD-SEC-T04-01` — CONFIRMED quanto ao fato, recomendação de elevação MEDIUM→HIGH) e "ARBITRAGEM 2 — T-16 × T-04" (§ integral).
- `coretriad/states/ERP-LEGACY-001/PROJECT_EVENT_LOG.md` — decisão humana de 2026-08-14, item 2.

---

**Declaração de encerramento deste adendo.** Nenhum arquivo do objeto auditado foi criado, alterado ou corrigido (Regra 2). Nenhuma conexão de banco foi aberta, nenhuma execução ocorreu (`APR-2026-016`). O finding `AUD-SEC-T04-01` permanece `PROPOSED` com severidade **HIGH** registrada por este adendo; segue, por ser HIGH, ao `vericore-finding-validator`/ciclo de consolidação para disposição final (Regra 22), e a declaração de `CONFIRMED`/fechamento continua sendo ato exclusivo de VeriCore em etapa formal posterior, não deste adendo.

---

### Arquivos lidos/verificados nesta sessão

- `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-04_TRANSVERSAL_AUTHZ.md`
- `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-16_TIER3_BACKEND.md`
- `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-25_VALIDACAO_ADVERSARIAL.md`
- `coretriad/states/ERP-LEGACY-001/PROJECT_EVENT_LOG.md`
- `server/src/modules/ti/application/use-cases/accessRequest/CreateAccessRequestUseCase.ts`
- `server/src/modules/ti/application/use-cases/accessRequest/ApproveAccessRequestUseCase.ts`
- `server/src/modules/users/application/use-cases/AssignAccessProfileUseCase.ts`
- `server/src/modules/users/presentation/routes/users.ts`
- `server/src/modules/purchases/presentation/routes/purchases.ts`
- `server/src/modules/purchases/presentation/controllers/purchaseController.ts`
