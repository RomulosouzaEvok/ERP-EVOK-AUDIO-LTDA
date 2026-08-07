'use strict';

/**
 * Seed do Plano de Contas resumido (30 contas), replicado fielmente de
 * `docs/financeiro/02-CONTABILIDADE.md` seção "Plano de Contas (Resumo)".
 *
 * O documento original não classificava `account_type`/`accept_entries` por
 * conta (era só uma tabela narrativa código/descrição/tipo textual) — esta
 * migration decide, por linha:
 * - `account_type`: derivado do grupo (1.x → asset, 2.1/2.2 → liability,
 *   2.3.x → equity, 3.x → revenue, 4.1 → cost, 4.2/4.3 → expense; o próprio
 *   cabeçalho "4 CUSTOS E DESPESAS" nasce `expense` por ser o tipo mais
 *   genérico do grupo).
 * - `account_level`: número de segmentos do código (`"1.1.1"` → nível 3).
 * - `accept_entries`: `false` para contas sintéticas/cabeçalho (linhas
 *   marcadas "-" na coluna Tipo do doc original, ex.: "1 ATIVO", "1.1 Ativo
 *   Circulante"), `true` para as contas "folha" que efetivamente recebem
 *   lançamento direto.
 * - `parent_id`: resolvido em tempo de execução via subquery pelo `code` do
 *   pai (as linhas são inseridas em ordem pai→filho, mesma ordem do doc).
 *
 * Migration idempotente: cada `INSERT` usa `ON CONFLICT (code) DO NOTHING`,
 * então rodar novamente (ou em um banco que já tenha o seed) não duplica
 * nem falha.
 *
 * @type {import('sequelize-cli').Migration}
 */

/**
 * Plano de contas resumido, em ordem pai→filho (replica
 * `docs/financeiro/02-CONTABILIDADE.md` linha a linha).
 * @type {Array<{code: string, name: string, type: string, acceptEntries: boolean}>}
 */
const ACCOUNTS = [
  { code: '1', name: 'ATIVO', type: 'asset', acceptEntries: false },
  { code: '1.1', name: 'Ativo Circulante', type: 'asset', acceptEntries: false },
  { code: '1.1.1', name: 'Caixa e Equivalentes', type: 'asset', acceptEntries: true },
  { code: '1.1.2', name: 'Clientes', type: 'asset', acceptEntries: true },
  { code: '1.1.3', name: 'Estoques', type: 'asset', acceptEntries: true },
  { code: '1.1.4', name: 'Tributos a Recuperar', type: 'asset', acceptEntries: true },
  { code: '1.2', name: 'Ativo Não Circulante', type: 'asset', acceptEntries: false },
  { code: '1.2.1', name: 'Imobilizado', type: 'asset', acceptEntries: true },
  { code: '1.2.2', name: 'Intangível', type: 'asset', acceptEntries: true },
  { code: '1.2.3', name: '(-) Depreciação Acumulada', type: 'asset', acceptEntries: true },
  { code: '2', name: 'PASSIVO', type: 'liability', acceptEntries: false },
  { code: '2.1', name: 'Passivo Circulante', type: 'liability', acceptEntries: false },
  { code: '2.1.1', name: 'Fornecedores', type: 'liability', acceptEntries: true },
  { code: '2.1.2', name: 'Obrigações Trabalhistas', type: 'liability', acceptEntries: true },
  { code: '2.1.3', name: 'Obrigações Tributárias', type: 'liability', acceptEntries: true },
  { code: '2.1.4', name: 'Empréstimos', type: 'liability', acceptEntries: true },
  { code: '2.2', name: 'Passivo Não Circulante', type: 'liability', acceptEntries: false },
  { code: '2.2.1', name: 'Empréstimos LP', type: 'liability', acceptEntries: true },
  { code: '2.3', name: 'Patrimônio Líquido', type: 'equity', acceptEntries: false },
  { code: '2.3.1', name: 'Capital Social', type: 'equity', acceptEntries: true },
  { code: '2.3.2', name: 'Reservas', type: 'equity', acceptEntries: true },
  { code: '2.3.3', name: 'Lucros/Prejuízos Acumulados', type: 'equity', acceptEntries: true },
  { code: '3', name: 'RECEITAS', type: 'revenue', acceptEntries: false },
  { code: '3.1', name: 'Receita Bruta de Vendas', type: 'revenue', acceptEntries: true },
  { code: '3.2', name: '(-) Deduções', type: 'revenue', acceptEntries: true },
  { code: '3.3', name: 'Receita Líquida', type: 'revenue', acceptEntries: true },
  { code: '4', name: 'CUSTOS E DESPESAS', type: 'expense', acceptEntries: false },
  { code: '4.1', name: 'Custos dos Produtos Vendidos', type: 'cost', acceptEntries: true },
  { code: '4.2', name: 'Despesas Operacionais', type: 'expense', acceptEntries: true },
  { code: '4.3', name: 'Despesas Financeiras', type: 'expense', acceptEntries: true },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    for (const account of ACCOUNTS) {
      const segments = account.code.split('.');
      const level = segments.length;
      const parentCode = level > 1 ? segments.slice(0, -1).join('.') : null;

      await queryInterface.sequelize.query(
        `INSERT INTO accounting_chart_of_accounts
           (code, name, account_type, account_level, parent_id, accept_entries, active, created_at, updated_at)
         VALUES
           (:code, :name, :type, :level,
            (SELECT id FROM accounting_chart_of_accounts WHERE code = :parentCode),
            :acceptEntries, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (code) DO NOTHING`,
        {
          replacements: {
            code: account.code,
            name: account.name,
            type: account.type,
            level,
            parentCode,
            acceptEntries: account.acceptEntries,
          },
          type: Sequelize.QueryTypes.INSERT,
        },
      );
    }
  },

  async down(queryInterface) {
    // Apaga em ordem reversa (filha antes do pai) — `parent_id` é
    // `ON DELETE RESTRICT`, então apagar o pai antes da filha na mesma
    // migration falharia por violação de FK.
    for (const account of [...ACCOUNTS].reverse()) {
      await queryInterface.bulkDelete('accounting_chart_of_accounts', { code: account.code });
    }
  },
};
