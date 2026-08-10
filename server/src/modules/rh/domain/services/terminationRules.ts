/**
 * 📐 Regras de negócio puras (sem I/O) de Demissão/Rescisão — CLT art. 477
 * §6º (prazo de pagamento das verbas rescisórias) e Lei 12.506/2011 (aviso
 * prévio proporcional).
 *
 * ✅ **VERIFICADO NA FONTE (2026-08-09, passada 2):** Art. 477 §6º/§8º da
 * CLT conferidos em `planalto.gov.br/ccivil_03/decreto-lei/del5452.htm`
 * (redação dada pela Lei 13.467/2017) e o texto integral da Lei
 * 12.506/2011 em `planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/
 * l12506.htm`. Nenhuma divergência de conteúdo — a ressalva de "conferido
 * apenas por conhecimento treinado" da passada 1 não se aplica mais.
 *
 * @module modules/rh/domain/services/terminationRules
 */

/**
 * Art. 477 §6º, CLT (redação dada pela Lei 13.467/2017) — "A entrega ao
 * empregado de documentos que comprovem a comunicação da extinção
 * contratual aos órgãos competentes bem como o pagamento dos valores
 * constantes do instrumento de rescisão ou recibo de quitação deverão ser
 * efetuados até dez dias contados a partir do término do contrato."
 *
 * Confirma o desenho já modelado na migration `20260808-000016`
 * (`payment_deadline` GERADO como `termination_date + 10`, coluna
 * `GENERATED ALWAYS AS`): a contagem é de fato "a partir do término do
 * contrato" (`termination_date`), NÃO a partir da data de comunicação do
 * aviso prévio (`notice_date`) — nenhuma divergência encontrada entre a lei
 * e o schema já commitado.
 *
 * @param terminationDate - Data de término do contrato (`YYYY-MM-DD`).
 * @returns Data-limite de pagamento das verbas rescisórias (`YYYY-MM-DD`), 10 dias corridos após `terminationDate`.
 */
export function calculatePaymentDeadline(terminationDate: string): string {
  const date = new Date(`${terminationDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 10);
  return date.toISOString().slice(0, 10);
}

/**
 * Lei 12.506/2011, art. 1º e parágrafo único — "O aviso prévio... será
 * concedido na proporção de 30 (trinta) dias aos empregados que contém até
 * 1 (um) ano de serviço prestado à mesma empresa. Parágrafo único. Ao
 * aviso prévio previsto neste artigo serão acrescidos 3 (três) dias por
 * ano de serviço prestado na mesma empresa, até o máximo de 60 (sessenta)
 * dias, perfazendo um total de até 90 (noventa) dias."
 *
 * Base legal correta: Lei 12.506/2011 (lei ordinária extravagante), NÃO a
 * CLT diretamente (a CLT art. 487 apenas fixa o piso de 30 dias; a
 * proporcionalidade por tempo de casa vem da Lei 12.506/2011, editada para
 * regulamentar o art. 7º, XXI, da Constituição Federal).
 *
 * @param completedYearsOfService - Anos completos de casa (tempo de serviço na empresa, arredondado para baixo).
 * @returns Dias de aviso prévio sugeridos (30 a 90).
 */
export function calculateNoticePeriodDays(completedYearsOfService: number): number {
  if (completedYearsOfService < 0) throw new Error('completedYearsOfService não pode ser negativo.');
  const additional = Math.min(completedYearsOfService * 3, 60);
  return 30 + additional;
}

/**
 * Anos COMPLETOS de serviço na mesma empresa (Lei 12.506/2011, parágrafo
 * único: "3 (três) dias por ano de serviço prestado na mesma empresa").
 *
 * ⚠️ **CORREÇÃO DE BUG REAL (passada 2).** A passada 1 calculava isto
 * inline no use case como
 * `Math.floor((notice - hire) / (1000*60*60*24*365.25))`. Dividir por
 * 365,25 **subestima em um ano** exatamente nos aniversários redondos: um
 * empregado admitido em 2016-08-10 e avisado em 2026-08-10 tem 3652 dias
 * de casa; 3652/365,25 = 9,998… → `floor` = **9 anos**, quando são
 * **10 anos completos**. O efeito prático era sugerir 57 dias de aviso
 * prévio em vez de 60 — 3 dias a menos do que a lei garante ao
 * trabalhador, num campo que o RH tende a aceitar como sugerido. Este
 * cálculo passou a ser por **aniversário de calendário**, não por média de
 * dias.
 *
 * Nota sobre 29/02: para quem foi admitido em 29 de fevereiro, o
 * aniversário em ano não bissexto é tratado como 1º de março (a
 * comparação mês/dia considera 28/02 como "antes do aniversário") —
 * critério conservador de um dia, sem impacto no total de anos em nenhum
 * outro caso.
 *
 * @param hireDate - Data de admissão (`YYYY-MM-DD`).
 * @param referenceDate - Data de referência, normalmente `notice_date` (`YYYY-MM-DD`).
 * @returns Anos completos de casa (nunca negativo).
 */
export function calculateCompletedYearsOfService(hireDate: string, referenceDate: string): number {
  const [hireYear, hireMonth, hireDay] = hireDate.split('-').map(Number);
  const [refYear, refMonth, refDay] = referenceDate.split('-').map(Number);

  let years = refYear - hireYear;
  if (refMonth < hireMonth || (refMonth === hireMonth && refDay < hireDay)) {
    years -= 1;
  }
  return Math.max(years, 0);
}
