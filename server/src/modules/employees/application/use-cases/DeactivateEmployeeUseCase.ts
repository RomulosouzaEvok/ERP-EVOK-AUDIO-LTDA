/**
 * Use case: desligar (soft delete) um funcionário.
 *
 * BLOCO 6 RH (2026-08-09) — pendência #13 da auditoria cruzada
 * (`docs/business/BLOCO_6_RH_AUDITORIA.md`), decisão do dono do produto:
 * `DELETE /api/employees/:id` (este use case) é BLOQUEADO quando existe um
 * `HrTerminationProcess` aberto (`status` fora de `concluido`/`cancelado`)
 * para o mesmo funcionário — o desligamento formal passa a ser
 * obrigatoriamente feito via `POST /api/rh/termination-processes/:id/conclude`
 * (RF-RH-022), que aplica os gates de ASO demissional, devolução de ativos
 * e prazo de verbas que esta rota legada nunca teve. Quando NÃO existe
 * `HrTerminationProcess` para o funcionário, o comportamento anterior é
 * preservado integralmente (nenhuma regressão para consumidores atuais —
 * ex.: correção de cadastro indevido).
 *
 * @module modules/employees/application/use-cases/DeactivateEmployeeUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../errors';
import EmployeesRepository from '../../domain/repositories/EmployeesRepository';

/**
 * Contrato mínimo para checar processo de demissão formal em curso (evita
 * import direto de modules/rh — baixo acoplamento).
 *
 * ⚠️ Interface **LOCAL** (sem `export`), de propósito: este arquivo usa
 * `export =` e o transpilador CJS/ESM do runtime (tsx/esbuild) quebra em
 * tempo de EXECUÇÃO quando um `export =` convive com qualquer outro
 * `export` — inclusive um `export interface`, que `tsc --noEmit` e o Jest
 * (ts-jest, CJS) aceitam sem reclamar. Na passada 1 deste bloco esta
 * interface estava exportada, o que fazia `require('./app')` abortar com
 * `ReferenceError: DeactivateEmployeeUseCase_module is not defined` — ou
 * seja, o servidor inteiro deixava de subir (o `employeeController` é
 * carregado no boot), sem que typecheck nem a suíte unitária acusassem
 * nada. Ver `docs/business/BLOCO_6_RH_API.md` §2.
 */
interface OpenTerminationProcessChecker {
  hasOpenTerminationProcess(employeeId: number | string): Promise<boolean>;
}

class DeactivateEmployeeUseCase extends UseCase<{ id: number | string }, { message: string }> {
  private readonly employeesRepository: EmployeesRepository;
  private readonly terminationProcessChecker?: OpenTerminationProcessChecker;

  /**
   * @param employeesRepository - Repositorio de funcionários.
   * @param terminationProcessChecker - Opcional (injeção tardia para não acoplar `employees` a `rh` em tempo de import) — verifica se existe `HrTerminationProcess` aberto para o funcionário (BLOCO 6 RH, pendência #13).
   */
  public constructor(employeesRepository: EmployeesRepository, terminationProcessChecker?: OpenTerminationProcessChecker) {
    super();
    this.employeesRepository = employeesRepository;
    this.terminationProcessChecker = terminationProcessChecker;
  }

  /**
   * @param input - Id do funcionário.
   * @returns Mensagem de confirmação.
   * @throws {NotFoundError} Se o funcionário não existir.
   * @throws {BusinessRuleError} Se existir `HrTerminationProcess` aberto para o funcionário — desligamento deve seguir o fluxo formal (RF-RH-022).
   */
  public async execute({ id }: { id: number | string }): Promise<{ message: string }> {
    if (this.terminationProcessChecker) {
      const hasOpenProcess = await this.terminationProcessChecker.hasOpenTerminationProcess(id);
      if (hasOpenProcess) {
        throw new BusinessRuleError(
          'Este funcionário possui um processo de demissão formal em andamento — use POST /api/rh/termination-processes/:id/conclude para concluir o desligamento (garante ASO demissional, devolução de ativos e prazo de verbas).',
          { rule: 'RF-RH-022', redirectTo: '/api/rh/termination-processes' },
        );
      }
    }

    const updated = await this.employeesRepository.update(id, { status: 'inactive', dismissal_date: new Date() });
    if (!updated) {
      throw new NotFoundError('Funcionário não encontrado');
    }
    return { message: 'Funcionário desligado com sucesso' };
  }
}

export = DeactivateEmployeeUseCase;
