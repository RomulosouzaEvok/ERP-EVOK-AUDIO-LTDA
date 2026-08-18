# Despacho Codex — `ERP-LEGACY-001-CASE-014` (itens C, F, G de `AUD-ALOG-01`)

```
CASE_ID:      ERP-LEGACY-001-CASE-014
FINDING_ID:   ERP-LEGACY-001-AUD-001 / AUD-ALOG-01 (itens C, F, G apenas)
ESCOPO:       DELETE /api/items/:id/suppliers/:linkId (item C, ItemSupplier)
              DELETE /api/categories/:id (item F, Category)
              DELETE /api/departments/:id (item G, Department)
BASE:         remediation/cases/ERP-LEGACY-001-CASE-014/TRIAGE.md, secoes 2 e 5
DECISOES:     nenhuma decisao de negocio pendente para este escopo. Pendencia de
              registro (nao bloqueante): TRIAGE.md secao "Autorizacao de escopo"
              e secao 8 — nao ha entrada dedicada em APPROVALS.md nomeando
              CASE-014 (diferente de CASE-004/APR-2026-033); a base de
              autorizacao e APR-2026-031 D-13 item 2 + T-39 secao 2.2.
DESTINO:      sanacore-remediation-engineer / Codex
```

## 1. Por que este caso pode ir agora

Os três itens (C, F, G) não têm dependência bloqueante: schema inalterado
nos três (todas as PKs envolvidas são `INTEGER`, nenhuma carrega o
obstáculo `OR-21`/`AUD-DB-04` que bloqueou o item B em `CASE-004` — ver
`TRIAGE.md` §2.2), contrato HTTP inalterado, regra de negócio intocada, e
**nenhum teste existente exercita hoje os três call sites** (busca própria
em `TRIAGE.md` §1), o que reduz o risco de regressão a essencialmente zero
no conteúdo — a única quebra prevista e esperada é a catraca de
`audit-coverage-guard.test.ts`.

**Atenção de coordenação (não é decisão, é sequenciamento):** este caso
edita `server/src/modules/items/presentation/controllers/itemController.ts`
(função `removeSupplier`, linha ~205) — arquivo também tocado por
`CASE-004`/item B (função `inactivate`, linha ~138), em worktree separada.
Os dois **também** precisam editar a mesma lista `DEBITO_CONHECIDO` em
`server/tests/unit/audit-coverage-guard.test.ts`, removendo `'items'`. Ver
§3 abaixo — regra explícita para não duplicar a remoção nem reintroduzir a
entrada.

## 2. Prompt literal para colar no Codex

