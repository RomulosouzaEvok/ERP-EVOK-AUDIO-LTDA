'use strict';

/**
 * Dá ao banco a hierarquia organizacional que só existia em documento.
 *
 * ## O defeito que esta migration corrige
 *
 * Achados **F-6** e **F-7** da auditoria de 2026-08-11
 * (`docs/governance/auditorias/AUDITORIA_AMPLA_2026-08-11.md` §7):
 *
 * - `departments` tinha 17 linhas planas, **sem nenhuma noção de diretoria**.
 *   As 4 diretorias viviam apenas em
 *   `docs/administrativo/05-ORGANOGRAMA_EXECUTIVO.md` e na navegação do
 *   frontend. Consequência medida: **nenhum relatório do ERP consegue agregar
 *   por diretoria** — um Diretor Industrial não tem como pedir "os números dos
 *   meus 5 departamentos" sem somar à mão.
 *
 * - `access_profiles` se ligava a departamento **por nome digitado à mão**, e
 *   dois dos 21 perfis já haviam derivado ("Tecnologia da Informacao" onde o
 *   seed diz `TI`; "Seguranca e Saude do Trabalho" onde diz
 *   `Segurança do Trabalho`). Renomear as strings seria remendo: o vínculo
 *   real é n:1 e merece uma FK — `Compras (analista)` e `Compras (gerente)`
 *   são dois perfis do MESMO departamento por desenho.
 *
 * ## Por que uma tabela `directorates`, e não `departments.parent_id`
 *
 * A modelagem clássica de hierarquia em SQL é a *adjacency list*
 * (auto-referência `parent_id`), e ela seria a escolha certa se pai e filho
 * fossem a mesma entidade. **Aqui não são.** No seed, `Diretoria (01)` é UM
 * departamento, e os quatro diretores são *cargos* dentro dele
 * (`docs/administrativo/01-DIRETORIA.md`). Usar `parent_id` obrigaria a
 * inventar linhas falsas em `departments` chamadas "Diretoria Industrial",
 * "Diretoria Comercial" — departamentos que não existem na empresa, criados
 * só para servir de nó de árvore. Seria fabricar dado para caber no modelo.
 *
 * Diretoria é uma entidade distinta: agrupa departamentos, tem cargo de
 * diretor próprio e pode estar **vaga**. Hierarquia fixa de dois níveis →
 * uma tabela por nível. É também como ERPs de mercado tratam *organizational
 * units* acima do departamento.
 *
 * ## Por que `directorate_id` é NULL-ável
 *
 * Porque a estrutura real tem uma exceção honesta: **SST (15) é transversal**,
 * "reporta tipicamente à Diretoria/RH, varia por porte de empresa" — palavras
 * do próprio organograma. `NULL` diz exatamente isso: sem diretoria fixa.
 * Forçar `NOT NULL` obrigaria a escolher uma diretoria que a empresa não
 * escolheu, e o banco passaria a afirmar algo falso.
 *
 * ## Diretoria de Suprimentos & Logística
 *
 * Criada por decisão do dono em 2026-08-11, reunindo Compras (07),
 * Almoxarifado (06) e Expedição (11). Resolve três defeitos do organograma
 * anterior: o desenho ASCII punha ALM no braço Administrativo-Financeiro
 * enquanto a tabela do mesmo arquivo o punha no Industrial; a nota de EXP
 * ficava pendurada em MANUT; e Compras era "transversal, sem diretoria fixa"
 * — uma não-decisão. **O cargo de diretor está vago** — por isso
 * `manager_id` nasce `NULL` em todas as linhas: o banco não inventa ocupante.
 *
 * ## Efeito nas linhas existentes
 *
 * Nenhuma perda. Uma tabela nova e duas colunas NULL-áveis. O backfill é
 * determinístico (por `sigla` nos departamentos, por nome nos perfis) e
 * tolerante: em um banco sem os perfis de teste, os `UPDATE` afetam 0 linhas
 * sem erro.
 *
 * ⚠️ `comment:` NÃO é usado em `createTable`/`addColumn` (corrompe o SQL
 * gerado neste projeto) — os comentários vão em `COMMENT ON COLUMN`.
 */

/**
 * Diretorias do organograma. `code` é a chave natural — é por ela que o seed,
 * as guardas e o frontend se referem à linha, nunca pelo `id` serial.
 */
const DIRECTORATES = [
  { code: 'CEO', name: 'Diretoria', position: 'CEO / Diretor Presidente' },
  { code: 'IND', name: 'Diretoria Industrial', position: 'Diretor Industrial' },
  { code: 'SUP', name: 'Suprimentos & Logística', position: 'Diretor de Suprimentos & Logística' },
  { code: 'COM', name: 'Diretoria Comercial', position: 'Diretor Comercial' },
  { code: 'ADM', name: 'Administrativo-Financeiro', position: 'Diretor Administrativo-Financeiro' },
];

/**
 * Sigla do departamento → código da diretoria.
 * Ausente = transversal (`directorate_id` fica NULL). Hoje só `SST`.
 */
