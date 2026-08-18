> **OBSOLETO — NÃO ENVIAR AO CODEX.** Descoberto em 2026-08-17 que este caso já foi
> implementado integralmente em outra worktree/branch, com evidência própria e estado
> `READY_FOR_RETEST`/`REMEDIATION_COMPLETE`. Ver worktree correspondente para a
> evidência real. Este despacho foi gerado por engano, sem visibilidade daquele
> trabalho anterior, e não deve ser usado. Mantido apenas para rastreabilidade do erro.

# Despacho Codex — `ERP-LEGACY-001-CASE-002` (parcial: Falhas 2 e 4 apenas)

```
CASE_ID:      ERP-LEGACY-001-CASE-002
FINDING_ID:   FIND-ERP-005 (Falhas 2 e 4 apenas — Falhas 1 e 3 permanecem bloqueadas por decisão)
ESCOPO:       server/src/modules/juridico — nível de aprovação de alçada (Falha 2) e segregação de identidade entre aprovadores (Falha 4)
BASE:         remediation/cases/ERP-LEGACY-001-CASE-002/TRIAGE.md, secao 6 (Plano executavel — nao depende de decisao)
DECISOES:     nenhuma pendente para esta parte; Falhas 1 e 3 (secao 7) ficam de fora, bloqueadas pelas perguntas (a)/(b)/(c) da secao 8
DESTINO:      sanacore-remediation-engineer / Codex
```

## 1. Prompt literal para colar no Codex

