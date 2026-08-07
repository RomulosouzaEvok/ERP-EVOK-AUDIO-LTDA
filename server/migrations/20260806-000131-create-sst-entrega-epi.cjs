'use strict';

/**
 * BLOCO 1 SST — UC-44, RF-SST-004 a 009, BR-SST-002/003/004/006/007.
 *
 * Cria `sst_entregas_epi` (linha da "Ficha de EPI") e duas tabelas de
 * complemento (`sst_devolucoes_epi`, `sst_estornos_entrega_epi`).
 *
 * DECISÃO DE IMUTABILIDADE (RNF-SST-01, BR-SST-006):
 * `sst_entregas_epi` é criada em rascunho (`confirmada = false`) para
 * permitir preencher os dados antes de anexar a evidência de recebimento
 * (BR-SST-002). A confirmação é a ÚNICA transição permitida por UPDATE
 * (rascunho -> confirmada, setando `confirmada`, `evidencia_*`,
 * `data_prevista_troca`, `inventory_movement_id`). Depois de
 * `confirmada = true`, a linha é travada por trigger (`sst_lock_entrega_epi`)
 * contra qualquer novo UPDATE ou DELETE — nenhuma exceção, nem para campos
 * "inofensivos" (documento de valor probatório em ação
 * trabalhista/previdenciária, BR-SST-006).
 *
 * Correções pós-confirmação (ex.: erro de lançamento) NÃO reabrem a linha:
 * usam `sst_estornos_entrega_epi` (insert-only, trilha de auditoria) — a
 * aplicação exibe a entrega original + o estorno, nunca apaga/edita a
 * original.
 *
 * Devolução de EPI (UC-44 A2 — dano/extravio, ou desligamento) também NÃO
 * é um UPDATE na entrega original (isso violaria a imutabilidade
 * pós-confirmação): é registrada em `sst_devolucoes_epi`, uma tabela
 * insert-only à parte, referenciando a entrega. Pequeno desvio de redação
 * do brief ("registra devolução ... na entrega original") em favor da
 * regra de imutabilidade mais forte e explícita do RF-SST-007 — a visão
 * consolidada (Ficha de EPI) faz o JOIN das duas tabelas para a UI.
 *
 * EXCEÇÃO ARQUITETURAL DELIBERADA (trigger em banco): o projeto documenta
 * em `docs/database/06-ESTRUTURAS_PROGRAMAVEIS.md` que TODA lógica de
 * negócio vive na aplicação, sem triggers. Este é o primeiro trigger do
 * projeto, e é uma exceção estreita e justificada: a trava de imutabilidade
 * aqui não é uma regra de PROCESSO (não decide fluxo, não calcula nada) — é
 * um INVARIANTE ESTRUTURAL de valor probatório legal (RNF-SST-01) que
 * precisa sobreviver a um bypass da API (ex.: alguém rodando UPDATE manual
 * via psql), o mesmo racional já aceito no projeto para
 * `uq_production_downtimes_open_per_work_center` (índice único parcial) —
 * aqui a garantia de UPDATE/DELETE não é possível só com CHECK/UNIQUE,
 * exige trigger. Deve ser tratada como exceção pontual, não precedente para
 * mover regra de negócio processual para o banco.
 *
 * INTEGRAÇÃO COM ESTOQUE (BLOCO_1_SST_REQUISITOS.md §5.2): a confirmação da
 * entrega, quando o TipoEPI tem `item_id`, deve disparar uma movimentação
 * de saída via `/api/inventory/movements` (reference_type identifica a
 * origem). Esta migration adiciona o valor `'sst_epi_delivery'` ao ENUM
 * `enum_inventory_movements_reference_type` para permitir essa referência
 * sem sobrecarregar o valor genérico `'adjustment'`.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Extende o ENUM de inventory_movements para a origem SST (fora de
    //    transação — ALTER TYPE ... ADD VALUE não pode rodar dentro de uma
    //    transação em versões antigas do Postgres; mesma técnica de
    //    20260806-000052-add-partially-invoiced-sale-status.cjs).
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_inventory_movements_reference_type" ADD VALUE IF NOT EXISTS 'sst_epi_delivery';`
    );

    await queryInterface.createTable('sst_entregas_epi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      tipo_epi_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sst_tipos_epi', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      quantidade: { type: Sequelize.DECIMAL(18, 6), allowNull: false },
      data_entrega: { type: Sequelize.DATEONLY, allowNull: false },
      motivo: {
        type: Sequelize.ENUM('primeira_entrega', 'troca_periodica', 'dano', 'perda', 'mudanca_funcao'),
        allowNull: false,
      },
      data_prevista_troca: { type: Sequelize.DATEONLY, allowNull: true, comment: 'Calculada em app: data_entrega + tipo_epi.vida_util_dias (BR-SST-004)' },
      evidencia_tipo: {
        type: Sequelize.ENUM('assinatura_digitalizada', 'aceite_eletronico', 'biometria'),
        allowNull: true,
        comment: 'Preenchido só na confirmação (BR-SST-002)',
      },
      evidencia_arquivo_url: { type: Sequelize.STRING(255), allowNull: true },
      confirmada: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, comment: 'false=rascunho (editável), true=confirmada (imutável, trigger sst_lock_entrega_epi)' },
      confirmada_em: { type: Sequelize.DATE, allowNull: true },
      inventory_movement_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'inventory_movements', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Movimentação de saída gerada na confirmação, quando tipo_epi.item_id IS NOT NULL. NULL = TipoEPI ainda não rastreado como Item.',
      },
      entregue_por: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Técnico SST responsável pela entrega',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE sst_entregas_epi ADD CONSTRAINT ck_sst_entregas_epi_quantidade_positiva CHECK (quantidade > 0);
    `);

    await queryInterface.addIndex('sst_entregas_epi', ['employee_id'], { name: 'idx_sst_entregas_epi_employee_id' });
    await queryInterface.addIndex('sst_entregas_epi', ['tipo_epi_id'], { name: 'idx_sst_entregas_epi_tipo_epi_id' });
    await queryInterface.addIndex('sst_entregas_epi', ['data_prevista_troca'], { name: 'idx_sst_entregas_epi_data_prevista_troca' });
    await queryInterface.addIndex('sst_entregas_epi', ['confirmada'], { name: 'idx_sst_entregas_epi_confirmada' });

    await queryInterface.createTable('sst_devolucoes_epi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      entrega_epi_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sst_entregas_epi', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      data_devolucao: { type: Sequelize.DATEONLY, allowNull: false },
      condicao: { type: Sequelize.STRING(255), allowNull: false, comment: 'Estado do EPI devolvido (ex.: danificado, extraviado, reutilizável)' },
      registrado_por: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sst_devolucoes_epi', ['entrega_epi_id'], { name: 'idx_sst_devolucoes_epi_entrega_id' });

    await queryInterface.createTable('sst_estornos_entrega_epi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      entrega_epi_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sst_entregas_epi', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      motivo: { type: Sequelize.TEXT, allowNull: false },
      estornado_por: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sst_estornos_entrega_epi', ['entrega_epi_id'], { name: 'idx_sst_estornos_entrega_epi_entrega_id' });

    // 2. Trigger de imutabilidade pós-confirmação (ver justificativa no
    //    cabeçalho do arquivo).
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION sst_lock_entrega_epi() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          IF OLD.confirmada THEN
            RAISE EXCEPTION 'sst_entregas_epi id=% e confirmada; DELETE nao permitido (RNF-SST-01/BR-SST-006). Use sst_estornos_entrega_epi.', OLD.id;
          END IF;
          RETURN OLD;
        END IF;

        IF OLD.confirmada THEN
          RAISE EXCEPTION 'sst_entregas_epi id=% ja confirmada e imutavel (RNF-SST-01/BR-SST-006). Use sst_estornos_entrega_epi para correcao.', OLD.id;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryInterface.sequelize.query(`
      CREATE TRIGGER trg_sst_lock_entrega_epi
      BEFORE UPDATE OR DELETE ON sst_entregas_epi
      FOR EACH ROW EXECUTE FUNCTION sst_lock_entrega_epi();
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trg_sst_lock_entrega_epi ON sst_entregas_epi;');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS sst_lock_entrega_epi();');
    await queryInterface.dropTable('sst_estornos_entrega_epi');
    await queryInterface.dropTable('sst_devolucoes_epi');
    await queryInterface.dropTable('sst_entregas_epi');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_entregas_epi_motivo";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_entregas_epi_evidencia_tipo";');
    // Nota: o valor 'sst_epi_delivery' adicionado ao ENUM de
    // inventory_movements.reference_type NÃO é removido no down (Postgres
    // não suporta DROP VALUE de ENUM sem recriar o tipo inteiro) — mesmo
    // padrão já aceito em 20260806-000052-add-partially-invoiced-sale-status.cjs.
  },
};
