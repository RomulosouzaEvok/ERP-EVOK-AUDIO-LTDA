> **OBSOLETO — NÃO ENVIAR AO CODEX.** Descoberto em 2026-08-17 que este caso já foi
> implementado integralmente em outra worktree/branch, com evidência própria e estado
> `READY_FOR_RETEST`/`REMEDIATION_COMPLETE`. Ver worktree correspondente para a
> evidência real. Este despacho foi gerado por engano, sem visibilidade daquele
> trabalho anterior, e não deve ser usado. Mantido apenas para rastreabilidade do erro.

# Despacho Codex — `ERP-LEGACY-001-CASE-004` (Estágio 1 apenas, item A)

```
CASE_ID:      ERP-LEGACY-001-CASE-004
FINDING_ID:   ERP-LEGACY-001-AUD-001 / AUD-ALOG-01 (item A apenas)
ESCOPO:       DELETE /api/employees/:id — ausência de logAction (soft delete sem trilha)
BASE:         remediation/cases/ERP-LEGACY-001-CASE-004/TRIAGE_REPORT.md, secoes 2 e 4 (Estagio 1)
DECISOES:     nenhuma decisao do dono pendente para este estagio (triagem confirmou execucao imediata)
DESTINO:      sanacore-remediation-engineer / Codex
```

## 1. Por que este estágio pode ir agora

O item B (`items`) deste mesmo caso depende de uma decisão de desenho (rota `OR-21`,
UUID × `audit_logs.entity_id integer`) que ainda não foi registrada — **por isso o
item B NÃO está neste despacho**. O item A (`employees`) não tem nenhuma dependência:
schema inalterado, contrato HTTP inalterado, regra de negócio intocada.

## 2. Prompt literal para colar no Codex

