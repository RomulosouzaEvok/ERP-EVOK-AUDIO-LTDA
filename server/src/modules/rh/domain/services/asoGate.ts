/**
 * 🔒 Gate compartilhado de ASO (RF-RH-030) — função de domínio única,
 * reutilizada por `ConcludeAdmissionProcessUseCase` (§4.3),
 * `ConcludeTerminationProcessUseCase` (§6.2) e
 * `ConfirmReturnFromAbsenceUseCase` (§9.4, fora do escopo P0 desta
 * passada). Nunca chama o módulo SST em tempo real — verifica apenas o
 * snapshot já anexado em `HrEmployeeDocument` (RF-RH-028).
 *
 * @module modules/rh/domain/services/asoGate
 */
import EmployeeDocumentRepository from '../repositories/EmployeeDocumentRepository';

/**
 * @param employeeDocumentRepository - Repositório de `HrEmployeeDocument`.
 * @param employeeId - Id do funcionário.
 * @param docType - Subtipo de ASO (`aso_admissional`/`aso_demissional`/`aso_retorno`/`aso_periodico`/`aso_mudanca_risco`).
 * @param today - Data de referência (`YYYY-MM-DD`, injetável para teste determinístico).
 * @returns `true` se existe um `HrEmployeeDocument` do tipo informado com aptidão `apto`/`apto_com_restricao` e dentro da validade.
 */
export async function hasValidAso(
  employeeDocumentRepository: EmployeeDocumentRepository,
  employeeId: number | string,
  docType: string,
  today: string = new Date().toISOString().slice(0, 10),
): Promise<boolean> {
  const document = await employeeDocumentRepository.findValidAso(employeeId, docType, today);
  return Boolean(document);
}

export default hasValidAso;
