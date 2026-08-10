'use strict';

/**
 * G7 — a inspeção de qualidade passa a existir como entidade (decisão D-H do
 * dono do produto em 2026-08-10,
 * `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4).
 *
 * ## O problema que esta migration resolve
 *
 * Até aqui, liberar um lote da quarentena era **um clique com um campo de
 * observação livre** (`ReleaseLotUseCase` gravava só `lot_controls.notes`).
 * Não havia registro de quem inspecionou, contra qual critério, com qual
 * resultado — nenhuma evidência. Isso não satisfaz a ISO 9001:2015 §8.6, que
 * exige reter informação documentada da liberação **incluindo evidência de
 * conformidade com os critérios de aceitação e rastreabilidade à(s)
 * pessoa(s) que autorizou(aram) a liberação**, nem a §8.7 (controle de saída
 * não conforme, incluindo a **aceitação sob concessão** como decisão
 * registrada e justificada).
 *
 * ⚠️ O texto integral da ISO 9001 é paywalled (iso.org devolve 403) — as
 * cláusulas são citadas por número e assunto, que são públicos, conforme
 * `docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md` §Decisão 5.
 *
 * ## O que esta migration cria
 *
 * 1. `quality_inspections` — o registro de inspeção. Campos mínimos exigidos
 *    pela §8.6: critério de aceitação aplicado (`acceptance_criteria`),
 *    resultado (`verdict` + `defects_found`), responsável (`inspector_id`,
 *    sempre do JWT) e vínculo ao lote (`lot_id`).
 * 2. `lot_controls.release_inspection_id`, `.released_by`, `.released_at` —
 *    a rastreabilidade de **quem autorizou a liberação** exigida pela §8.6,
 *    gravada no próprio lote. Todas nullable: os lotes já liberados antes
 *    desta migration continuam válidos e ficam com os três campos em `NULL`
 *    (é justamente esse `NULL` que identifica, numa auditoria, a liberação
 *    legada sem evidência).
 *
 * ## O que esta migration NÃO decide
 *
 * **Nível de inspeção e AQL por classe de defeito não são inventados aqui.**
 * A ISO 2859-1 fornece as tabelas, mas a escolha dos números é decisão da
 * Engenharia da Qualidade / contrato, e o dono ainda não a tomou (item 4 de
 * "o que o dono precisa confirmar" na pesquisa normativa). Por isso o plano
 * de amostragem entra como **texto livre opcional** (`sampling_plan`,
 * `sample_size`, `lot_size`) — é evidência do que foi aplicado, não um motor
 * de decisão Ac/Re. O `verdict` é sempre do inspetor humano; nenhuma regra
 * automática de aceitação/rejeição é embutida.
 *
 * ## Efeito nas linhas existentes
 *
 * `quality_inspections` nasce vazia. Consequência operacional **intencional**:
 * a partir da aplicação desta migration + do código do G7, liberar um lote
 * exige registrar antes uma inspeção aprovada — inclusive para os lotes que
 * já estão em quarentena hoje. Não há backfill possível: inventar inspeção
 * retroativa seria fabricar evidência de auditoria, exatamente o oposto do
 * que a norma pede.
 *
 * ⚠️ `comment:` NÃO é usado em `addColumn`/`createTable` (corrompe o SQL
 * gerado neste projeto) — os comentários vão em `COMMENT ON COLUMN`.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('quality_inspections', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      inspection_number: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      lot_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'lot_controls', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      stage: {
        type: Sequelize.ENUM('incoming', 'in_process', 'final'),
        allowNull: false,
        defaultValue: 'incoming',
      },
      acceptance_criteria: { type: Sequelize.TEXT, allowNull: false },
      sampling_plan: { type: Sequelize.STRING(120), allowNull: true },
      lot_size: { type: Sequelize.DECIMAL(12, 4), allowNull: true },
      sample_size: { type: Sequelize.DECIMAL(12, 4), allowNull: true },
      defects_found: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      verdict: {
        type: Sequelize.ENUM('approved', 'rejected', 'approved_under_concession'),
        allowNull: false,
      },
      concession_justification: { type: Sequelize.TEXT, allowNull: true },
      non_conformity_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'non_conformities', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      inspector_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      inspected_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('quality_inspections', ['lot_id'], {
      name: 'idx_quality_inspections_lot_id',
    });
    await queryInterface.addIndex('quality_inspections', ['verdict'], {
      name: 'idx_quality_inspections_verdict',
    });
    await queryInterface.addIndex('quality_inspections', ['inspector_id'], {
      name: 'idx_quality_inspections_inspector_id',
    });

    await queryInterface.sequelize.query(`
      COMMENT ON TABLE quality_inspections IS 'G7: registro de inspecao de qualidade por lote. Evidencia exigida pela ISO 9001:2015 8.6 (criterio de aceitacao, resultado, responsavel) e 8.7 (aceitacao sob concessao). Uma inspecao aprovada e pre-condicao para POST /api/inventory/lots/:id/release.';
      COMMENT ON COLUMN quality_inspections.lot_id IS 'FK -> lot_controls.id. Toda inspecao e sobre um lote — e o vinculo que torna a liberacao rastreavel.';
      COMMENT ON COLUMN quality_inspections.stage IS 'Estagio da inspecao: incoming (recebimento), in_process (processo), final (produto acabado).';
      COMMENT ON COLUMN quality_inspections.acceptance_criteria IS 'ISO 9001 8.6: criterio de aceitacao contra o qual o lote foi verificado. Texto livre obrigatorio — a Engenharia da Qualidade ainda nao definiu niveis de inspecao/AQL (ISO 2859-1), e o ERP nao inventa esses numeros.';
      COMMENT ON COLUMN quality_inspections.sampling_plan IS 'Plano de amostragem aplicado (ex.: "ISO 2859-1 nivel II, AQL 1,0"). OPCIONAL e sem efeito de calculo: nao existe motor Ac/Re neste ERP ate a Engenharia da Qualidade definir os numeros.';
      COMMENT ON COLUMN quality_inspections.verdict IS 'Veredito do inspetor: approved | rejected | approved_under_concession. Concessao (ISO 9001 8.7) exige concession_justification.';
      COMMENT ON COLUMN quality_inspections.concession_justification IS 'ISO 9001 8.7: justificativa obrigatoria da aceitacao sob concessao. NULL nos demais vereditos.';
      COMMENT ON COLUMN quality_inspections.non_conformity_id IS 'FK -> non_conformities.id aberta automaticamente quando verdict = rejected (mesmo caminho do G8/G10, que ja bloqueia o lote).';
      COMMENT ON COLUMN quality_inspections.inspector_id IS 'FK -> users.id. SEMPRE do JWT (req.user.id), nunca do body — anti-spoofing e regra P0 do projeto.';
    `);

    await queryInterface.addColumn('lot_controls', 'release_inspection_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'quality_inspections', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addColumn('lot_controls', 'released_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addColumn('lot_controls', 'released_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN lot_controls.release_inspection_id IS 'G7: FK -> quality_inspections.id que autorizou a saida da quarentena/bloqueio. NULL em lote nunca liberado OU em liberacao legada anterior ao G7 (sem evidencia).';
      COMMENT ON COLUMN lot_controls.released_by IS 'G7 / ISO 9001 8.6: FK -> users.id de quem AUTORIZOU a liberacao (do JWT). Pode diferir do inspetor: inspecionar e liberar sao atos distintos.';
      COMMENT ON COLUMN lot_controls.released_at IS 'G7: data/hora da liberacao do lote.';
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('lot_controls', 'released_at');
    await queryInterface.removeColumn('lot_controls', 'released_by');
    await queryInterface.removeColumn('lot_controls', 'release_inspection_id');

    await queryInterface.dropTable('quality_inspections');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_quality_inspections_stage";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_quality_inspections_verdict";');
  },
};
