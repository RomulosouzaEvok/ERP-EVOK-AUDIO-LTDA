'use strict';

/**
 * BLOCO 1 SST — UC-45, RF-SST-012/013, BR-SST-010/012.
 *
 * Cria `sst_asos` e `sst_exames_complementares`.
 *
 * DECISÃO DE FRONTEIRA (BLOCO_1_SST_REQUISITOS.md §5.1, BR-SST-010): ASO é
 * entidade PRÓPRIA do módulo SST, nunca um registro em
 * `employee_documents`. O RH nunca lê estas tabelas diretamente — consome
 * apenas um status derivado (apto/vencido/inapto/apto_com_restricoes) via
 * endpoint de leitura dedicado (RF-SST-021, responsabilidade do
 * `ArquitetoSoftwareAPI`). Nenhuma coluna é adicionada a
 * `employees`/`employee_documents` por este módulo.
 *
 * DADO SENSÍVEL (LGPD, BR-SST-036/RF-SST-054): `resultado`, `restricoes`,
 * `medico_examinador`, `arquivo_url` são conteúdo clínico — controle de
 * acesso (RBAC módulo `sst`/`rh` restrito + log de leitura) é
 * responsabilidade da camada de aplicação/API; o banco não tem RLS
 * (Row-Level Security) hoje — não é usado em nenhuma tabela do projeto
 * (ver 05-ACESSOS_E_ISOLAMENTO.md), mantendo consistência.
 *
 * `sst_asos` NÃO tem trigger de imutabilidade: ao contrário de
 * EntregaEPI/Acidente, o brief não define ASO como documento imutável após
 * emitido (pode haver correção de laudo/data por decisão médica) — a
 * trilha de auditoria de UPDATE é responsabilidade do log de acesso/escrita
 * já existente no projeto (AuditLog), não uma trava estrutural adicional.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sst_asos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      tipo: {
        type: Sequelize.ENUM('admissional', 'periodico', 'retorno_trabalho', 'mudanca_riscos', 'demissional'),
        allowNull: false,
      },
      data_realizacao: { type: Sequelize.DATEONLY, allowNull: false },
      resultado: {
        type: Sequelize.ENUM('apto', 'inapto', 'apto_com_restricoes'),
        allowNull: false,
      },
      restricoes: { type: Sequelize.TEXT, allowNull: true, comment: 'Dado clinico sensivel (LGPD) — preenchido quando resultado = apto_com_restricoes' },
      medico_examinador: { type: Sequelize.STRING(150), allowNull: false, comment: 'Nome/CRM do médico examinador' },
      medico_coordenador_pcmso: { type: Sequelize.STRING(150), allowNull: true },
      data_vencimento: { type: Sequelize.DATEONLY, allowNull: true, comment: 'Vencimento do próximo ASO periódico, calculado em app a partir de sst_planos_exames (BR-SST-011)' },
      arquivo_url: { type: Sequelize.STRING(255), allowNull: true },
      status_esocial_s2220: {
        type: Sequelize.ENUM('pendente', 'enviado', 'aceito', 'rejeitado'),
        allowNull: false,
        defaultValue: 'pendente',
      },
      recibo_esocial: { type: Sequelize.STRING(80), allowNull: true },
      registrado_por: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('sst_asos', ['employee_id'], { name: 'idx_sst_asos_employee_id' });
    await queryInterface.addIndex('sst_asos', ['tipo'], { name: 'idx_sst_asos_tipo' });
    await queryInterface.addIndex('sst_asos', ['data_vencimento'], { name: 'idx_sst_asos_data_vencimento' });
    await queryInterface.addIndex('sst_asos', ['status_esocial_s2220'], { name: 'idx_sst_asos_status_esocial' });

    await queryInterface.createTable('sst_exames_complementares', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      aso_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sst_asos', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'CASCADE: exame complementar não tem existência fora do ASO pai (diferente das demais FKs do módulo, que são RESTRICT por serem registros históricos independentes)',
      },
      tipo_exame: { type: Sequelize.STRING(80), allowNull: false, comment: 'Ex.: audiometria, espirometria, hemograma, acuidade visual' },
      data_realizacao: { type: Sequelize.DATEONLY, allowNull: false },
      resultado_laudo_url: { type: Sequelize.STRING(255), allowNull: true },
      alterado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, comment: 'true = resultado fora da normalidade' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('sst_exames_complementares', ['aso_id'], { name: 'idx_sst_exames_complementares_aso_id' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sst_exames_complementares');
    await queryInterface.dropTable('sst_asos');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_asos_tipo";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_asos_resultado";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_asos_status_esocial_s2220";');
  },
};
