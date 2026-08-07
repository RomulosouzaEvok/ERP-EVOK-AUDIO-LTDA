/**
 * `POST /api/jur/proxies` — cadastra procuração (UC-55, RF-JUR-026/027).
 * Cria alerta de vencimento automaticamente se `expiration_date` for
 * definida (`expiration_date: null` = vigência indeterminada, sem alerta
 * automático, sujeita a revogação manual a qualquer momento — A1 do UC-55).
 *
 * @module modules/juridico/application/use-cases/proxy/CreateProxyUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ProxyRepository from '../../../domain/repositories/ProxyRepository';
import LegalAlertRepository from '../../../domain/repositories/LegalAlertRepository';
import { ValidationError, NotFoundError } from '../../../../../errors';
import type { CreateProxyInput } from '../../../domain/entities/ProxyTypes';

class CreateProxyUseCase extends UseCase<CreateProxyInput, any> {
  private readonly repository: ProxyRepository;
  private readonly alertRepository: LegalAlertRepository;

  public constructor(repository: ProxyRepository, alertRepository: LegalAlertRepository) {
    super();
    this.repository = repository;
    this.alertRepository = alertRepository;
  }

  /**
   * @throws {ValidationError} `grantee_name`, `powers_text`, `form` ou `issue_date` ausentes (400).
   * @throws {NotFoundError} `grantee_employee_id`/`grantee_external_lawyer_id` informado não existe (404).
   */
  public async execute(input: CreateProxyInput & { createdBy: number }): Promise<any> {
    if (!input.grantee_name || !input.powers_text || !input.form || !input.issue_date) {
      throw new ValidationError('grantee_name, powers_text, form e issue_date são obrigatórios.');
    }

    if (input.grantee_employee_id) {
      const { Employee } = require('../../../../../models/index');
      const exists = await Employee.findByPk(input.grantee_employee_id);
      if (!exists) throw new NotFoundError(`Funcionário ${input.grantee_employee_id} não encontrado.`);
    }
    if (input.grantee_external_lawyer_id) {
      const { JurExternalLawyer } = require('../../../../../models/index');
      const exists = await JurExternalLawyer.findByPk(input.grantee_external_lawyer_id);
      if (!exists) throw new NotFoundError(`Advogado externo ${input.grantee_external_lawyer_id} não encontrado.`);
    }

    const alertAdvanceDays = input.alert_advance_days ?? 30;

    const proxy = await this.repository.create({
      grantor_name: input.grantor ?? 'EVOK ÁUDIO LTDA',
      grantee_name: input.grantee_name,
      employee_id: input.grantee_employee_id ?? null,
      external_lawyer_id: input.grantee_external_lawyer_id ?? null,
      powers_description: input.powers_text,
      power_tags: Array.isArray(input.powers_tags) ? input.powers_tags.join(',') : (input.powers_tags ?? null),
      proxy_form: input.form,
      issue_date: input.issue_date,
      expiration_date: input.expiration_date ?? null,
      alert_advance_days: alertAdvanceDays,
      status: 'active',
      created_by: input.createdBy,
    });

    if (input.expiration_date) {
      const dueDate = new Date(input.expiration_date);
      dueDate.setDate(dueDate.getDate() - alertAdvanceDays);
      await this.alertRepository.create({
        origin_type: 'proxy',
        origin_id: proxy.id,
        alert_subtype: 'expiration',
        due_date: dueDate.toISOString().slice(0, 10),
        recipient_user_id: input.createdBy,
        status: 'pending',
      });
    }

    return proxy;
  }
}

export = CreateProxyUseCase;
