/**
 * 📐 Regras de negócio puras (sem I/O) de Contrato de Experiência — CLT
 * art. 445, parágrafo único, e art. 451 (redação vigente pós-Lei
 * 13.467/2017, conferida por conhecimento treinado — ver nota de
 * verificação legal em `vacationRules.ts`, mesma ressalva se aplica aqui:
 * sem acesso a WebSearch/WebFetch neste ambiente).
 *
 * @module modules/rh/domain/services/experienceContractRules
 */

/** Máximo de dias corridos de um contrato de experiência (Art. 445, parágrafo único, CLT). */
export const MAX_EXPERIENCE_CONTRACT_DAYS = 90;

/**
 * Art. 445, parágrafo único, CLT — "O contrato de experiência não poderá
 * exceder de 90 (noventa) dias."
 *
 * @param startDate - Data de início do contrato (`YYYY-MM-DD`).
 * @param endDate - Data de fim do período sendo validado — `period_1_end_date` (sem prorrogação) ou `period_2_end_date` (com prorrogação).
 * @throws {Error} `EXPERIENCE_CONTRACT_EXCEEDS_90_DAYS` se a duração total exceder 90 dias corridos.
 */
export function validateMaxDuration(startDate: string, endDate: string): void {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > MAX_EXPERIENCE_CONTRACT_DAYS) {
    throw new Error(
      `EXPERIENCE_CONTRACT_EXCEEDS_90_DAYS: duração total do contrato de experiência (${diffDays} dias) excede o limite de ${MAX_EXPERIENCE_CONTRACT_DAYS} dias corridos (Art. 445, parágrafo único, CLT).`,
    );
  }
  if (diffDays <= 0) {
    throw new Error('EXPERIENCE_CONTRACT_INVALID_RANGE: data de fim deve ser posterior à data de início.');
  }
}

/**
 * Art. 451, CLT — "O contrato de trabalho por prazo determinado que,
 * tácita ou expressamente, for prorrogado mais de uma vez passará a
 * vigorar sem determinação de prazo."
 *
 * Interpretação de implementação (decisão de risco, documentada): a
 * consequência legal literal de uma SEGUNDA prorrogação é a conversão
 * automática para prazo indeterminado — não uma "invalidação". Este ERP,
 * por desenho de segurança (RF-RH-015/UC-68 E2), REJEITA a tentativa de
 * gravar uma segunda prorrogação (força o RH a usar a decisão explícita
 * "efetivar", que já produz o mesmo efeito legal de contrato
 * indeterminado, RF-RH-016) em vez de deixar a conversão acontecer de
 * forma implícita/silenciosa. Não há divergência de efeito jurídico final
 * (o contrato ainda vira indeterminado), apenas de EXPERIÊNCIA DE USO (o
 * sistema pede uma ação explícita do RH em vez de aceitar o registro cru).
 *
 * @param currentPeriod2EndDate - Valor atual de `period_2_end_date` (`null` se ainda não houve prorrogação).
 * @throws {Error} `SECOND_EXTENSION_REJECTED` se já houver uma prorrogação registrada.
 */
export function validateSingleExtension(currentPeriod2EndDate: string | null | undefined): void {
  if (currentPeriod2EndDate) {
    throw new Error(
      'SECOND_EXTENSION_REJECTED: contrato de experiência já foi prorrogado uma vez — Art. 451, CLT determina que uma segunda prorrogação converte o contrato em prazo indeterminado; use a decisão "efetivar" (RF-RH-016) em vez de uma nova prorrogação.',
    );
  }
}
