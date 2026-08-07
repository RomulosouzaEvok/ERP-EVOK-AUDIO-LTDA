/**
 * Use case: criar uma EntregaEPI em rascunho (RF-SST-004/006, BR-SST-001).
 *
 * @module modules/sst/application/use-cases/epi/CreateEpiDeliveryUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EpiRepository from '../../../domain/repositories/EpiRepository';
import { ValidationError, NotFoundError, BusinessRuleError } from '../../../../../errors';
import { toEntregaDTO } from '../../../infrastructure/mappers/EpiMapper';

const MOTIVOS = ['primeira_entrega', 'troca_periodica', 'dano', 'perda', 'mudanca_funcao'];

interface CreateEpiDeliveryInput {
  body: Record<string, any>;
  entreguePor: number;
}

class CreateEpiDeliveryUseCase extends UseCase<CreateEpiDeliveryInput, any> {
  private readonly epiRepository: EpiRepository;

  public constructor(epiRepository: EpiRepository) {
    super();
    this.epiRepository = epiRepository;
  }

  /**
   * @param input - Payload da entrega + id do usuário autenticado (`entregue_por`, nunca do body — BLOCO_1_SST_API.md §"Autenticação").
   * @returns Entrega criada, em `status: "rascunho"`, com `data_prevista_troca` calculada.
   * @throws {ValidationError} Se campos obrigatórios ausentes ou `motivo` inválido (400).
   * @throws {NotFoundError} Se `epi_type_id` não existir (404).
   * @throws {BusinessRuleError} Se o CA do TipoEPI já estiver vencido na `data_entrega` (BR-SST-001, 422).
   */
  public async execute({ body, entreguePor }: CreateEpiDeliveryInput): Promise<any> {
    const { employee_id, epi_type_id, quantidade, motivo, data_entrega } = body;
    if (!employee_id || !epi_type_id || !quantidade || !motivo || !data_entrega) {
      throw new ValidationError('employee_id, epi_type_id, quantidade, motivo e data_entrega são obrigatórios.');
    }
    if (!MOTIVOS.includes(motivo)) {
      throw new ValidationError(`motivo inválido. Valores aceitos: ${MOTIVOS.join(', ')}.`);
    }

    const tipo = await this.epiRepository.findTipoById(epi_type_id);
    if (!tipo) throw new NotFoundError('Tipo de EPI informado não existe.');

    const dataEntrega = new Date(data_entrega);
    const caValidade = new Date(tipo.ca_validade);
    if (caValidade < dataEntrega) {
      throw new BusinessRuleError('CA do Tipo de EPI já está vencido na data da entrega (BR-SST-001).', { ca_validade: tipo.ca_validade });
    }

    let dataPrevistaTroca: string | null = null;
    if (tipo.vida_util_dias > 0) {
      const troca = new Date(dataEntrega);
      troca.setDate(troca.getDate() + tipo.vida_util_dias);
      dataPrevistaTroca = troca.toISOString().slice(0, 10);
    }

    const entrega = await this.epiRepository.createEntrega({
      employee_id,
      tipo_epi_id: epi_type_id,
      quantidade,
      data_entrega,
      motivo,
      data_prevista_troca: dataPrevistaTroca,
      confirmada: false,
      entregue_por: entreguePor
    });

    const withTipo = await this.epiRepository.findEntregaById(entrega.id);
    return toEntregaDTO(withTipo);
  }
}

export = CreateEpiDeliveryUseCase;
