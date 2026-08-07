/**
 * `POST /api/jur/lgpd/incidents/:id/decision` — registra decisão de
 * comunicação à ANPD/titulares (nível `approve`, RF-JUR-040/BR-JUR-042).
 * Ambas as justificativas são obrigatórias independentemente do valor
 * booleano — inclusive quando a decisão é "não comunicar".
 *
 * Reconciliação de schema: o contrato de API expõe dois booleanos
 * (`notify_anpd`/`notify_data_subjects`) + duas justificativas, mas
 * `jur_lgpd_incidents` tem um único `communication_decision` (enum
 * `communicate_anpd`/`communicate_subjects`/`communicate_both`/
 * `not_communicate`) e um único `communication_justification` — os dois
 * booleanos são combinados no enum, e as duas justificativas concatenadas
 * em um único campo com prefixo por destinatário, preservando as duas
 * evidências textuais.
 *
 * @module modules/juridico/application/use-cases/lgpd/DecideIncidentUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdIncidentRepository from '../../../domain/repositories/LgpdIncidentRepository';
import { ValidationError, NotFoundError, BusinessRuleError } from '../../../../../errors';
import type { DecideIncidentInput, CommunicationDecision } from '../../../domain/entities/LgpdTypes';

class DecideIncidentUseCase extends UseCase<DecideIncidentInput, any> {
  private readonly repository: LgpdIncidentRepository;

  public constructor(repository: LgpdIncidentRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} `notify_anpd`/`notify_data_subjects` ausentes ou não booleanos (400).
   * @throws {BusinessRuleError} Qualquer uma das duas justificativas ausente, mesmo com o booleano `false` (422/BUSINESS_RULE_VIOLATION, BR-JUR-042).
   * @throws {NotFoundError} Incidente não encontrado (404).
   */
  public async execute(input: DecideIncidentInput): Promise<any> {
    if (typeof input.notify_anpd !== 'boolean' || typeof input.notify_data_subjects !== 'boolean') {
      throw new ValidationError('notify_anpd e notify_data_subjects são obrigatórios (boolean).');
    }
    if (!input.notify_anpd_justification || !input.notify_data_subjects_justification) {
      throw new BusinessRuleError(
        'notify_anpd_justification e notify_data_subjects_justification são obrigatórias, mesmo quando a decisão é não comunicar.',
        { rule: 'BR-JUR-042' },
      );
    }

    const incident = await this.repository.findById(input.id);
    if (!incident) throw new NotFoundError(`Incidente ${input.id} não encontrado.`);

    let decision: CommunicationDecision;
    if (input.notify_anpd && input.notify_data_subjects) decision = 'communicate_both';
    else if (input.notify_anpd) decision = 'communicate_anpd';
    else if (input.notify_data_subjects) decision = 'communicate_subjects';
    else decision = 'not_communicate';

    const justification = `ANPD: ${input.notify_anpd_justification} | Titulares: ${input.notify_data_subjects_justification}`;

    return this.repository.update(input.id, {
      status: 'investigating',
      communication_decision: decision,
      communication_justification: justification,
    });
  }
}

export = DecideIncidentUseCase;