```text
Você está atuando como sanacore-remediation-engineer dentro da estrutura CoreTriad deste repositório.

Implemente o CASE-014 — itens C, F, G do finding AUD-ALOG-01. NÃO implemente nada além destes três call sites.

CASE_ID: ERP-LEGACY-001-CASE-014
FINDING_ID: ERP-LEGACY-001-AUD-001 / AUD-ALOG-01, itens C, F, G
Escopo autorizado:
  - Item C: DELETE /api/items/:id/suppliers/:linkId (itemController.ts, função removeSupplier) — não grava audit_logs.
  - Item F: DELETE /api/categories/:id (categoryController.ts, função remove) — não grava audit_logs.
  - Item G: DELETE /api/departments/:id (departmentController.ts, função remove) — não grava audit_logs.

Trabalhe exclusivamente na worktree/branch:
  worktree: C:\Sistema EvokAudio\ERP-Evok-sana-CASE-014
  branch:   sana/ERP-LEGACY-001/CASE-014

Se a worktree ainda não existir, crie-a a partir da base adequada do repositório, sem tocar em main.

Regras absolutas:
- NÃO conecte em erp_evok_audio (produção), nem para contar linhas.
- Não execute operação destrutiva em banco real.
- Nenhuma migration é criada, alterada ou aplicada neste caso.
- Use testes unitários com mock; não abra Sequelize real, não importe app.ts por acidente.
- Não toque em audit/, coretriad/governance/, coretriad/states/, .claude/ ou docs/.
- NÃO toque nos itens D (supplierController.ts), E (clientController.ts), H (assetController.ts) nem no parcial de saleController.ts:342-360 — ficam fora deste caso, classificados DEV/HOMOLOGAÇÃO, fila normal.
- NÃO toque na função itemController.ts:inactivate (item B) nem em DeactivateItemUseCase.ts — pertencem a CASE-004, worktree separada. Edite SOMENTE a função removeSupplier.
- Não declare FINDING CLOSED nem RETEST_PASSED. Essa autoridade é exclusiva da VeriCore.
- Capture e registre no pacote de evidência o OUTPUT REAL dos comandos executados (typecheck, testes) — não apenas a alegação em texto.

Leitura obrigatória antes de editar:
1. Leia integralmente remediation/cases/ERP-LEGACY-001-CASE-014/TRIAGE.md — sobretudo §2 (causa-raiz e desenho de C/F/G) e §4 (coordenação com CASE-004).
2. Leia server/src/modules/items/presentation/controllers/itemController.ts, função removeSupplier (linhas ~203-211).
3. Leia server/src/modules/items/application/use-cases/DeactivateItemSupplierUseCase.ts e server/src/models/ItemSupplier.ts (confirmar id INTEGER, não confundir com item_id UUID).
4. Leia server/src/modules/categories/presentation/controllers/categoryController.ts, função remove (linhas ~64-72), e server/src/modules/categories/application/use-cases/DeactivateCategoryUseCase.ts, e server/src/models/Category.ts.
5. Leia server/src/modules/departments/presentation/controllers/departmentController.ts, função remove (linhas ~63-71), e server/src/modules/departments/application/use-cases/DeactivateDepartmentUseCase.ts, e server/src/models/Department.ts.
6. Leia o padrão de referência já existente no repositório:
   - server/src/modules/products/presentation/controllers/productController.ts (linhas ~192-208, padrão de logAction após before/after)
   - server/src/modules/users/application/use-cases/DeactivateUserUseCase.ts (linhas ~46-54)
7. Leia server/src/services/auditLogService.ts (logAction) e server/src/models/AuditLog.ts (register, extração de USER/IP/rota do req).
8. Leia server/tests/unit/audit-coverage-guard.test.ts por inteiro, especialmente DEBITO_CONHECIDO (linhas ~49-63) e as três asserções do describe.

Causa-raiz (comum aos três, detalhada em TRIAGE.md §2):
- categories e departments nunca tiveram o padrão de auditoria instalado em nenhuma camada.
- items (recorte do item C) já está parcialmente em remediação por CASE-004 (função inactivate, item B), mas o handler removeSupplier é diferente e continua mudo, independente do desfecho de B.
- Diferença importante de C em relação a B: a entidade auditada em C é o vínculo ItemSupplier, cuja PK é INTEGER (não o Item, que é UUID) — portanto C NÃO carrega a dependência OR-21/AUD-DB-04 que bloqueou parte de B. Não use contorno de UUID aqui; entityId é um número válido.

Estratégia autorizada (única, sem ramos — já decidida pela triagem, TRIAGE.md §2.4):

ITEM C — itemController.ts, função removeSupplier:
1. Antes de instanciar o use case, leia o estado anterior: const before = await itemSupplierRepository.findById(Number(req.params.linkId)) (o repositório já é instanciado no controller; findById já existe).
2. Execute o use case existente sem mudar sua assinatura nem seu retorno.
3. Após sucesso, chame:
   logAction(req, {
     action: 'soft_delete',
     entityType: 'ItemSupplier',
     entityId: before.id,
     entityDescription: `item ${before.item_id} x fornecedor ${before.supplier_id}`,
     oldValues: { active: before.active, preferred: before.preferred },
     newValues: { active: false, preferred: false },
     description: `Vínculo item-fornecedor #${before.id} desativado`,
   });
4. RESTRIÇÃO: oldValues/newValues contêm APENAS active e preferred. NUNCA serialize before.toJSON() inteiro (evita expor unit_price/moq/notes sem necessidade).

ITEM F — categoryController.ts, função remove:
1. const before = await categoriesRepository.findById(req.params.id) antes do execute do use case.
2. Execute o use case existente sem mudar assinatura nem retorno.
3. Após sucesso, chame:
   logAction(req, {
     action: 'soft_delete',
     entityType: 'Category',
     entityId: before.id,
     entityDescription: before.name,
     oldValues: { active: before.active },
     newValues: { active: false },
     description: `Categoria ${before.name} inativada`,
   });
4. RESTRIÇÃO: oldValues/newValues contêm APENAS active.

ITEM G — departmentController.ts, função remove:
1. const before = await departmentsRepository.findById(req.params.id) antes do execute do use case.
2. Execute o use case existente sem mudar assinatura nem retorno.
3. Após sucesso, chame:
   logAction(req, {
     action: 'soft_delete',
     entityType: 'Department',
     entityId: before.id,
     entityDescription: `${before.sigla} — ${before.name}`,
     oldValues: { active: before.active },
     newValues: { active: false },
     description: `Departamento ${before.name} inativado`,
   });
4. RESTRIÇÃO: oldValues/newValues contêm APENAS active.

Guarda de cobertura (server/tests/unit/audit-coverage-guard.test.ts):
- Remova 'categories' e 'departments' da lista DEBITO_CONHECIDO (linhas ~49-63) — obrigatório, essas duas entradas nunca dependem de outro caso.
- 'items' (linha ~56): ANTES de remover, verifique se já foi removido por outro commit/caso (CASE-004, worktree separada, também precisa remover 'items' quando o item B for mesclado). Se 'items' já não estiver na lista quando você chegar a esta etapa, NÃO reintroduza a entrada e NÃO trate isso como erro — apenas confirme e siga. Se ainda estiver na lista, remova (a mudança de removeSupplier já basta para satisfazer temAuditoria('items') == true, independente do estado de B).

