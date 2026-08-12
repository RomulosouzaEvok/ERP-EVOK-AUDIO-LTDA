/**
 * 📐 Regras de negócio puras (sem I/O) de Benefícios — RF-RH-050 a 054.
 *
 * @module modules/rh/domain/services/benefitRules
 */

/** RF-RH-052 — limite de desconto de VT sobre o salário-base do funcionário. */
export const VT_DISCOUNT_LIMIT_PERCENT = 0.06;

/** Categorias de `HrBenefitType` para as quais `dependents` é um campo válido. */
export const DEPENDENTS_ALLOWED_CATEGORIES: readonly string[] = ['saude', 'odonto'];

/**
 * RF-RH-052 — desconto de VT não pode exceder 6% do salário-base. O salário
 * é sempre lido internamente do repositório (nunca aceito no payload — evita
 * spoofing do limite via salário informado pelo cliente).
 *
 * @param discountValue - `discount_value` da adesão.
 * @param salary - `employees.salary`, lido do repositório.
 * @throws {Error} `VT_DISCOUNT_LIMIT_EXCEEDED` se o desconto exceder o limite.
 */
export function validateVtDiscountLimit(discountValue: number, salary: number): void {
  const limit = salary * VT_DISCOUNT_LIMIT_PERCENT;
  if (discountValue > limit) {
    throw new Error(
      `VT_DISCOUNT_LIMIT_EXCEEDED: desconto de vale-transporte limitado a ${(VT_DISCOUNT_LIMIT_PERCENT * 100).toFixed(0)}% do salário-base (máx. ${limit.toFixed(2)}).`,
    );
  }
}

/**
 * RF-RH-052 — `dependents` só é aceito para categorias de saúde/odontológico.
 *
 * @param category - `HrBenefitType.category`.
 * @param dependents - Campo `dependents` do payload (ou `undefined`/`null`).
 * @throws {Error} `DEPENDENTS_NOT_ALLOWED` se `dependents` for informado para categoria não permitida.
 */
export function validateDependentsAllowed(category: string, dependents: unknown): void {
  if (dependents !== undefined && dependents !== null && !DEPENDENTS_ALLOWED_CATEGORIES.includes(category)) {
    throw new Error(
      `DEPENDENTS_NOT_ALLOWED: dependents só é aceito para categorias ${DEPENDENTS_ALLOWED_CATEGORIES.join('/')} (categoria informada: ${category}).`,
    );
  }
}
