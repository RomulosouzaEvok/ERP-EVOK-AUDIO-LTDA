/**
 * Caso de uso para registrar um processo de importacao (UC-19, passos 1-4:
 * "Registra processo de importacao", "Informa dados: fornecedor, produto,
 * quantidade, valor FOB", "Sistema calcula tributos de importacao").
 *
 * O numero do processo segue o padrao `IMP-<ano>-XXXX` (sequencial por ano,
 * calculado por contagem — mesma limitacao de concorrencia ja documentada
 * em `RfqRepository.countRfqsInYear`). Os tributos e o custo unitario
 * nacionalizado de cada item sao calculados e persistidos imediatamente
 * (via {@link calculateImportProcessTaxes}), para que o processo `draft` ja
 * mostre uma estimativa de custo nacionalizado antes do embarque.
 *
 * @module modules/comex/application/use-cases/CreateImportProcessUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../errors';
import ComexRepository from '../../domain/repositories/ComexRepository';
import ItemRepository from '../../../items/domain/repositories/ItemRepository';
import { calculateImportProcessTaxes } from './importTaxCalculator';

interface ImportProcessItemInput {
  item_id: string;
  quantity: number;
  fob_unit_price: number;
  ii_rate: number;
  ipi_rate: number;
  pis_rate: number;
  cofins_rate: number;
  icms_rate: number;
}

interface CreateImportProcessInput {
  supplier_id: number;
  fob_currency: string;
  exchange_rate: number;
  freight_value: number;
  insurance_value: number;
  other_expenses_value: number;
  notes?: string;
  items: ImportProcessItemInput[];
  created_by: number;
  transaction: any;
}

class CreateImportProcessUseCase extends UseCase<CreateImportProcessInput, any> {
  private readonly comexRepository: ComexRepository;
  private readonly itemRepository: ItemRepository;

  public constructor(comexRepository: ComexRepository, itemRepository: ItemRepository) {
    super();
    this.comexRepository = comexRepository;
    this.itemRepository = itemRepository;
  }

  /**
   * @param input - Payload validado pelo controller + `created_by`/`transaction` injetados.
   * @returns O processo de importacao criado, com itens carregados (tributos/custo ja calculados).
   * @throws {NotFoundError} Se `supplier_id` nao corresponder a um fornecedor existente, ou se algum `item_id` nao existir.
   * @throws {BusinessRuleError} Se `items` estiver vazio.
   */
  public async execute(input: CreateImportProcessInput): Promise<any> {
    if (!input.items || input.items.length === 0) {
      throw new BusinessRuleError('Informe ao menos um item para o processo de importacao.');
    }

    const supplier = await this.comexRepository.findSupplierById(input.supplier_id, input.transaction);
    if (!supplier) {
      throw new NotFoundError(`Fornecedor ${input.supplier_id} nao encontrado.`);
    }

    for (const item of input.items) {
      const existingItem = await this.itemRepository.findById(String(item.item_id));
      if (!existingItem) {
        throw new NotFoundError(`Item ${item.item_id} nao encontrado.`);
      }
    }

    const year = new Date().getFullYear();
    const sequential = (await this.comexRepository.countImportProcessesInYear(year, input.transaction)) + 1;
    const processNumber = `IMP-${year}-${String(sequential).padStart(4, '0')}`;

    const importProcess = await this.comexRepository.createImportProcess({
      process_number: processNumber,
      supplier_id: input.supplier_id,
      status: 'draft',
      fob_currency: input.fob_currency,
      exchange_rate: input.exchange_rate,
      freight_value: input.freight_value,
      insurance_value: input.insurance_value,
      other_expenses_value: input.other_expenses_value,
      notes: input.notes ?? null,
      created_by: input.created_by,
    }, input.transaction);

    const calculations = calculateImportProcessTaxes(
      {
        exchange_rate: input.exchange_rate,
        freight_value: input.freight_value,
        insurance_value: input.insurance_value,
        other_expenses_value: input.other_expenses_value,
      },
      input.items.map((item, index) => ({ id: index, ...item })),
    );

    for (const [index, item] of input.items.entries()) {
      const calculation = calculations[index];
      await this.comexRepository.createImportProcessItem({
        import_process_id: importProcess.id,
        item_id: item.item_id,
        quantity: item.quantity,
        fob_unit_price: item.fob_unit_price,
        ii_rate: item.ii_rate,
        ipi_rate: item.ipi_rate,
        pis_rate: item.pis_rate,
        cofins_rate: item.cofins_rate,
        icms_rate: item.icms_rate,
        customs_value: calculation.customs_value,
        ii_value: calculation.ii_value,
        ipi_value: calculation.ipi_value,
        pis_value: calculation.pis_value,
        cofins_value: calculation.cofins_value,
        icms_value: calculation.icms_value,
        nationalized_unit_cost: calculation.nationalized_unit_cost,
      }, input.transaction);
    }

    return this.comexRepository.findImportProcessById(importProcess.id, input.transaction);
  }
}

export = CreateImportProcessUseCase;
