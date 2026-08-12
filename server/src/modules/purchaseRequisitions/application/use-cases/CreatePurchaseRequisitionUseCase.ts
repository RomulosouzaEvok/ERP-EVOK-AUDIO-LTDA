import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../errors';
import ItemRepository from '../../../items/domain/repositories/ItemRepository';
import PurchaseRequisitionRepository from '../../domain/repositories/PurchaseRequisitionRepository';

/**
 * Bloco 2 (UC-39, BUSINESS_RULES.md §9): origem de amostra da engenharia.
 * Ver `RequisitionsPage.tsx` (client) — mesma convenção compartilhada.
 */
const ENGINEERING_SAMPLE_ORIGIN = 'engenharia_amostra';

class CreatePurchaseRequisitionUseCase extends UseCase<Record<string, any>, any> {
  private readonly requisitionRepository: PurchaseRequisitionRepository;
  private readonly itemRepository: ItemRepository;

  constructor(requisitionRepository: PurchaseRequisitionRepository, itemRepository: ItemRepository) {
    super();
    this.requisitionRepository = requisitionRepository;
    this.itemRepository = itemRepository;
  }

  /**
   * Cria uma requisicao de compra com seus itens.
   *
   * Bloco 2 (UC-39, BUSINESS_RULES.md §9): `origin='engenharia_amostra'`
   * reaproveita 100% este mesmo fluxo de criacao — nenhuma maquina de
   * estados nova. `engineering_project_id` e sempre opcional (mesmo para
   * amostra de engenharia); quando informado, valida a existencia do
   * projeto antes de criar a requisicao (404 didatico), para qualquer
   * `origin`.
   *
   * Bloco 2 (UC-39): quando `origin === 'engenharia_amostra'`, a
   * justificativa da amostra e obrigatoria. Nao existe coluna dedicada
   * `justificativa` em `purchase_requisitions` (decisao de reaproveitar o
   * campo `notes`, ja livre, em vez de nova migration) — o texto informado
   * em `notes` e a propria justificativa nesse caso.
   *
   * Bloco C (docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md): `department_id`
   * nunca e aceito do cliente (nao existe mais no schema Zod de entrada
   * relevante para este calculo) — e sempre resolvido a partir do
   * `Employee` vinculado ao usuario autenticado (`requester_id` ->
   * `Employee.user_id` -> `Employee.department_id`), mesmo padrao de
   * `requester_id`/`approved_by` (identidade nunca confia em payload do
   * cliente). Se o usuario nao tiver `Employee` vinculado (ex.: admin sem
   * cadastro de funcionario), `department_id` fica `null` — a requisicao
   * ainda e criada normalmente, apenas sem fila de departamento associada.
   *
   * @param input - Payload validado pelo controller (`createPurchaseRequisitionSchema`) + `requester_id`/`transaction` injetados.
   * @returns A requisicao criada, com itens e relacionamentos carregados.
   * @throws {NotFoundError} Se `engineering_project_id` for informado e nao corresponder a um projeto existente, ou se algum `item_id` nao existir.
   * @throws {BusinessRuleError} Se `origin === 'engenharia_amostra'` e `notes` (justificativa) nao for informado. HTTP 422.
   */
  async execute(input: Record<string, any>): Promise<any> {
    if (input.origin === ENGINEERING_SAMPLE_ORIGIN && !String(input.notes ?? '').trim()) {
      throw new BusinessRuleError(
        'Justificativa obrigatoria para requisicao de amostra de engenharia (origin=engenharia_amostra). Informe o motivo em "notes".',
      );
    }

    if (input.engineering_project_id) {
      const project = await this.requisitionRepository.findEngineeringProjectById(
        input.engineering_project_id,
        input.transaction,
      );
      if (!project) {
        throw new NotFoundError(`Projeto de engenharia ${input.engineering_project_id} nao encontrado.`);
      }
    }

    const requesterEmployee = input.requester_id
      ? await this.requisitionRepository.findEmployeeByUserId(input.requester_id, input.transaction)
      : null;

    // Numeracao no padrao do ERP (`RQ-YYYY-NNNN`, serializada por advisory
    // lock no repositorio), no lugar do antigo `RQ-${Date.now()}` — achado
    // BAIXO 15 da auditoria de 2026-08-11. O carimbo de tempo nao ordenava,
    // nao dizia nada ao usuario e colidia entre duas requisicoes criadas no
    // mesmo milissegundo, numa coluna `UNIQUE`.
    const requisitionNumber = await this.requisitionRepository.nextRequisitionNumberForYear(
      `RQ-${new Date().getFullYear()}`,
      input.transaction,
    );

    const requisition = await this.requisitionRepository.createRequisition({
      requisition_number: requisitionNumber,
      requester_id: input.requester_id,
      department_id: requesterEmployee?.department_id ?? null,
      production_order_id: input.production_order_id ?? null,
      engineering_project_id: input.engineering_project_id ?? null,
      request_date: input.request_date ?? new Date(),
      priority: input.priority ?? 'normal',
      status: input.status ?? 'pending',
      origin: input.origin ?? 'manual',
      // Aprovacao nunca nasce no create: exige fluxo proprio de aprovacao.
      approved_by: null,
      approval_date: null,
      notes: input.notes ?? null,
    }, input.transaction);

    for (const item of input.items ?? []) {
      const existingItem = await this.itemRepository.findById(String(item.item_id));
      if (!existingItem) {
        throw new NotFoundError(`Item ${item.item_id} nao encontrado`);
      }

      await this.requisitionRepository.createRequisitionItem({
        requisition_id: requisition.id,
        item_id: item.item_id,
        quantity: item.quantity,
        unit: item.unit ?? null,
        required_date: item.required_date ?? null,
        suggested_supplier_id: item.suggested_supplier_id ?? null,
        unit_price_estimated: item.unit_price_estimated ?? null,
        status: item.status ?? 'pending',
        notes: item.notes ?? null,
      }, input.transaction);
    }

    return this.requisitionRepository.findRequisitionById(requisition.id, input.transaction);
  }
}

export = CreatePurchaseRequisitionUseCase;

