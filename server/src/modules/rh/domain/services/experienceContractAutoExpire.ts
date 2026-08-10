/**
 * Verificação ativa de vencimento de contrato de experiência sem decisão
 * (RF-RH-016, UC-68 E1, RNF-RH-02, Art. 445 §único/451 CLT) — compartilhada
 * por `GetEmployeeContractByIdUseCase` e `ListEmployeeContractsUseCase` para
 * não duplicar a lógica. Extraído para arquivo próprio (não pode conviver
 * com `export =` no mesmo arquivo de um use case CJS — armadilha ESM+CJS já
 * documentada no contrato deste bloco).
 *
 * @module modules/rh/domain/services/experienceContractAutoExpire
 */
import EmployeeContractRepository from '../repositories/EmployeeContractRepository';

/**
 * Status de `hr_employee_contracts` (migration `20260808-000014`) em que um
 * contrato de experiência ainda está "correndo" e, portanto, ainda pode
 * vencer sem decisão.
 *
 * ⚠️ **CORREÇÃO (passada 2):** a passada 1 checava apenas `'ativo'`. Um
 * contrato PRORROGADO (`status='prorrogado'`, gravado por
 * `ExtendEmployeeContractUseCase`) cujo `period_2_end_date` vencesse sem
 * decisão NUNCA transitava para `indeterminado_automatico` — exatamente o
 * cenário do Art. 451 da CLT (prorrogação vencida em silêncio vira prazo
 * indeterminado), que é o caso de MAIOR risco legal do UC-68 E1. Os dois
 * literais conferidos contra o ENUM da migration.
 */
const RUNNING_EXPERIENCE_STATUSES = ['ativo', 'prorrogado'];

/**
 * @param repository - Repositório de `HrEmployeeContract`.
 * @param contract - Registro atual (já carregado).
 * @param today - Data de referência (`YYYY-MM-DD`, injetável para teste).
 * @returns O contrato (atualizado, se a transição automática foi aplicada; original, caso contrário).
 */
export async function applyAutoExpireIfNeeded(
  repository: EmployeeContractRepository,
  contract: any,
  today: string = new Date().toISOString().slice(0, 10),
): Promise<any> {
  if (contract.type !== 'experiencia' || !RUNNING_EXPERIENCE_STATUSES.includes(contract.status)) return contract;
  const limit = contract.period_2_end_date ?? contract.period_1_end_date;
  if (!limit || limit >= today) return contract;
  const updated = await repository.update(contract.id, { status: 'indeterminado_automatico' });
  return updated ?? contract;
}

export default applyAutoExpireIfNeeded;
