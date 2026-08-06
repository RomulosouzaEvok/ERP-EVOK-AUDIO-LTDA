'use strict';

/**
 * Histórico multi-NF-e por pedido (`sale_invoices`) — gap "Histórico
 * multi-NF-e por pedido" de `docs/governance/TODO.md`. Hoje `Sale.nfe_*`
 * guarda apenas a NF-e mais recente; múltiplas emissões parciais (ver
 * faturamento parcial de 2026-08-06) sobrescreviam chave/protocolo/XML uma
 * da outra. `sale_invoices` guarda 1 registro por EMISSÃO (1 venda : N
 * notas).
 *
 * PADRÃO EXPAND-CONTRACT: `Sale.nfe_*` NÃO é removido nesta migration —
 * `IssueSaleNfeUseCase`/`GetSaleNfeStatusUseCase`/`CancelSaleNfeUseCase`
 * continuam em dual-write (atualizam `Sale.nfe_*` com a emissão mais
 * recente, ao mesmo tempo que gravam/atualizam o registro correspondente em
 * `sale_invoices`). Uma futura rodada de "contract" pode aposentar
 * `Sale.nfe_*` — fora do escopo desta entrega.
 *
 * BACKFILL: cria 1 registro em `sale_invoices` para cada venda que já tem
 * uma NF-e associada (`sales.nfe_provider_ref IS NOT NULL`), usando os
 * dados hoje disponíveis em `Sale.nfe_*`. LIMITAÇÃO DO BACKFILL (documentada
 * — dado histórico não tem granularidade por emissão): o `items` do
 * registro retroativo é reconstruído a partir do estado ATUAL de
 * `sale_items.invoiced_quantity` (soma de todas as emissões que já
 * aconteceram para aquela venda, não apenas a última), então para vendas
 * que já tiveram múltiplas emissões parciais ANTES desta migration, o
 * histórico anterior a esta migration permanece irrecuperável — apenas 1
 * registro "consolidado" é criado, refletindo o estado atual. A partir
 * desta migration, toda nova emissão passa a gerar seu próprio registro
 * granular via `IssueSaleNfeUseCase`. `nfe_provider` do backfill usa o
 * provider ATUAL de `company_fiscal_configs` (não há histórico de qual
 * provider foi usado em cada emissão passada).
 *
 * Migration idempotente (mesmo padrão de
 * `20260806-000020-create-cost-centers.cjs`): um banco criado do zero a
 * partir dos models Sequelize *atuais* passa pela baseline
 * (`20260731-000001-baseline-schema.cjs`), que NÃO inclui `SaleInvoice` em
 * `DYNAMIC_MODEL_FILES` (tabela nova, fora do conjunto conhecido pela
 * baseline) — por isso esta migration sempre cria a tabela quando ausente,
 * sem depender do bootstrap dinâmico.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('sale_invoices')) {
      await queryInterface.createTable('sale_invoices', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        sale_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'sales', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        items: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
          comment: 'Snapshot dos itens/quantidades/tributos desta emissao especifica',
        },
        total_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        nfe_number: { type: Sequelize.STRING(50), allowNull: true },
        nfe_series: { type: Sequelize.INTEGER, allowNull: true },
        nfe_environment: { type: Sequelize.ENUM('homologacao', 'producao'), allowNull: true },
        nfe_provider: { type: Sequelize.ENUM('mock', 'focus_nfe', 'enotas'), allowNull: false },
        nfe_status: {
          type: Sequelize.ENUM('processing', 'authorized', 'denied', 'cancelled'),
          allowNull: false,
          defaultValue: 'processing',
        },
        nfe_key: { type: Sequelize.STRING(50), allowNull: true },
        nfe_protocol: { type: Sequelize.STRING(50), allowNull: true },
        nfe_provider_ref: {
          type: Sequelize.STRING(100),
          allowNull: false,
          comment: 'Referencia unica desta emissao, formato sale-{saleId}-{series}-{number}',
        },
        nfe_xml_url: { type: Sequelize.STRING(500), allowNull: true },
        nfe_danfe_url: { type: Sequelize.STRING(500), allowNull: true },
        nfe_error_message: { type: Sequelize.TEXT, allowNull: true },
        nfe_issued_at: { type: Sequelize.DATE, allowNull: true },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });

      await queryInterface.addIndex('sale_invoices', ['sale_id'], { name: 'idx_sale_invoices_sale_id' });
      await queryInterface.addIndex('sale_invoices', ['nfe_provider_ref'], {
        name: 'uq_sale_invoices_provider_ref',
        unique: true,
      });
      await queryInterface.addIndex('sale_invoices', ['nfe_status'], { name: 'idx_sale_invoices_status' });
    }

    // Backfill: 1 registro consolidado por venda que já tem NF-e (ver
    // LIMITAÇÃO no cabeçalho desta migration).
    const [alreadyBackfilled] = await queryInterface.sequelize.query(
      `SELECT COUNT(*)::int AS count FROM sale_invoices;`
    );
    if (alreadyBackfilled[0].count > 0) {
      // Já existem registros (nova instalação ou migration re-executada
      // após backfill anterior) — não duplica.
      return;
    }

    const [salesWithNfe] = await queryInterface.sequelize.query(`
      SELECT id, nfe_number, nfe_status, nfe_key, nfe_series, nfe_protocol,
             nfe_environment, nfe_provider_ref, nfe_xml_url, nfe_danfe_url,
             nfe_error_message, nfe_issued_at
      FROM sales
      WHERE nfe_provider_ref IS NOT NULL;
    `);

    if (salesWithNfe.length === 0) {
      return;
    }

    const [[fiscalConfig]] = await queryInterface.sequelize.query(`
      SELECT nfe_provider FROM company_fiscal_configs WHERE id = 1 LIMIT 1;
    `).catch(() => [[{ nfe_provider: 'mock' }]]);
    const fallbackProvider = (fiscalConfig && fiscalConfig.nfe_provider) || 'mock';

    for (const sale of salesWithNfe) {
      const [items] = await queryInterface.sequelize.query(
        `SELECT id AS sale_item_id, product_id, invoiced_quantity AS quantity,
                unit_price, (invoiced_quantity * unit_price) AS total_price,
                cfop, icms_cst, icms_aliquot, icms_base, icms_value,
                ipi_cst, ipi_aliquot, ipi_value,
                pis_cst, pis_aliquot, pis_value,
                cofins_cst, cofins_aliquot, cofins_value
         FROM sale_items
         WHERE sale_id = :saleId AND invoiced_quantity > 0;`,
        { replacements: { saleId: sale.id } }
      );

      const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0);

      await queryInterface.sequelize.query(
        `INSERT INTO sale_invoices
           (sale_id, items, total_amount, nfe_number, nfe_series, nfe_environment,
            nfe_provider, nfe_status, nfe_key, nfe_protocol, nfe_provider_ref,
            nfe_xml_url, nfe_danfe_url, nfe_error_message, nfe_issued_at,
            created_at, updated_at)
         VALUES
           (:saleId, :items, :totalAmount, :nfeNumber, :nfeSeries, :nfeEnvironment,
            :nfeProvider, :nfeStatus, :nfeKey, :nfeProtocol, :nfeProviderRef,
            :nfeXmlUrl, :nfeDanfeUrl, :nfeErrorMessage, :nfeIssuedAt,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
        {
          replacements: {
            saleId: sale.id,
            items: JSON.stringify(items),
            totalAmount: totalAmount || 0,
            nfeNumber: sale.nfe_number,
            nfeSeries: sale.nfe_series,
            nfeEnvironment: sale.nfe_environment,
            nfeProvider: fallbackProvider,
            nfeStatus: sale.nfe_status === 'pending' ? 'processing' : sale.nfe_status,
            nfeKey: sale.nfe_key,
            nfeProtocol: sale.nfe_protocol,
            nfeProviderRef: sale.nfe_provider_ref,
            nfeXmlUrl: sale.nfe_xml_url,
            nfeDanfeUrl: sale.nfe_danfe_url,
            nfeErrorMessage: sale.nfe_error_message,
            nfeIssuedAt: sale.nfe_issued_at,
          },
        }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sale_invoices');
  },
};
