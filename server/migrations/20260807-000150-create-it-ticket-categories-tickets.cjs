'use strict';

/**
 * BLOCO 2 TI (departamento 13) — UC-49, RF-TI-001 a 010/014-016.
 *
 * Cria o núcleo do helpdesk de TI:
 * - `it_ticket_categories`: cadastro leve e editável (sem deploy) das
 *   categorias de chamado (hardware, software, rede, e-mail, sistema ERP,
 *   telefonia, acesso, outros — seed fica a cargo do `programador`/seed
 *   idempotente, não desta migration, mesmo padrão de outros cadastros).
 * - `it_tickets`: chamado de TI. `requester_id` é sempre populado a partir
 *   do JWT pela aplicação (BR-TI-002, nunca do payload) — a coluna aceita
 *   qualquer `users.id` porque a trava de spoofing é de aplicação, não de
 *   schema (mesmo padrão anti-spoofing 3.1 do restante do projeto).
 *
 * NÃO duplica inventário de TI (`assets`, BR-TI-008) nem manutenção
 * (`maintenance_orders`, BR-TI-009) — apenas referencia por FK opcional.
 *
 * `requester_id` é NULLABLE (corrigido por auditoria cruzada
 * `docs/business/BLOCO_2_TI_AUDITORIA.md`, achado #3): o chamado `urgent`
 * gerado automaticamente por falha de backup (RF-TI-040/BR-TI-017) não tem
 * um usuário humano solicitante. Quando `requester_id IS NULL`,
 * `system_generated` deve ser `true` (CHECK garante que um dos dois esteja
 * presente) — chamados abertos por humano sempre têm `requester_id`
 * populado do JWT (BR-TI-002) e `system_generated=false`.
 *
 * `access_request_id` nasce como coluna simples (INTEGER, sem FK) porque
 * `it_access_requests` ainda não existe nesta migration — a FK é fechada em
 * `20260807-000154-create-it-access-requests.cjs`, mesmo padrão de
 * fechamento tardio de FK já usado em
 * `20260806-000133`/`20260806-000139` (sst_planos_exames.ges_id) e
 * `20260806-000138`/`20260806-000140` (sst_membros_cipa.treinamento_cipa_id).
 * Nenhum dado é inserido em `it_tickets.access_request_id` entre as duas
 * migrations em produção, então não há risco de órfão.
 *
 * `generated_ticket_id`/vínculo inverso de backup NÃO é criado aqui — é
 * fechado em `20260807-000155-create-it-backup-logs.cjs`
 * (`it_backup_logs.generated_ticket_id` aponta PARA `it_tickets`, não o
 * contrário, então não há dependência circular real de FK).
 *
 * FKs `ON DELETE RESTRICT` (padrão do projeto, CLAUDE.md §7): nenhum
 * chamado de TI é apagado (BR-TI-016/RF-TI-016, `status='canceled'` em vez
 * de DELETE), então RESTRICT em todas as referências evita órfãos e é
 * consistente com o restante do bloco.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('it_ticket_categories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      default_priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'medium',
        comment: 'Prioridade sugerida ao abrir chamado nesta categoria (RF-TI-001); o analista pode ajustar na triagem (RF-TI-004)',
      },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('it_ticket_categories', ['active'], { name: 'idx_it_ticket_categories_active' });

    await queryInterface.createTable('it_tickets', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      ticket_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'Numero legivel gerado pela aplicacao (ex.: TI-2026-0001), nao pelo banco',
      },
      requester_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Populado a partir do JWT pela aplicacao (BR-TI-002) — nunca aceito do payload. NULL apenas quando system_generated=true (RF-TI-040, chamado automatico de falha de backup).',
      },
      system_generated: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'true quando o chamado foi criado automaticamente pelo sistema (ex.: falha de it_backup_logs, RF-TI-040), sem requester_id humano',
      },
      opened_on_behalf_of: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Preenchido apenas quando o analista (modulo ti:operate) abre em nome de terceiro por telefone/presencial (RF-TI-003)',
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'it_ticket_categories', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        comment: 'Derivada de impact x urgency na abertura (herdada da categoria) e editavel pelo analista na triagem (RF-TI-004/005)',
      },
      impact: { type: Sequelize.SMALLINT, allowNull: true, comment: '1-3, opcional — usado para justificar a prioridade (matriz 3x3)' },
      urgency: { type: Sequelize.SMALLINT, allowNull: true, comment: '1-3, opcional — usado para justificar a prioridade (matriz 3x3)' },
      subject: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      asset_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'assets', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Equipamento afetado, opcional — busca por tag/QR do patrimonio (BR-TI-008, sem cadastro paralelo)',
      },
      assigned_to: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Analista de TI ou suporte terceirizado que assumiu o chamado',
      },
      status: {
        type: Sequelize.ENUM('open', 'in_progress', 'waiting', 'resolved', 'closed', 'canceled'),
        allowNull: false,
        defaultValue: 'open',
        comment: 'Transicoes validas em BR-TI-003 — enforcement de aplicacao, nao de banco (sem trigger de maquina de estados neste bloco)',
      },
      solution: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Obrigatoria para status=resolved (BR-TI-004) — validacao de aplicacao, nao CHECK de banco (permite rascunho antes de resolver)',
      },
      maintenance_order_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'maintenance_orders', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Preenchido quando o problema de equipamento exige intervencao fisica (RF-TI-007/BR-TI-009) — nao duplica o fluxo de manutencao',
      },
      access_request_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'FK fechada em 20260807-000154-create-it-access-requests.cjs (it_access_requests ainda nao existe nesta migration)',
      },
      first_response_at: { type: Sequelize.DATE, allowNull: true },
      resolved_at: { type: Sequelize.DATE, allowNull: true },
      closed_at: { type: Sequelize.DATE, allowNull: true },
      sla_response_due_at: { type: Sequelize.DATE, allowNull: true, comment: 'Calculado na abertura a partir da tabela de SLA por prioridade (parametrizavel em app, RF-TI-009/046)' },
      sla_resolution_due_at: { type: Sequelize.DATE, allowNull: true, comment: 'Calculado na abertura; status=waiting pausa o cronometro (acumula waiting_minutes) — logica de aplicacao' },
      waiting_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, comment: 'Acumulado de tempo em status=waiting (pausa do SLA de resolucao, BR-TI-005)' },
      satisfaction_rating: { type: Sequelize.SMALLINT, allowNull: true, comment: '1-5, opcional, preenchido na confirmacao de fechamento (RF-TI-012)' },
      satisfaction_comment: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE it_tickets ADD CONSTRAINT ck_it_tickets_impact_range CHECK (impact IS NULL OR impact BETWEEN 1 AND 3);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE it_tickets ADD CONSTRAINT ck_it_tickets_urgency_range CHECK (urgency IS NULL OR urgency BETWEEN 1 AND 3);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE it_tickets ADD CONSTRAINT ck_it_tickets_satisfaction_range CHECK (satisfaction_rating IS NULL OR satisfaction_rating BETWEEN 1 AND 5);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE it_tickets ADD CONSTRAINT ck_it_tickets_waiting_minutes_non_negative CHECK (waiting_minutes >= 0);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE it_tickets ADD CONSTRAINT ck_it_tickets_solution_when_resolved
      CHECK (status NOT IN ('resolved', 'closed') OR solution IS NOT NULL);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE it_tickets ADD CONSTRAINT ck_it_tickets_requester_or_system
      CHECK (requester_id IS NOT NULL OR system_generated = true);
    `);

    await queryInterface.addIndex('it_tickets', ['requester_id'], { name: 'idx_it_tickets_requester_id' });
    await queryInterface.addIndex('it_tickets', ['assigned_to'], { name: 'idx_it_tickets_assigned_to' });
    await queryInterface.addIndex('it_tickets', ['status'], { name: 'idx_it_tickets_status' });
    await queryInterface.addIndex('it_tickets', ['category_id'], { name: 'idx_it_tickets_category_id' });
    await queryInterface.addIndex('it_tickets', ['asset_id'], { name: 'idx_it_tickets_asset_id' });
    await queryInterface.addIndex('it_tickets', ['priority'], { name: 'idx_it_tickets_priority' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('it_tickets');
    await queryInterface.dropTable('it_ticket_categories');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_it_ticket_categories_default_priority";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_it_tickets_priority";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_it_tickets_status";');
  },
};