Testes obrigatórios (unitários, com mock de auditLogService.logAction — sem banco real), um arquivo por item ou um arquivo único cobrindo os três, referenciando AUD-ALOG-01 e o item (C/F/G) na descrição do describe:
- Item C: logAction chamado ao desativar vínculo item-fornecedor; action === 'soft_delete', entityType === 'ItemSupplier'; entityId === before.id (numérico); oldValues/newValues contêm apenas active e preferred (assert explícito de que unit_price/moq/notes NÃO estão presentes); req repassado a logAction.
- Item F: logAction chamado ao inativar categoria; action === 'soft_delete', entityType === 'Category'; oldValues/newValues contêm apenas active; req repassado.
- Item G: logAction chamado ao inativar departamento; action === 'soft_delete', entityType === 'Department'; oldValues/newValues contêm apenas active; req repassado.
- audit-coverage-guard.test.ts deve passar após as remoções de 'categories' e 'departments' (e de 'items', se ainda estiver lá).

Prova vermelha:
- Execute os três testes novos contra o estado anterior (antes da sua mudança) e registre que falham.

Validação depois:
- Execute os testes novos.
- Execute as suítes unitárias existentes de items (item-suppliers.test.ts), categories (categories-use-cases.test.ts) e departments (departments-use-cases.test.ts) — nenhuma asserção existente deve mudar, porque nenhuma delas cobre os call sites de desativação hoje (confirmado em TRIAGE.md §1); se alguma quebrar, investigue antes de prosseguir, não ajuste a asserção para "fazer passar".
- Execute audit-coverage-guard.test.ts.
- Execute typecheck/build do server se node_modules estiver disponível na worktree; se não, instale ali. Se não for possível, registre a lacuna.

Evidência obrigatória:
- Gere remediation/cases/ERP-LEGACY-001-CASE-014/REMEDIATION_EVIDENCE_PACKAGE.md.
- Documente, para cada item (C, F, G) separadamente: causa-raiz, estratégia aplicada, arquivo:linha alterado, teste adicionado, prova vermelha, prova verde.
- Documente explicitamente: (a) que C não carrega OR-21/AUD-DB-04 (PK INTEGER, não UUID) e por quê; (b) o estado em que você encontrou a entrada 'items' em DEBITO_CONHECIDO (já removida por CASE-004 ou removida por você agora) — para rastreabilidade de coordenação entre os dois casos; (c) que create/update de categories, departments e a criação/atualização de vínculo item-fornecedor continuam sem logAction — a guarda de cobertura não cobre isso por ser granularidade de módulo, não é regressão introduzida por este caso.
- Termine o pacote com REMEDIATION_COMPLETE (referente apenas a C, F, G).
- Nunca escreva FINDING CLOSED nem RETEST_PASSED.

Ao terminar:
- Faça uma varredura no diff final por chave e por valor à procura de dado sensível antes de commitar: nenhuma das três entidades tem CPF/salário/dado bancário, mas confirme que nenhum oldValues/newValues carrega unit_price, moq, notes, description ou qualquer campo além dos explicitamente listados acima (active/preferred).
- Commit na branch sana/ERP-LEGACY-001/CASE-014, não em main.
- Pare aguardando revisão/segunda opinião/reteste.
```

## 3. Regra de coordenação com `CASE-004` — não inventar resolução de conflito

`CASE-004` (item B) e este caso (item C) tocam o mesmo arquivo
(`itemController.ts`) em funções diferentes e a mesma lista
(`DEBITO_CONHECIDO`) no mesmo teste. Não é conflito de lógica de negócio —
é sequenciamento de merge. Regra para quem mesclar:

1. Mesclar um caso de cada vez, nunca em paralelo sem rebase.
2. Antes de tocar `DEBITO_CONHECIDO`, conferir o estado atual da lista no
   branch de destino. Se `'items'` já foi removida pelo outro caso, não
   reintroduzir. Se ainda está lá, remover é obrigatório assim que
   `removeSupplier` (C) OU `inactivate` (B) tiver `logAction` — o que
   ocorrer primeiro já satisfaz `temAuditoria('items')`.
3. Nenhum dos dois casos bloqueia o outro tecnicamente; a única coisa que
   não pode acontecer é os dois casos declararem, cada um por conta
   própria e sem olhar o outro, "remoção de `'items'` concluída" e um
   deles sobrescrever o trabalho do outro num merge apressado.

## 4. O que fica de fora (não inventar)

Itens D (`supplierController.ts:121`), E (`clientController.ts:80`), H
(`assetController.ts:81`) e o parcial de `sales`
(`saleController.ts:342-360`) permanecem classificados DEV/HOMOLOGAÇÃO,
fila normal — não incluídos aqui por decisão de escopo do despacho
recebido (ver `TRIAGE.md` §6, item 6, sobre o custo marginal registrado e
não executado de incluí-los no mesmo lote).
