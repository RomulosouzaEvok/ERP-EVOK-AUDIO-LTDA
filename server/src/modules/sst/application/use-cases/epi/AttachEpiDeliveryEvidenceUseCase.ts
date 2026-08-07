/**
 * Use case: anexar evidência de recebimento a uma EntregaEPI em rascunho
 * (BR-SST-002) — pré-requisito para a confirmação.
 *
 * @module modules/sst/application/use-cases/epi/AttachEpiDeliveryEvidenceUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EpiRepository from '../../../domain/repositories/EpiRepository';
import { ValidationError, NotFoundError, BusinessRuleError } from '../../../../../errors';
import { toEntregaDTO } from '../../../infrastructure/mappers/EpiMapper';

const EVIDENCIA_TIPOS = ['assinatura_digitalizada', 'aceite_eletronico', 'biometria'];

class AttachEpiDeliveryEvidenceUseCase extends UseCase<{ id: string | number; body: Record<string, any> }, any> {
  private readonly epiRepository: EpiRepository;

  public constructor(epiRepository: EpiRepository) {
    super();
    this.epiRepository = epiRepository;
  }

  /**
   * @param input - `{ id, body: { tipo_evidencia, arquivo_url } }`.
   * @throws {ValidationError} Se `tipo_evidencia` ausente/inválido (400).
   * @throws {NotFoundError} Se a entrega não existir (404).
   * @throws {BusinessRuleError} Se a entrega já estiver confirmada (422 — só em rascunho).
   */
  public async execute({ id, body }: { id: string | number; body: Record<string, any> }): Promise<any> {
    if (!body.tipo_evidencia || !EVIDENCIA_TIPOS.includes(body.tipo_evidencia)) {
      throw new ValidationError(`tipo_evidencia inválido. Valores aceitos: ${EVIDENCIA_TIPOS.join(', ')}.`);
    }

    const entrega = await this.epiRepository.findEntregaById(id);
    if (!entrega) throw new NotFoundError('Entrega de EPI não encontrada.');
    if (entrega.confirmada) {
      throw new BusinessRuleError('Entrega já confirmada — imutável (RNF-SST-01). Evidência só pode ser anexada em rascunho.');
    }

    const updated = await this.epiRepository.updateEntregaRascunho(id, {
      evidencia_tipo: body.tipo_evidencia,
      evidencia_arquivo_url: body.arquivo_url ?? null
    });
    const withTipo = await this.epiRepository.findEntregaById(updated.id);
    return toEntregaDTO(withTipo);
  }
}

export = AttachEpiDeliveryEvidenceUseCase;
