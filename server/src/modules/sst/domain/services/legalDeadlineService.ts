/**
 * Cálculo do prazo legal de emissão da CAT (RNF-SST-04, Lei 8.213/91 art. 22
 * §2º): 1º dia útil seguinte à ocorrência do acidente; imediato (mesmo dia)
 * em caso de óbito.
 *
 * IMPLEMENTAÇÃO SIMPLIFICADA (documentada, não omissão): considera apenas
 * sábados/domingos como não-úteis — não há, nesta passada, uma tabela de
 * feriados nacionais parametrizável (`[VERIFICAR COM TÉCNICO SST/RH DA
 * EMPRESA]`). Suficiente para o caminho feliz e a maioria dos casos reais;
 * um calendário de feriados fica registrado como melhoria futura (mesmo
 * padrão de "constante configurável, não hard-code" já usado em
 * `sst_matriz_treinamento.periodicidade_reciclagem_meses`).
 *
 * @module modules/sst/domain/services/legalDeadlineService
 */

/** @param date - Data a testar. @returns `true` se sábado ou domingo. */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Calcula o prazo-limite de emissão da CAT.
 *
 * @param accidentDateTime - `data_hora` do acidente.
 * @param gravidade - Gravidade do acidente (`obito` = prazo imediato, mesmo dia).
 * @returns Data (YYYY-MM-DD) do prazo-limite.
 */
export function calcularPrazoLimiteCat(accidentDateTime: Date | string, gravidade: string): string {
  const base = new Date(accidentDateTime);
  if (gravidade === 'obito') {
    return base.toISOString().slice(0, 10);
  }
  const prazo = new Date(base);
  prazo.setDate(prazo.getDate() + 1);
  while (isWeekend(prazo)) {
    prazo.setDate(prazo.getDate() + 1);
  }
  return prazo.toISOString().slice(0, 10);
}

export default { calcularPrazoLimiteCat };

module.exports = { calcularPrazoLimiteCat };
module.exports.calcularPrazoLimiteCat = calcularPrazoLimiteCat;
