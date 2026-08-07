/**
 * Use case: registrar inspeção de segurança com checklist (RF-SST-048/049).
 * Item não-conforme gera automaticamente uma `SstAcaoCorretiva`
 * (`origem: 'inspecao_seguranca'`); `risco_grave_iminente: true` apenas
 * sinaliza urgência na resposta (sem coluna dedicada, decisão do
 * `AdmDBA` — `BLOCO_1_SST_MODELO_DADOS.md` §9).
 *
 * @module modules/sst/application/use-cases/safetyRoutine/CreateInspectionUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import SafetyRoutineRepository from '../../../domain/repositories/SafetyRoutineRepository';
import { ValidationError } from '../../../../../errors';
import { toInspectionDTO } from '../../../infrastructure/mappers/SafetyRoutineMapper';

const PRAZO_URGENTE_DIAS = 1;
const PRAZO_PADRAO_DIAS = 15;

interface CreateInspectionInput {
  body: {
    department_id: number;
    checklist_modelo?: string;
    itens: Array<{ item: string; conforme: boolean; observacao?: string; risco_grave_iminente?: boolean; responsavel_id?: number }>;
  };
  inspetorId: number;
}

/** Soma N dias a hoje, retornando string YYYY-MM-DD. */
function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

class CreateInspectionUseCase extends UseCase<CreateInspectionInput, any> {
  private readonly repository: SafetyRoutineRepository;

  public constructor(repository: SafetyRoutineRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {ValidationError} `department_id` ou `itens` ausentes/vazios (400). */
  public async execute({ body, inspetorId }: CreateInspectionInput): Promise<any> {
    if (!body.department_id) throw new ValidationError('department_id é obrigatório.');
    if (!Array.isArray(body.itens) || body.itens.length === 0) throw new ValidationError('itens (checklist) é obrigatório e não pode ser vazio.');

    const inspecao = await this.repository.createInspection({
      department_id: body.department_id,
      data: new Date().toISOString().slice(0, 10),
      checklist_modelo: body.checklist_modelo ?? null,
      inspetor_id: inspetorId
    });

    const acoesCriadasIds: number[] = [];
    for (const item of body.itens) {
      let acaoCorretivaId: number | null = null;
      if (item.conforme === false) {
        const acao = await this.repository.createCorrectiveAction({
          origem_tipo: 'inspecao_seguranca',
          origem_id: inspecao.id,
          descricao: `Não-conformidade: ${item.item}${item.observacao ? ` — ${item.observacao}` : ''}`,
          responsavel_id: item.responsavel_id ?? inspetorId,
          prazo: addDays(item.risco_grave_iminente ? PRAZO_URGENTE_DIAS : PRAZO_PADRAO_DIAS),
          status: 'aberta',
          created_by: inspetorId
        });
        acaoCorretivaId = acao.id;
        acoesCriadasIds.push(acao.id);
      }
      await this.repository.createInspectionItem({
        inspecao_id: inspecao.id,
        item_verificado: item.item,
        conforme: item.conforme,
        observacao: item.observacao ?? null,
        acao_corretiva_id: acaoCorretivaId
      });
    }

    const completa = await this.repository.findInspectionById(inspecao.id);
    return { ...(completa ? toInspectionDTO(completa) : { id: inspecao.id }), acoes_corretivas_criadas: acoesCriadasIds };
  }
}

export = CreateInspectionUseCase;