```text
Você está atuando como sanacore-remediation-engineer dentro da estrutura CoreTriad deste repositório.

Implemente o CASE-002, PARCIAL — apenas Falhas 2 e 4 do finding FIND-ERP-005. NÃO toque nas Falhas 1 e 3 (thresholds hard-coded e reabertura de alçada em aditivo) — elas dependem de decisões do dono ainda não registradas.

CASE_ID: ERP-LEGACY-001-CASE-002
FINDING_ID: FIND-ERP-005 (Falhas 2 e 4)
Escopo autorizado: nível de autorização da rota de aprovação de contrato (Falha 2) e segregação de identidade entre aprovadores do mesmo contrato (Falha 4).

Trabalhe exclusivamente na worktree/branch:
  worktree: C:\Sistema EvokAudio\ERP-Evok-sana-CASE-002
  branch:   sana/ERP-LEGACY-001/CASE-002

Se a worktree ainda não existir, crie-a a partir da base adequada do repositório, sem tocar em main.

Regras absolutas:
- NÃO conecte em erp_evok_audio (produção), nem para contar linhas.
- Não execute operação destrutiva em banco real. Testes de integração HTTP somente contra erp_evok_audio_test.
- Não toque em audit/, coretriad/governance/, coretriad/states/, .claude/ ou docs/.
- NÃO toque em server/src/middlewares/authorizeAnyModule.ts — a correção é no call site, não no middleware (blast radius de mudar o middleware afeta 5 rotas de leitura em 4 módulos, incluindo produção).
- NÃO implemente nada relativo às Falhas 1 e 3 (thresholds, reabertura de alçada em aditivo) — ficam pendentes de decisão do dono.
- Não declare FINDING CLOSED nem RETEST_PASSED. Essa autoridade é exclusiva da VeriCore.

Leitura obrigatória antes de editar:
1. Leia integralmente remediation/cases/ERP-LEGACY-001-CASE-002/TRIAGE.md — sobretudo §1 (Falha 2 e Falha 4), §3.1 (blast radius do middleware), §6 (plano executável), §9 (plano de testes).
2. Leia server/src/modules/juridico/presentation/routes/juridico.ts (linha ~71 e comentários ~26-29, 66-70).
3. Leia server/src/middlewares/authorizeAnyModule.ts (apenas para entender a assinatura AnyModuleCandidate.requiredLevel — NÃO editar este arquivo).
4. Leia server/src/modules/juridico/presentation/controllers/contractController.ts (linhas ~37-54, ~166).
5. Leia server/src/modules/juridico/application/use-cases/ApproveContractUseCase.ts (linhas ~61-95).
6. Leia server/src/modules/juridico/application/use-cases/ActivateContractUseCase.ts (linhas ~39-63).
7. Leia server/src/shared/domain/segregationOfDuties.ts (isSelfApproval, SEGREGATION_RULES, formato de BusinessRuleError).
8. Leia server/tests/unit/juridico-contract-use-cases.test.ts (linhas ~174-333) — para não alterar as asserções existentes, apenas ajustar instanciações se necessário.
9. Leia server/tests/helpers/testApi.ts e server/tests/integration/legacy-routes-rbac-regression.test.ts como modelo de teste de integração HTTP com dois tokens de administrador distintos.

Causa-raiz:
- Falha 2: a rota POST /contracts/:id/approve usa authorizeAnyModule sem requiredLevel, herdando o default 'operate' — qualquer pessoa com nível básico do módulo aprova alçada financeira, quando deveria exigir 'approve'.
- Falha 4: nada impede que a MESMA pessoa registre as duas aprovações (diretor e financeiro) do mesmo contrato — dedup hoje é por papel, não por identidade.

Estratégia autorizada (F2-A a F2-D, F4-A, F4-C — TRIAGE.md §6):

F2-A — Nível na rota (blast radius 1):
Em juridico.ts:71, adicionar requiredLevel: 'approve' aos dois candidatos do authorizeAnyModule. NÃO tocar authorizeAnyModule.ts. Atualizar o comentário local citando FIND-ERP-005. A rota GET :79 permanece intocada.

F2-B — Fim da truthiness (defesa em profundidade):
Em contractController.ts:51-54, trocar `if (user?.permissions?.diretor)` por comparação estrita `=== 'approve'` para os dois papéis (diretor e financeiro). Manter role === 'admin' como concedente de papel nesta função (privilégio é concedível — quem barra o admin é a Falha 4, não esta).

F2-C — Fail-closed no gate de alçada:
Em ActivateContractUseCase.ts, tornar approvalRepository OBRIGATÓRIO no construtor (remover a opcionalidade em :39,41 e a checagem `&& this.approvalRepository` em :63). Ajustar as instanciações em juridico-contract-use-cases.test.ts para injetar o repositório — SEM alterar nenhuma asserção existente em :174-333.

F2-D — Documentação:
Em docs/business/BLOCO_3_JUR_API.md, registrar o nível 'approve' para POST /contracts/:id/approve na tabela de endpoints (o endpoint hoje não consta na tabela §2). Esta é a ÚNICA edição permitida em docs/ neste caso — é parte do escopo autorizado da Falha 2, não uma exceção geral à regra de não tocar docs/.

F4-A — Bloquear mesmo aprovador em papéis diferentes do mesmo contrato:
Em ApproveContractUseCase.execute, antes do create e depois do dedup por papel existente, carregar as aprovações já existentes do contrato (método listByContract já existe no repositório) e rejeitar se algum approver_user_id já registrado for igual ao input.approverUserId. Implemente como função nova assertApproverIsNotPriorApprover em shared/domain/segregationOfDuties.ts, reaproveitando isSelfApproval e o formato de BusinessRuleError já usado ali, com nova entrada em SEGREGATION_RULES (ex. JUR_CONTRACT_AUTHORITY: 'D-K-JURIDICO'). role === 'admin' NÃO isenta desta checagem.

F4-C — Defesa no banco (condicional):
Antes de criar qualquer migration, verifique count(*) na tabela jur_contract_approvals no banco de teste (erp_evok_audio_test). Se count for 0, adicione migration criando índice único parcial ou constraint unique(contract_id, approver_user_id). Se count for maior que 0, NÃO migre — reporte o número no REMEDIATION_EVIDENCE_PACKAGE.md e deixe F4-C como pendência.

Testes obrigatórios (TRIAGE.md §9, apenas os marcados "Depende de decisão? Não"):
- Testes de INTEGRAÇÃO HTTP (não unitários — instanciar o use case direto não expõe as Falhas 2 e 4), em novo arquivo server/tests/integration/jur-contract-authority-find-erp-005.test.ts, cada describe referenciando FIND-ERP-005 e RF-JUR-003:
  R2(a),(b): perfil com diretor:'operate' → POST .../approve = 403; idem financeiro:'operate'; assert 0 linhas em jur_contract_approvals.
  R2(c): perfil diretor:'approve' → 201, 1 linha gravada.
  R2(d): contrato de valor alto, apenas com a tentativa negada → POST .../activate por juridico:operate falha com regra RF-JUR-003; status do contrato inalterado.
  R4(a): admin A registra diretor, tenta financeiro no mesmo contrato → rejeitado; exatamente 1 linha.
  R4(b): A (diretor:approve) + B (financeiro:approve) → 2 linhas; ativação permitida.
  R4(c): dois admins DISTINTOS (usar authToken() + o segundo token do helper de teste) em papéis diferentes → permitido (prova que a rejeição é por identidade, não por role).
  R5(b): unitário — instanciar ActivateContractUseCase sem approvalRepository → deve lançar erro.
  R6(b),(c): suíte completa de juridico-contract-use-cases.test.ts continua verde, sem alteração de asserção em :174-333.
- Use contract_type fora da lista employment/supplier/nda para não arrastar o checklist de ativação para dentro dos testes de alçada.
- contract_number é varchar(20) — use identificadores curtos.

Prova vermelha:
- Execute os testes novos contra o estado anterior (antes da sua mudança) e registre quais falharam.

Validação depois:
- Execute os testes novos.
- Execute a suíte completa de testes do módulo jurídico (unitários + integração).
- Execute typecheck/build do server se node_modules estiver disponível na worktree; senão, instale ali; se não for possível, registre a lacuna.

Evidência obrigatória:
- Gere remediation/cases/ERP-LEGACY-001-CASE-002/REMEDIATION_EVIDENCE_PACKAGE.md.
- Documente: causa-raiz das Falhas 2 e 4, estratégia aplicada (F2-A a F2-D, F4-A, F4-C ou motivo de F4-C não aplicada), arquivos alterados, testes adicionados, prova vermelha, prova verde, contagem de perfis com diretor/financeiro:'operate' que perderão a aprovação (levantamento pedido pela triagem §3.3 — query read-only no banco de teste), e que Falhas 1 e 3 permanecem inteiramente fora deste pacote, pendentes das 3 perguntas ao dono.
- Termine o pacote com REMEDIATION_COMPLETE (referente apenas às Falhas 2 e 4).
- Nunca escreva FINDING CLOSED nem RETEST_PASSED.

Ao terminar:
- Commit na branch sana/ERP-LEGACY-001/CASE-002, não em main.
- Pare aguardando revisão/segunda opinião/reteste.
```

## 2. O que fica de fora (não inventar)

Falhas 1 (thresholds hard-coded) e 3 (aditivo eleva valor sem reabrir alçada)
permanecem bloqueadas até o dono responder as 3 perguntas de `TRIAGE.md` §8
(origem do valor de alçada, nível do endpoint de aditivo, extensão de D-K ao
Jurídico). Não incluídas aqui por decisão de método, não por esquecimento.
</content>