```text
Você está atuando como sanacore-remediation-engineer dentro da estrutura CoreTriad deste repositório.

Implemente o CASE-004, Estágio 1 (item A) — SOMENTE este item, não o item B:

CASE_ID: ERP-LEGACY-001-CASE-004
FINDING_ID: ERP-LEGACY-001-AUD-001 / AUD-ALOG-01, item A
Escopo autorizado: DELETE /api/employees/:id (soft delete de funcionário) não grava audit_logs.

Trabalhe exclusivamente na worktree/branch:
  worktree: C:\Sistema EvokAudio\ERP-Evok-sana-CASE-004
  branch:   sana/ERP-LEGACY-001/CASE-004

Se a worktree ainda não existir, crie-a a partir da base adequada do repositório, sem tocar em main.

Regras absolutas:
- NÃO conecte em erp_evok_audio (produção), nem para contar linhas.
- Não execute operação destrutiva em banco real.
- Nenhuma migration é criada, alterada ou aplicada neste estágio.
- Use testes unitários com mock; não abra Sequelize real, não importe app.ts por acidente.
- Não toque em audit/, coretriad/governance/, coretriad/states/, .claude/ ou docs/.
- NÃO toque no item B (items) nem em qualquer arquivo do módulo items/.
- Não declare FINDING CLOSED nem RETEST_PASSED. Essa autoridade é exclusiva da VeriCore.

Leitura obrigatória antes de editar:
1. Leia integralmente remediation/cases/ERP-LEGACY-001-CASE-004/TRIAGE_REPORT.md — sobretudo §2 (causa-raiz e desenho do item A) e §4 Estágio 1.
2. Leia server/src/modules/employees/presentation/controllers/employeeController.ts (função remove).
3. Leia server/src/modules/employees/application/use-cases/DeactivateEmployeeUseCase.ts.
4. Leia o padrão de referência já existente no repositório:
   - server/src/modules/products/presentation/controllers/productController.ts (linhas ~192-208, padrão de logAction após before/after)
   - server/src/modules/users/application/use-cases/DeactivateUserUseCase.ts (linhas ~46-54)
5. Leia server/src/services/auditLogService.ts (logAction) e server/src/models/AuditLog.ts (register, extração de USER/IP/rota do req).
6. Leia server/tests/unit/audit-coverage-guard.test.ts, linhas 49-63 (lista DEBITO_CONHECIDO).

Causa-raiz:
- O módulo employees nunca teve o padrão de auditoria instalado — zero chamada de logAction em qualquer camada.
- A guarda de cobertura (audit-coverage-guard.test.ts) isenta 'employees' via DEBITO_CONHECIDO, mascarando a omissão.

Estratégia autorizada (única, sem ramos — já decidida pela triagem):
1. Em employeeController.ts, antes de chamar o use case em remove(), ler o estado anterior do funcionário (before = await employeesRepository.findById(req.params.id) — repositório já é instanciado no controller).
2. Executar o use case existente sem mudar sua assinatura nem seu retorno.
3. Após sucesso, chamar logAction(req, { action: 'soft_delete', entityType: 'Employee', entityId: before.id, entityDescription: <chave humana não sensível, ex. matrícula/nome funcional>, oldValues: { status: before.status, dismissal_date: before.dismissal_date }, newValues: { status: 'inactive', dismissal_date: <data gravada> }, description: '...' }).
4. RESTRIÇÃO VINCULANTE (privacidade — AUD-DB-08/BR-RH-020): oldValues/newValues devem conter APENAS os campos status e dismissal_date. NUNCA serialize a entidade inteira (before.toJSON()) — isso exporia salário, CPF, dados bancários. entityDescription NUNCA deve usar CPF.
5. Remova 'employees' de DEBITO_CONHECIDO em server/tests/unit/audit-coverage-guard.test.ts (linhas 49-63) — essa quebra de teste é esperada e faz parte da correção.
6. NÃO altere a assinatura nem o retorno de DeactivateEmployeeUseCase. NÃO altere client/src/api/employees.ts.

Testes obrigatórios:
- Teste de regressão novo (unitário, com mock de auditLogService.logAction — sem banco real) provando:
  a) logAction é chamado ao desligar um funcionário;
  b) action === 'soft_delete', entityType === 'Employee';
  c) oldValues e newValues contêm apenas status e dismissal_date (nada mais — assert explícito de que campos sensíveis NÃO estão presentes);
  d) o req é repassado a logAction (garantia de autoria/origem).
- Verifique que server/tests/unit/rh-deactivate-employee-termination-guard.test.ts continua verde sem alteração de asserção.
- audit-coverage-guard.test.ts deve passar após a remoção de 'employees' da lista.

Prova vermelha:
- Execute o teste novo contra o estado anterior (antes da sua mudança) e registre que falha.

Validação depois:
- Execute os testes novos.
- Execute a suíte unitária de employees e a audit-coverage-guard.test.ts.
- Execute typecheck/build do server se node_modules estiver disponível na worktree; se não, instale ali. Se não for possível, registre a lacuna.

Evidência obrigatória:
- Gere remediation/cases/ERP-LEGACY-001-CASE-004/REMEDIATION_EVIDENCE_PACKAGE.md.
- Documente: causa-raiz, estratégia aplicada, arquivos alterados, testes adicionados, prova vermelha, prova verde, e que o item B (items) permanece fora deste pacote, pendente de decisão OR-21.
- Termine o pacote com REMEDIATION_COMPLETE (referente apenas ao item A).
- Nunca escreva FINDING CLOSED nem RETEST_PASSED.

Ao terminar:
- Commit na branch sana/ERP-LEGACY-001/CASE-004, não em main.
- Pare aguardando revisão/segunda opinião/reteste.
```

## 3. O que fica de fora (não inventar)

Item B (`items`) fica bloqueado até o dono confirmar a Rota 2 (contorno documentado
do UUID) ou a Rota 1 (migration em `audit_logs`, mais cara) — ver
`TRIAGE_REPORT.md` §3.3-3.4. Não incluído aqui por decisão de método, não por
esquecimento.
</content>
