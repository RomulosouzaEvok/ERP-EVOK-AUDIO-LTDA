/**
 * Interface de serviço para consultar a matriz oficial de treinamentos
 * normativos (NRs) do módulo SST (`sst_matriz_treinamento`,
 * `GET /api/sst/training-matrix`) a partir do módulo RH.
 *
 * RF-INT-RH-SST-01 (decisão do dono, 2026-08-12): quando um curso de
 * `hr_training_courses` é normativo (`is_normative=true`) e seu `nr_code`
 * está cadastrado, ATIVO, na matriz SST, a validade (periodicidade de
 * reciclagem) usada passa a ser a DA MATRIZ, não o valor digitado à mão
 * pelo RH (RF-RH-059, aviso "confirme com a SST", deixa de se aplicar a
 * esse caso).
 *
 * @module modules/rh/application/services/TrainingMatrixService
 */
abstract class TrainingMatrixService {
  /**
   * Busca a periodicidade de reciclagem oficial para uma norma
   * (`sst_matriz_treinamento.norma`), agregando todas as funções (`position`)
   * que a exigem — a matriz é modelada por função×norma, mas
   * `HrTrainingCourse` não tem conceito de função, então a consulta soma
   * todas as funções vinculadas a esta norma.
   *
   * Critério de agregação (quando mais de uma função exige a mesma norma
   * com periodicidades diferentes): usa a MENOR periodicidade não nula
   * cadastrada entre elas — a política de reciclagem mais conservadora, que
   * nunca deixa nenhum funcionário operar com treinamento vencido.
   * `periodicidade_meses: null` só ocorre quando NENHUMA função vinculada a
   * esta norma exige reciclagem periódica (RF-SST-045).
   *
   * @param nrCode - Código normativo (`HrTrainingCourse.nr_code`, ex.: `'NR-12'`).
   * @returns `{ periodicidade_meses }` quando a norma existe, ATIVA, na
   *   matriz SST — ou `null` quando não está cadastrada (RH mantém o fluxo
   *   manual + aviso, RF-RH-059).
   */
  abstract findValidityByNrCode(nrCode: string): Promise<{ periodicidade_meses: number | null } | null>;
}

export = TrainingMatrixService;
