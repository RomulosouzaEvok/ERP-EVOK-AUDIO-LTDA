'use strict';

/**
 * Bloco 2 (docs/governance/TODO.md) — Requisicao de Amostra da Engenharia
 * (UC-39, BUSINESS_RULES.md §9).
 *
 * `purchase_requisitions.origin` ja e VARCHAR(80) livre (sem ENUM no
 * banco — ver `20260802-000002-purchase-requisitions.cjs`), entao o novo
 * valor `'engenharia_amostra'` NAO exige migration de schema (ao
 * contrario do precedente `ALTER TYPE` usado em
 * `20260803-000002-add-quarantine-lot-status.cjs`, que era necessario
 * porque `lot_controls.status` e um ENUM real). Esta migration cobre
 * APENAS o vinculo opcional ao projeto de engenharia:
 *
 * - `engineering_project_id` (INTEGER, nullable, FK -> engineering_projects.id
 *   ON DELETE SET NULL) em `purchase_requisitions` — rastreia a amostra ao
 *   projeto de P&D de origem quando informado; nunca obrigatorio (mesmo
 *   para origin='engenharia_amostra', decisao de negocio §9: apenas a
 *   justificativa e obrigatoria nesse caso, o projeto continua opcional).
 * - Indice em `engineering_project_id` para consulta de rastreabilidade
 *   ("todas as requisicoes de amostra de um projeto").
 *
 * Precedente de padrao seguido: 20260804-000001-create-warehouses.cjs
 * (FK nullable + indice dedicado, expand-only).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('purchase_requisitions', 'engineering_project_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'engineering_projects',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'FK -> engineering_projects.id (opcional) — vinculo da requisicao de amostra ao projeto de P&D (UC-39, Bloco 2)',
    });

    await queryInterface.addIndex('purchase_requisitions', ['engineering_project_id'], {
      name: 'idx_purchase_requisitions_engineering_project_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('purchase_requisitions', 'idx_purchase_requisitions_engineering_project_id');
    await queryInterface.removeColumn('purchase_requisitions', 'engineering_project_id');
  },
};
