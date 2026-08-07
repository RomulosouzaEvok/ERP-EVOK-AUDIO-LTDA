'use strict';

/**
 * BLOCO 2 TI — UC-51, RF-TI-031 a 038, BR-TI-012/013.
 *
 * Cria `it_access_requests` (Solicitação de Acesso: grant/change/revoke) e
 * fecha a FK `it_tickets.access_request_id -> it_access_requests.id`
 * (coluna nasceu sem FK em `20260807-000150`, mesmo padrão de fechamento
 * tardio já usado no Bloco 1 SST — ver cabeçalho daquela migration).
 *
 * DECISÃO §5.2 do BLOCO_2_TI_REQUISITOS.md (aprovador de grant/change):
 * `approved_by` é uma FK genérica para `users.id`, sem uma FK dedicada de
 * "gestor de departamento" — a tabela `departments` já tem `manager_id`
 * (FK -> employees.id, ver `server/src/models/Department.ts`), então a
 * elegibilidade de quem pode aprovar ("possui `ti:approve`" OU "é o
 * `employees.user_id` do `departments.manager_id` do `department_id` da
 * solicitação") é resolvida pela camada de autorização/use-case no momento
 * da aprovação, não por uma FK de schema adicional — não há necessidade de
 * nova tabela "gestor de departamento", ela já existe.
 *
 * `checklist` é JSONB livre (offboarding: usuário desativado, e-mail
 * revogado, equipamentos recolhidos, arquivos transferidos) — a validação
 * de estrutura fica na aplicação (RF-TI-033).
 *
 * `corporate_email`/`equipment_needed` (corrigido por auditoria cruzada
 * `docs/business/BLOCO_2_TI_AUDITORIA.md`, achado #7): o contrato de API
 * (`BLOCO_2_TI_API.md` §4, `POST /api/ti/access-requests`) já expunha esses
 * dois campos no payload de `grant` (RF-TI-031, do brief: "e-mail
 * corporativo, equipamentos necessários"), mas a migration original não os
 * persistia — API prometia um campo que o banco não sustentava. Adicionados
 * aqui para fechar o gap antes da implementação.
 *
 * A execução (`executed_by`/`executed_at`) apenas REFERENCIA em texto/JSON
 * as operações reais já auditadas por `logAction`
 * (`PUT /api/users/:id/access-profile`, desativação de usuário) —
 * nenhuma tabela de autorização é duplicada aqui (BR-TI-013).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('it_access_requests', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      request_number: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      type: { type: Sequelize.ENUM('grant', 'change', 'revoke'), allowNull: false },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      requested_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Sempre do JWT (padrao anti-spoofing do projeto, aplicado por analogia a BR-TI-002)',
      },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'departments', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      requested_profile_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'access_profiles', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      justification: { type: Sequelize.TEXT, allowNull: true },
      corporate_email: {
        type: Sequelize.STRING(150),
        allowNull: true,
        comment: 'E-mail corporativo a provisionar/já provisionado (grant/change) — RF-TI-031',
      },
      equipment_needed: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Lista livre de equipamentos necessários informados na abertura (ex.: ["notebook","headset"]); a entrega real vira ItResponsibilityTerm via UC-50 — RF-TI-031',
      },
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Sempre do JWT de quem aprova. Elegibilidade (ti:approve OU gestor do department_id via departments.manager_id) e checada em app — ver nota de cabecalho §5.2',
      },
      approved_at: { type: Sequelize.DATE, allowNull: true },
      executed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      executed_at: { type: Sequelize.DATE, allowNull: true },
      execution_notes: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'done', 'rejected', 'canceled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      rejection_reason: { type: Sequelize.TEXT, allowNull: true },
      checklist: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Estrutura livre para offboarding (usuario desativado, e-mail revogado, equipamentos recolhidos, arquivos transferidos) — RF-TI-033',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('it_access_requests', ['employee_id'], { name: 'idx_it_access_requests_employee_id' });
    await queryInterface.addIndex('it_access_requests', ['status'], { name: 'idx_it_access_requests_status' });
    await queryInterface.addIndex('it_access_requests', ['type'], { name: 'idx_it_access_requests_type' });
    await queryInterface.addIndex('it_access_requests', ['department_id'], { name: 'idx_it_access_requests_department_id' });

    // Fecha a FK adiada de it_tickets.access_request_id (criada em
    // 20260807-000150 sem FK porque esta tabela ainda não existia).
    await queryInterface.addConstraint('it_tickets', {
      fields: ['access_request_id'],
      type: 'foreign key',
      name: 'fk_it_tickets_access_request_id',
      references: { table: 'it_access_requests', field: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });
    await queryInterface.addIndex('it_tickets', ['access_request_id'], { name: 'idx_it_tickets_access_request_id' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('it_tickets', 'idx_it_tickets_access_request_id');
    await queryInterface.removeConstraint('it_tickets', 'fk_it_tickets_access_request_id');
    await queryInterface.dropTable('it_access_requests');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_it_access_requests_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_it_access_requests_status";');
  },
};
