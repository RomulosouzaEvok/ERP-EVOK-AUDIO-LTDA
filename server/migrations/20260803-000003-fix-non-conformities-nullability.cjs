'use strict';

// A tabela non_conformities foi criada com TODAS as colunas NOT NULL,
// divergindo do modelo NonConformity (que trata a maioria como opcional).
// Resultado: nenhuma RNC podia ser criada (violacao de not-null em campos
// que o fluxo preenche depois, como root_cause e closed_date). Esta migration
// relaxa o NOT NULL apenas das colunas que o modelo define como opcionais.

const OPTIONAL_COLUMNS = [
  'product_id',
  'purchase_item_id',
  'production_order_id',
  'service_order_id',
  'supplier_id',
  'immediate_action_desc',
  'root_cause',
  'root_cause_category',
  'corrective_action',
  'corrective_action_deadline',
  'responsible_id',
  'effectiveness_check',
  'effectiveness_date',
  'effectiveness_result',
  'lot_number',
  'batch_number',
  'report_date',
  'closed_date',
  'closed_by',
  'notes',
];

module.exports = {
  async up(queryInterface) {
    for (const column of OPTIONAL_COLUMNS) {
      await queryInterface.sequelize.query(
        `ALTER TABLE non_conformities ALTER COLUMN ${column} DROP NOT NULL;`
      );
    }
    // report_date passa a ter default de hoje (data do registro da RNC).
    await queryInterface.sequelize.query(
      `ALTER TABLE non_conformities ALTER COLUMN report_date SET DEFAULT CURRENT_DATE;`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE non_conformities ALTER COLUMN report_date DROP DEFAULT;`
    );
    // Nao restaura NOT NULL: dados legitimamente nulos podem existir apos o up.
  },
};
