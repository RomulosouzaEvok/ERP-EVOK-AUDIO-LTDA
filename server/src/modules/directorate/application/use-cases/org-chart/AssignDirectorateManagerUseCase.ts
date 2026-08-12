/**
 * Caso de uso: prover ou vagar o cargo de diretor de uma diretoria,
 * cobrindo `PATCH /api/directorate/directorates/:id/manager`.
 *
 * @module modules/directorate/application/use-cases/org-chart/AssignDirectorateManagerUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import DirectorateRepository from '../../../domain/repositories/DirectorateRepository';

type AssignDirectorateManagerInput = {
  directorateId: number;
  /** `null` = vaga o cargo (mesmo sentido de `manager_id IS NULL` na migration F-6/F-7). */
  managerId: number | null;
};

class AssignDirectorateManagerUseCase extends UseCase<AssignDirectorateManagerInput, any> {
  private readonly directorateRepository: DirectorateRepository;

  constructor(directorateRepository: DirectorateRepository) {
    super();
    this.directorateRepository = directorateRepository;
  }

  /**
   * @throws {NotFoundError} Diretoria inexistente, ou `managerId` informado que não corresponde a nenhum funcionário.
   * @throws {BusinessRuleError} `managerId` informado aponta para funcionário com `status !== 'active'` — o banco não
   *   pode dizer que alguém desligado/afastado dirige uma área da empresa.
   */
  async execute(input: AssignDirectorateManagerInput) {
    const directorate = await this.directorateRepository.findDirectorateById(input.directorateId);
    if (!directorate) {
      throw new NotFoundError(`Diretoria #${input.directorateId} não encontrada.`);
    }

    if (input.managerId !== null) {
      const employee = await this.directorateRepository.findEmployeeById(input.managerId);
      if (!employee) {
        throw new NotFoundError(`Funcionário #${input.managerId} não encontrado.`);
      }
      if (employee.status !== 'active') {
        throw new BusinessRuleError(
          `Funcionário #${input.managerId} (${employee.name}) não está ativo (status "${employee.status}") — não pode ser provido no cargo de diretor.`,
          { rule: 'DIRETORIA-CARGO-VAGO', employee_status: employee.status },
        );
      }
    }

    return this.directorateRepository.updateDirectorateManager(input.directorateId, input.managerId);
  }
}

export = AssignDirectorateManagerUseCase;
