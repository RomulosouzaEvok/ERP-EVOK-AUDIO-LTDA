'use strict';

/**
 * BLOCO 1 SST — UC-46, RF-SST-022/023/026, BR-SST-016/017/018.
 *
 * Cria `sst_acidentes`, `sst_acidente_testemunhas` (join N:N com
 * `employees`) e `sst_investigacoes_acidente`.
 *
 * IMUTABILIDADE (RNF-SST-01, BR-SST-017): mesmo padrão de
 * `sst_entregas_epi` (20260806-000131) — rascunho (`confirmado = false`)
 * até o registro estar completo, depois travado por trigger contra
 * UPDATE/DELETE. Exceção: `dias_perdidos` e `houve_cat` PRECISAM poder
 * evoluir depois da confirmação (dias perdidos são atualizados ao longo do
 * afastamento; `houve_cat` passa a `true` quando a CAT é emitida) — por
 * isso a trigger permite update SOMENTE dessas duas colunas quando
 * `confirmado = true`; qualquer outra coluna alterada nesse estado é
 * bloqueada. Isso é uma variação da trava "tudo ou nada" da EntregaEPI,
 * necessária porque o próprio brief pede "dias perdidos (atualizável)"
 * mesmo em registro imutável (BR-SST-017: "complementos ... são
 * lançamentos adicionais com trilha de auditoria" — modelado como
 * atualização controlada de 2 colunas específicas em `sst_acidentes`
 * (consolidado, para leitura rápida) MAIS uma tabela insert-only
 * `sst_acidente_complementos` (quem, quando, valor anterior/novo, motivo)
 * — ver criação da tabela abaixo. Ajuste feito na auditoria cruzada
 * (`AuditorIntegrador`, 2026-08-06): a primeira versão desta migration não
 * tinha a tabela de trilha, mas o contrato já publicado em
 * `BLOCO_1_SST_API.md` §3 (`POST /:id/complements`) e a base legal de
 * BR-SST-017 (Lei 8.213/91) exigem o registro de quem/quando/motivo por
 * lançamento, não apenas o valor consolidado.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sst_acidentes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      data_hora: { type: Sequelize.DATE, allowNull: false },
      tipo: {
        type: Sequelize.ENUM('tipico', 'trajeto', 'doenca_ocupacional'),
        allowNull: false,
      },
      setor_local: { type: Sequelize.STRING(150), allowNull: false },
      descricao: { type: Sequelize.TEXT, allowNull: false },
      parte_corpo_atingida: { type: Sequelize.STRING(100), allowNull: true },
      agente_causador: { type: Sequelize.STRING(150), allowNull: true },
      gravidade: {
        type: Sequelize.ENUM('sem_afastamento', 'com_afastamento', 'incapacidade_permanente', 'obito'),
        allowNull: false,
      },
      dias_perdidos: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, comment: 'Atualizável mesmo após confirmado (ver nota de imutabilidade no cabeçalho)' },
      houve_cat: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, comment: 'Atualizável mesmo após confirmado — setado quando a 1ª CAT é emitida' },
      justificativa_sem_cat: { type: Sequelize.TEXT, allowNull: true, comment: 'RF-SST-025/BR-SST-016: obrigatória quando gravidade=sem_afastamento e o Técnico SST decide não emitir CAT' },
      confirmado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, comment: 'false=rascunho, true=confirmado (imutável exceto dias_perdidos/houve_cat, trigger sst_lock_acidente)' },
      confirmado_em: { type: Sequelize.DATE, allowNull: true },
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

    await queryInterface.sequelize.query(`
      ALTER TABLE sst_acidentes ADD CONSTRAINT ck_sst_acidentes_dias_perdidos_nao_negativo CHECK (dias_perdidos >= 0);
    `);

    await queryInterface.addIndex('sst_acidentes', ['employee_id'], { name: 'idx_sst_acidentes_employee_id' });
    await queryInterface.addIndex('sst_acidentes', ['data_hora'], { name: 'idx_sst_acidentes_data_hora' });
    await queryInterface.addIndex('sst_acidentes', ['gravidade'], { name: 'idx_sst_acidentes_gravidade' });

    await queryInterface.createTable('sst_acidente_testemunhas', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      acidente_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sst_acidentes', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'CASCADE: lista de testemunhas não sobrevive à remoção do acidente (não deveria acontecer na prática, pois acidente é imutável/retido 20 anos, mas mantém o join coerente)',
      },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sst_acidente_testemunhas', ['acidente_id'], { name: 'idx_sst_acidente_testemunhas_acidente_id' });
    await queryInterface.addIndex('sst_acidente_testemunhas', ['acidente_id', 'employee_id'], { name: 'uq_sst_acidente_testemunhas_par', unique: true });

    await queryInterface.createTable('sst_investigacoes_acidente', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      acidente_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'sst_acidentes', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'unique: acidente tem zero-ou-uma investigação (entidade (b).9 do brief)',
      },
      causas_identificadas: { type: Sequelize.TEXT, allowNull: true, comment: 'Lista de causas (árvore de causas), texto estruturado em app' },
      participantes: { type: Sequelize.TEXT, allowNull: true, comment: 'Descrição livre dos participantes (SST + CIPA + liderança); vínculo formal por employee fica fora do MVP (baixo volume, sem necessidade de FK N:N no bloco P0)' },
      evidencias_urls: { type: Sequelize.TEXT, allowNull: true, comment: 'Lista de URLs de evidência (fotos/depoimentos), serializada; sem tabela dedicada por volume baixo' },
      concluida_em: { type: Sequelize.DATE, allowNull: true },
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

    // Trilha de auditoria de complementos (BR-SST-017: "complementos ...
    // são lançamentos adicionais com trilha de auditoria"; contrato já
    // firmado em BLOCO_1_SST_API.md §3, POST /:id/complements). Adicionado
    // na auditoria cruzada (AuditorIntegrador, 2026-08-06): a migration
    // original só permitia UPDATE direto de dias_perdidos/houve_cat via
    // trigger, sem histórico de quem/quando/motivo alterou — o próprio
    // comentário original já previa promover para tabela insert-only "se
    // essa trilha vier a ser exigida"; a API já assume que ela existe, e
    // BR-SST-017 (base legal Lei 8.213/91) exige o registro, então a
    // trilha é obrigatória agora, não uma melhoria futura. O use-case de
    // `POST /:id/complements` deve inserir uma linha aqui E then atualizar
    // a coluna consolidada (dias_perdidos/houve_cat) em `sst_acidentes` na
    // mesma transação — o trigger sst_lock_acidente abaixo continua sendo
    // a última linha de defesa contra alteração das demais colunas.
    await queryInterface.createTable('sst_acidente_complementos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      acidente_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sst_acidentes', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      campo: {
        type: Sequelize.ENUM('dias_perdidos', 'houve_cat'),
        allowNull: false,
        comment: 'Única coluna que o trigger sst_lock_acidente permite atualizar em sst_acidentes após confirmado',
      },
      valor_anterior: { type: Sequelize.STRING(50), allowNull: true },
      valor_novo: { type: Sequelize.STRING(50), allowNull: false },
      motivo: { type: Sequelize.TEXT, allowNull: false },
      registrado_por: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sst_acidente_complementos', ['acidente_id'], { name: 'idx_sst_acidente_complementos_acidente_id' });

    // Trigger de imutabilidade parcial (ver justificativa no cabeçalho).
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION sst_lock_acidente() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          IF OLD.confirmado THEN
            RAISE EXCEPTION 'sst_acidentes id=% e confirmado; DELETE nao permitido (RNF-SST-01/BR-SST-017).', OLD.id;
          END IF;
          RETURN OLD;
        END IF;

        IF OLD.confirmado THEN
          IF NEW.id = OLD.id
             AND NEW.employee_id = OLD.employee_id
             AND NEW.data_hora = OLD.data_hora
             AND NEW.tipo = OLD.tipo
             AND NEW.setor_local = OLD.setor_local
             AND NEW.descricao = OLD.descricao
             AND (NEW.parte_corpo_atingida IS NOT DISTINCT FROM OLD.parte_corpo_atingida)
             AND (NEW.agente_causador IS NOT DISTINCT FROM OLD.agente_causador)
             AND NEW.gravidade = OLD.gravidade
             AND (NEW.justificativa_sem_cat IS NOT DISTINCT FROM OLD.justificativa_sem_cat)
             AND NEW.confirmado = OLD.confirmado
             AND NEW.confirmado_em = OLD.confirmado_em
             AND NEW.registrado_por = OLD.registrado_por
             AND NEW.created_at = OLD.created_at
          THEN
            -- Somente dias_perdidos/houve_cat (e updated_at) puderam mudar.
            RETURN NEW;
          END IF;
          RAISE EXCEPTION 'sst_acidentes id=% ja confirmado; somente dias_perdidos/houve_cat sao atualizaveis (RNF-SST-01/BR-SST-017).', OLD.id;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryInterface.sequelize.query(`
      CREATE TRIGGER trg_sst_lock_acidente
      BEFORE UPDATE OR DELETE ON sst_acidentes
      FOR EACH ROW EXECUTE FUNCTION sst_lock_acidente();
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trg_sst_lock_acidente ON sst_acidentes;');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS sst_lock_acidente();');
    await queryInterface.dropTable('sst_acidente_complementos');
    await queryInterface.dropTable('sst_investigacoes_acidente');
    await queryInterface.dropTable('sst_acidente_testemunhas');
    await queryInterface.dropTable('sst_acidentes');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_acidentes_tipo";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_acidentes_gravidade";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_acidente_complementos_campo";');
  },
};
