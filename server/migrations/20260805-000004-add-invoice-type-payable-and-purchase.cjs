'use strict';

/**
 * Bloco A do TODO de reorganizacao de departamentos
 * (docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md, secao 4):
 * decisao do dono corrigindo a proposta original — "produto digital" nao
 * e "sem nota fiscal", e NFS-e (nota de servico municipal) em vez de
 * NF-e (mercadoria, layout estadual/SINIEF). Como a EVOK so RECEBE (nao
 * emite) NFS-e de fornecedor, o escopo real e classificacao em Contas a
 * Pagar/Pedido de Compra, sem integracao de emissao/layout de prefeitura.
 *
 * `invoice_type` ENUM ('nfe', 'nfse'), nullable em ambas as tabelas — nem
 * toda conta a pagar/pedido de compra tem nota vinculada ainda (ex.
 * lancamento manual antes do recebimento). Sem backfill de dado
 * existente: registros antigos nascem NULL, campo passa a ser
 * preenchido daqui para frente pela tela de Contas a Pagar (Bloco F).
 *
 * Segue o padrao idiomatico do projeto (Sequelize `DataTypes.ENUM` por
 * `addColumn`, ver `level` em `access_profile_permissions` na migration
 * 20260803-000008-create-access-profiles.cjs): cada tabela recebe seu
 * proprio tipo Postgres nomeado automaticamente pelo Sequelize
 * (`enum_accounts_payable_invoice_type` e
 * `enum_purchase_orders_invoice_type`), em vez de um tipo compartilhado
 * manual — mais verboso, porem consistente com todas as outras migrations
 * de enum do projeto e sem risco de sintaxe raw incorreta no `addColumn`.
 *
 * Nota tecnica: `addColumn` com `type: Sequelize.ENUM(...)` + `comment`
 * combinados gera `unterminated quoted string` no Postgres local deste
 * projeto (Sequelize 6.37 monta `CREATE TYPE ...; ALTER TABLE ... ADD
 * COLUMN ...; COMMENT ON COLUMN ...;` como uma unica string multi-statement
 * e a etapa de `COMMENT ON COLUMN` quebra a query). Para nao arriscar
 * `addColumn` falhar de novo, o comentario da coluna e aplicado depois via
 * `COMMENT ON COLUMN` isolado (comando simples, sem o bug de composicao).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Idempotente: a migration baseline (20260731-000001) cria tabelas
    // dinamicamente a partir dos models Sequelize *atuais* em dist/ — um
    // banco criado do zero hoje já nasce com accounts_payable.invoice_type/
    // purchase_orders.invoice_type prontos (enums incluídos). Mesma
    // causa/fix de 20260803-000004-create-work-centers.cjs,
    // 20260803-000008-create-access-profiles.cjs e
    // 20260804-000001-create-warehouses.cjs (2026-08-05).
    const payableColumns = await queryInterface.describeTable('accounts_payable');
    if (!payableColumns.invoice_type) {
      await queryInterface.addColumn('accounts_payable', 'invoice_type', {
        type: Sequelize.ENUM('nfe', 'nfse'),
        allowNull: true,
      });
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN accounts_payable.invoice_type IS 'Tipo de nota vinculada: nfe (mercadoria) ou nfse (servico/licenca digital)';`
      );
    }

    const purchaseOrdersColumns = await queryInterface.describeTable('purchase_orders');
    if (!purchaseOrdersColumns.invoice_type) {
      await queryInterface.addColumn('purchase_orders', 'invoice_type', {
        type: Sequelize.ENUM('nfe', 'nfse'),
        allowNull: true,
      });
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN purchase_orders.invoice_type IS 'Tipo de nota vinculada: nfe (mercadoria) ou nfse (servico/licenca digital)';`
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('accounts_payable', 'invoice_type');
    await queryInterface.removeColumn('purchase_orders', 'invoice_type');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_accounts_payable_invoice_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purchase_orders_invoice_type";');
  },
};
