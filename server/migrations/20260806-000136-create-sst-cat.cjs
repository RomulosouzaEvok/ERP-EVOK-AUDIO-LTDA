'use strict';

/**
 * BLOCO 1 SST — UC-46, RF-SST-024/025, BR-SST-015/017.
 *
 * `sst_cats`: uma-ou-muitas CATs por acidente (inicial + reaberturas —
 * cada reabertura é uma NOVA linha `tipo = 'reabertura'`, nunca uma
 * alteração da CAT original: isso já resolve a imutabilidade de conteúdo
 * por desenho, sem precisar duplicar a trigger de `sst_acidentes`).
 *
 * IMUTABILIDADE PARCIAL: apenas as colunas de acompanhamento de
 * transmissão eSocial (`status_esocial_s2210`, `recibo_esocial`,
 * `data_envio_esocial`) podem mudar depois da criação — todo o conteúdo
 * legal da CAT (tipo, data_emissao, emitente, acidente_id) é fixado no
 * INSERT. Mesma técnica de trigger parcial de `sst_acidentes`.
 *
 * `prazo_limite` é calculado em aplicação (RNF-SST-04: precisa considerar
 * calendário de dias úteis/feriados, o que não é responsabilidade do
 * banco) e persistido para não recalcular a cada leitura do dashboard.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sst_cats', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      acidente_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sst_acidentes', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      numero_cat: { type: Sequelize.STRING(60), allowNull: true, comment: 'Número/recibo da CAT no eSocial, preenchido quando aceito' },
      tipo: {
        type: Sequelize.ENUM('inicial', 'reabertura', 'obito'),
        allowNull: false,
      },
      data_emissao: { type: Sequelize.DATEONLY, allowNull: false },
      prazo_limite: { type: Sequelize.DATEONLY, allowNull: false, comment: '1º dia útil seguinte à ocorrência, imediato (mesmo dia) em óbito — calculado em app (RNF-SST-04)' },
      emitente_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Usuário (Técnico SST) que emitiu a CAT',
      },
      status_esocial_s2210: {
        type: Sequelize.ENUM('pendente', 'enviado', 'aceito', 'rejeitado'),
        allowNull: false,
        defaultValue: 'pendente',
      },
      recibo_esocial: { type: Sequelize.STRING(80), allowNull: true },
      data_envio_esocial: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('sst_cats', ['acidente_id'], { name: 'idx_sst_cats_acidente_id' });
    await queryInterface.addIndex('sst_cats', ['status_esocial_s2210'], { name: 'idx_sst_cats_status_esocial' });
    await queryInterface.addIndex('sst_cats', ['prazo_limite'], { name: 'idx_sst_cats_prazo_limite' });

    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION sst_lock_cat() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'sst_cats id=% nao pode ser excluida (RNF-SST-01/RF-SST-043: evento eSocial nunca descartado silenciosamente).', OLD.id;
        END IF;

        IF NEW.id = OLD.id
           AND NEW.acidente_id = OLD.acidente_id
           AND (NEW.numero_cat IS NOT DISTINCT FROM OLD.numero_cat)
           AND NEW.tipo = OLD.tipo
           AND NEW.data_emissao = OLD.data_emissao
           AND NEW.prazo_limite = OLD.prazo_limite
           AND NEW.emitente_id = OLD.emitente_id
           AND NEW.created_at = OLD.created_at
        THEN
          RETURN NEW;
        END IF;

        RAISE EXCEPTION 'sst_cats id=%: conteudo legal imutavel apos emissao; somente colunas de status eSocial sao atualizaveis (RNF-SST-01).', OLD.id;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryInterface.sequelize.query(`
      CREATE TRIGGER trg_sst_lock_cat
      BEFORE UPDATE OR DELETE ON sst_cats
      FOR EACH ROW EXECUTE FUNCTION sst_lock_cat();
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trg_sst_lock_cat ON sst_cats;');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS sst_lock_cat();');
    await queryInterface.dropTable('sst_cats');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_cats_tipo";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_cats_status_esocial_s2210";');
  },
};
