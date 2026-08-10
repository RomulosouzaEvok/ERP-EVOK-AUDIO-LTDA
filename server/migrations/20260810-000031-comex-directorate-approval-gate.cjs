'use strict';

/**
 * G11-COMEX — gate de aprovação da diretoria no processo de importação
 * (decisão D-G do dono do produto em 2026-08-10).
 *
 * ## Por que esta migration existe
 *
 * O G11 (`20260810-000029`) colocou a alçada da diretoria sobre
 * `purchase_orders`, exigindo aprovação em **qualquer valor** quando a
 * origem é importação. Mas `import_processes` (módulo COMEX, UC-19) é um
 * fluxo PARALELO: nunca vira `purchase_orders` e não tinha etapa de
 * aprovação nenhuma — todas as escritas eram `comex:operate`. Uma
 * importação de R$ 1 milhão registrada por ali passava sem a diretoria.
 *
 * ## O que esta migration cria
 *
 * `import_process_approvals` — registro das aprovações da diretoria sobre
 * um processo de importação, no MESMO desenho já aprovado de
 * `purchase_order_approvals` (G11) e `jur_contract_approvals`
 * (RF-JUR-003):
 * - FK `import_process_id` → `import_processes` com `ON DELETE CASCADE`
 *   (a aprovação não sobrevive ao processo que ela aprova);
 * - FK `approver_user_id` → `users` com `ON DELETE RESTRICT` (o histórico
 *   de quem aprovou é imutável — não se apaga o aprovador de um
 *   compromisso de importação);
 * - `approver_role` ENUM('diretor') — sempre resolvido por RBAC no
 *   backend, nunca aceito do body;
 * - UNIQUE (`import_process_id`, `approver_role`) — o mesmo papel não
 *   aprova duas vezes o mesmo processo;
 * - índice na FK `import_process_id` (o gate consulta por processo a cada
 *   tentativa de embarque).
 *
 * A regra que consome esta tabela está em
 * `server/src/modules/comex/domain/constants.ts` e é aplicada em
 * `RegisterImportTrackingUseCase` ANTES de gravar o status `shipped`.
 *
 * ## Efeito nas linhas existentes
 *
 * Nenhuma coluna é adicionada a tabelas existentes — a migration é
 * puramente aditiva. Consequência operacional a comunicar ao COMEX:
 * processos que já estão em `draft` quando esta migration subir passam a
 * exigir a aprovação da diretoria para embarcar (não há grandfathering —
 * decisão consciente, já que o gate só faz sentido se valer para o
 * estoque de processos abertos). Processos já em `shipped` ou adiante não
 * são afetados. Registrado em `docs/governance/TODO.md`.
 *
 * ⚠️ `comment:` NÃO é usado em `addColumn`/`createTable` (corrompe o SQL
 * gerado neste projeto) — os comentários vão em `COMMENT ON COLUMN`.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('import_process_approvals', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      import_process_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'import_processes', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      approver_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      approver_role: { type: Sequelize.ENUM('diretor'), allowNull: false },
      approved_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('import_process_approvals', {
      fields: ['import_process_id', 'approver_role'],
      type: 'unique',
      name: 'uq_import_process_approvals_process_role',
    });

    await queryInterface.addIndex('import_process_approvals', ['import_process_id'], {
      name: 'idx_import_process_approvals_process_id',
    });

    await queryInterface.sequelize.query(
      `COMMENT ON TABLE import_process_approvals IS 'G11-COMEX: aprovacoes da diretoria sobre processos de importacao. Exigidas para a transicao draft -> shipped (embarque), em qualquer valor.';`
    );
    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN import_process_approvals.approver_user_id IS 'G11-COMEX: usuario aprovador, SEMPRE vindo do JWT (req.user.id) — nunca aceito do body (anti-spoofing P0).';`
    );
    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN import_process_approvals.approver_role IS 'G11-COMEX: papel de alcada, SEMPRE resolvido pelo modulo de acesso do usuario logado (permissions.diretor) — nunca aceito do body.';`
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('import_process_approvals');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_import_process_approvals_approver_role";');
  },
};
