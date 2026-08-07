'use strict';

/**
 * BLOCO 1 SST (departamento 15) — UC-44, RF-SST-001/002/003.
 *
 * Cria as 2 primeiras tabelas do módulo SST (Segurança e Saúde do
 * Trabalho), catálogo de EPI e matriz função/setor × EPI:
 *
 * - `sst_tipos_epi` (TipoEPI): catálogo de EPI homologado. NÃO duplica o
 *   catálogo de `items` — vínculo opcional 1:1 (`item_id`, único quando
 *   preenchido) com um `Item` de estoque existente, decisão explícita do
 *   BLOCO_1_SST_REQUISITOS.md §5.2 (evitar 2ª fonte de verdade de saldo).
 *   `ca`/`ca_validade` são obrigatórios (BR-SST-001: só é permitido
 *   cadastrar/entregar EPI com CA informado); o *bloqueio* de entrega com
 *   CA vencido na data da operação é regra de aplicação (UC-44, E1) — o
 *   banco garante apenas que o dado exista, não que esteja "vencido ou
 *   não" em tempo real (isso depende da data corrente da operação).
 * - `sst_matriz_epi` (MatrizEPI): liga uma função (`employees.position`,
 *   texto livre — não há tabela normalizada de cargos no projeto) e/ou um
 *   setor (`departments.id`) a um TipoEPI, com quantidade padrão.
 *
 * FKs `ON DELETE RESTRICT` (padrão do projeto, CLAUDE.md §7): não é
 * possível excluir um TipoEPI com matriz ou entregas vinculadas, nem um
 * Item de estoque vinculado a um TipoEPI ativo.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sst_tipos_epi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nome: { type: Sequelize.STRING(150), allowNull: false, comment: 'Nome comercial do EPI (ex.: Protetor Auricular Plug)' },
      descricao: { type: Sequelize.TEXT, allowNull: true },
      ca: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Certificado de Aprovação (CAEPI/MTE) — obrigatório, BR-SST-001. Não usar placeholders sequenciais em produção (ver brief, correção (a) item 2).',
      },
      ca_validade: { type: Sequelize.DATEONLY, allowNull: false, comment: 'Validade do CA, definida pelo MTE — distinta da vida útil do item entregue (brief, correção (a) item 3)' },
      fabricante: { type: Sequelize.STRING(150), allowNull: true },
      vida_util_dias: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Periodicidade de troca em dias, definida pelo fabricante/PGR — usada para calcular EntregaEPI.data_prevista_troca (BR-SST-004)',
      },
      tamanhos_variacoes: { type: Sequelize.STRING(255), allowNull: true, comment: 'Lista livre de tamanhos/variações disponíveis (ex.: P/M/G), sem tabela normalizada dedicada — baixo volume de variação' },
      foto_url: { type: Sequelize.STRING(255), allowNull: true },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      item_id: {
        type: Sequelize.UUID,
        allowNull: true,
        unique: true,
        references: { model: 'items', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'FK opcional 1:1 -> items.id (almoxarifado). NULL = EPI ainda não rastreado como item de estoque (BLOCO_1_SST_REQUISITOS.md §5.2)',
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE sst_tipos_epi
      ADD CONSTRAINT ck_sst_tipos_epi_ca_nao_vazio
      CHECK (btrim(ca) <> '');
    `);

    await queryInterface.addIndex('sst_tipos_epi', ['ativo'], { name: 'idx_sst_tipos_epi_ativo' });
    await queryInterface.addIndex('sst_tipos_epi', ['ca'], { name: 'idx_sst_tipos_epi_ca' });

    await queryInterface.createTable('sst_matriz_epi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'departments', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Setor exigido (departamento). CASCADE: se o setor é removido do organograma, a exigência de EPI associada perde sentido (diferente de FKs de registro histórico, que são RESTRICT)',
      },
      position: { type: Sequelize.STRING(100), allowNull: true, comment: 'Função/cargo (employees.position, texto livre, sem tabela normalizada de cargos no projeto)' },
      tipo_epi_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sst_tipos_epi', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      quantidade_padrao: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 1 },
      observacao: { type: Sequelize.TEXT, allowNull: true },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE sst_matriz_epi
      ADD CONSTRAINT ck_sst_matriz_epi_alvo_definido
      CHECK (department_id IS NOT NULL OR position IS NOT NULL);
    `);

    await queryInterface.addIndex('sst_matriz_epi', ['department_id'], { name: 'idx_sst_matriz_epi_department_id' });
    await queryInterface.addIndex('sst_matriz_epi', ['position'], { name: 'idx_sst_matriz_epi_position' });
    await queryInterface.addIndex('sst_matriz_epi', ['tipo_epi_id'], { name: 'idx_sst_matriz_epi_tipo_epi_id' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sst_matriz_epi');
    await queryInterface.dropTable('sst_tipos_epi');
  },
};