const DEPARTMENT_TO_DIRECTORATE = {
  DIR: 'CEO',
  ENG: 'IND',
  PCP: 'IND',
  PROD: 'IND',
  QUAL: 'IND',
  MANUT: 'IND',
  COMP: 'SUP',
  ALM: 'SUP',
  EXP: 'SUP',
  VEND: 'COM',
  MKT: 'COM',
  RH: 'ADM',
  FIN: 'ADM',
  JUR: 'ADM',
  TI: 'ADM',
  FAC: 'ADM',
};

/**
 * Nome do perfil → sigla do departamento que ele serve.
 *
 * Mapeamento explícito e único (não é regra de negócio recorrente): depois
 * deste backfill, o vínculo passa a ser a FK, e o nome do perfil volta a ser
 * só um rótulo legível. Perfis de sistema, sem departamento, não entram aqui
 * e ficam com `department_id` NULL — é o caso de `Administrador Geral`.
 */
const PROFILE_TO_DEPARTMENT = {
  'Diretoria': 'DIR',
  'Diretoria Executiva': 'DIR',
  'Recursos Humanos': 'RH',
  'Engenharia do Produto': 'ENG',
  'PCP': 'PCP',
  'Producao': 'PROD',
  'Almoxarifado': 'ALM',
  'Compras (analista)': 'COMP',
  'Compras (gerente)': 'COMP',
  'Vendas': 'VEND',
  'Financeiro': 'FIN',
  'Qualidade': 'QUAL',
  // Laboratório de Testes é a subárea LAB de Qualidade
  // (`docs/00-ESTRUTURA_ORGANIZACIONAL.md` § Subáreas funcionais).
  'Analista de Laboratorio': 'QUAL',
  'Expedicao': 'EXP',
  'Manutencao': 'MANUT',
  'Tecnologia da Informacao': 'TI',
  'Marketing': 'MKT',
  'Seguranca e Saude do Trabalho': 'SST',
  'Juridico': 'JUR',
  'Facilities': 'FAC',
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable(
        'directorates',
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          code: { type: Sequelize.STRING(10), allowNull: false, unique: true },
          name: { type: Sequelize.STRING(100), allowNull: false },
          position_title: { type: Sequelize.STRING(120), allowNull: false },
          manager_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'employees', key: 'id' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
          created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `COMMENT ON TABLE directorates IS
           'Diretorias do organograma (nivel acima de departments). Fonte: docs/administrativo/05-ORGANOGRAMA_EXECUTIVO.md'`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN directorates.code IS 'Chave natural (CEO, IND, SUP, COM, ADM) — referencia estavel, nunca o id serial'`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN directorates.manager_id IS 'FK -> employees.id (diretor). NULL = cargo vago, que e o caso de SUP em 2026-08-11'`,
        { transaction },
      );

      for (const directorate of DIRECTORATES) {
        await queryInterface.sequelize.query(
          `INSERT INTO directorates (code, name, position_title, active, created_at, updated_at)
           VALUES (:code, :name, :position, true, NOW(), NOW())
           ON CONFLICT (code) DO NOTHING`,
          { replacements: directorate, transaction },
        );
      }

      await queryInterface.addColumn(
        'departments',
        'directorate_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'directorates', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        { transaction },
      );
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN departments.directorate_id IS
           'FK -> directorates.id. NULL = transversal, sem diretoria fixa (hoje so SST)'`,
        { transaction },
      );

      for (const [sigla, directorateCode] of Object.entries(DEPARTMENT_TO_DIRECTORATE)) {
        await queryInterface.sequelize.query(
          `UPDATE departments
              SET directorate_id = (SELECT id FROM directorates WHERE code = :directorateCode),
                  updated_at = NOW()
            WHERE sigla = :sigla`,
          { replacements: { sigla, directorateCode }, transaction },
        );
      }

      await queryInterface.addColumn(
        'access_profiles',
        'department_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'departments', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        { transaction },
      );
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN access_profiles.department_id IS
           'FK -> departments.id (n:1 - um departamento pode ter varios perfis, ex.: Compras analista/gerente). NULL = perfil de sistema, sem departamento'`,
        { transaction },
      );

      for (const [nome, sigla] of Object.entries(PROFILE_TO_DEPARTMENT)) {
        await queryInterface.sequelize.query(
          `UPDATE access_profiles
              SET department_id = (SELECT id FROM departments WHERE sigla = :sigla),
                  updated_at = NOW()
            WHERE nome = :nome`,
          { replacements: { nome, sigla }, transaction },
        );
      }

      await queryInterface.addIndex('departments', ['directorate_id'], {
        name: 'departments_directorate_id_idx',
        transaction,
      });
      await queryInterface.addIndex('access_profiles', ['department_id'], {
        name: 'access_profiles_department_id_idx',
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeIndex('access_profiles', 'access_profiles_department_id_idx', { transaction });
      await queryInterface.removeIndex('departments', 'departments_directorate_id_idx', { transaction });
      await queryInterface.removeColumn('access_profiles', 'department_id', { transaction });
      await queryInterface.removeColumn('departments', 'directorate_id', { transaction });
      await queryInterface.dropTable('directorates', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
