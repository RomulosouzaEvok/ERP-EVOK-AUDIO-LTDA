/**
 * Validação de forma (não de saldo) dos itens de um lançamento contábil,
 * compartilhada entre `CreateEntryUseCase` e `UpdateEntryUseCase`.
 *
 * Regra de partida dobrada aplicada aqui (por linha, sempre — independente
 * do status do lançamento): exatamente um de `debit`/`credit` deve ser
 * maior que zero, nunca os dois preenchidos, nunca nenhum. A verificação de
 * SOMA (débito total = crédito total) é responsabilidade de
 * `PostEntryUseCase`, não desta função — um rascunho pode estar
 * temporariamente desbalanceado.
 *
 * @module modules/accounting/application/services/validateEntryItemsShape
 */

const { BusinessRuleError } = require('../../../../errors');

interface EntryItemShape {
  debit?: number;
  credit?: number;
}

/**
 * @param items - Itens do lançamento (payload bruto, ainda não persistido).
 * @throws {BusinessRuleError} Se `items` estiver vazio, ou se alguma linha não tiver exatamente um de débito/crédito preenchido (> 0).
 */
function validateEntryItemsShape(items: EntryItemShape[]): void {
  if (!items || items.length === 0) {
    throw new BusinessRuleError('Informe ao menos um item (linha de débito ou crédito) para o lançamento.');
  }

  items.forEach((item, index) => {
    const debit = Number(item.debit ?? 0);
    const credit = Number(item.credit ?? 0);
    const hasDebit = debit > 0;
    const hasCredit = credit > 0;

    if (hasDebit && hasCredit) {
      throw new BusinessRuleError(`Item ${index + 1}: informe débito OU crédito, nunca os dois na mesma linha (débito=${debit}, crédito=${credit}).`);
    }
    if (!hasDebit && !hasCredit) {
      throw new BusinessRuleError(`Item ${index + 1}: informe um valor de débito ou de crédito maior que zero.`);
    }
    if (debit < 0 || credit < 0) {
      throw new BusinessRuleError(`Item ${index + 1}: débito/crédito não podem ser negativos.`);
    }
  });
}

module.exports = { validateEntryItemsShape };
