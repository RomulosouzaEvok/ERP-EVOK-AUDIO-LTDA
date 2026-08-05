'use strict';

/**
 * Bloco 1.1 (docs/governance/TODO.md) — Perfis de Acesso Configuráveis.
 *
 * Cria `access_profiles` (perfil de área/departamento) e
 * `access_profile_permissions` (matriz módulo × nível por perfil),
 * adiciona `users.access_profile_id` (nullable — null = sem perfil =
 * bloqueio total, UC-35-Exceção) e semeia o perfil "Administrador Geral"
 * com todas as permissões em `approve` (não atribuído a ninguém — o
 * admin global continua acima do sistema de perfis, ver
 * BUSINESS_RULES.md §3).
 *
 * Decisões aplicadas nesta entrega (ver docs/governance/TODO.md 1.1 e
 * docs/business/BUSINESS_RULES.md):
 * - `level` restrito a `operate`/`approve` (presença da linha já
 *   significa módulo visível/`view`; `approve` inclui `operate`).
 * - `allowed_warehouses` JSONB nullable em `access_profiles` (lista
 *   simples de depósitos permitidos) — não cria a tabela `warehouses`
 *   (fora de escopo, Bloco 4).
 * - Backfill: nenhum usuário existente recebe `access_profile_id`
 *   automaticamente (decisão UC-35-Exceção — não criar perfil
 *   provisório).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Idempotente: a migration baseline (20260731-000001) cria tabelas
    // dinamicamente a partir dos models Sequelize *atuais* em dist/ — um
    // banco criado do zero hoje já nasce com access_profiles/
    // access_profile_permissions/users.access_profile_id prontos. Sem essa
    // checagem, createTable/addColumn falham com "already exists" contra
    // qualquer banco novo (descoberto ao isolar server/.env.test, 2026-08-05
    // — mesma causa do fix em 20260803-000004-create-work-centers.cjs).
    const tables = await queryInterface.showAllTables();
    if (tables.includes('access_profiles')) {
      return seedAdministradorGeral(queryInterface);
    }

    // 1. Tabela access_profiles
    await queryInterface.createTable('access_profiles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nome: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      allowed_warehouses: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Lista simples de depositos permitidos para o perfil (null = sem restricao por deposito)',
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // 2. Tabela access_profile_permissions
    await queryInterface.createTable('access_profile_permissions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      access_profile_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'access_profiles',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      module: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Chave do modulo conforme a matriz de BUSINESS_RULES.md §1 (ex.: compras, estoque, producao)',
      },
      level: {
        type: Sequelize.ENUM('operate', 'approve'),
        allowNull: false,
        comment: 'Presenca da linha = modulo visivel (view implicito); approve inclui operate',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addConstraint('access_profile_permissions', {
      fields: ['access_profile_id', 'module'],
      type: 'unique',
      name: 'uq_access_profile_permissions_profile_module',
    });

    await queryInterface.addIndex('access_profile_permissions', ['access_profile_id'], {
      name: 'idx_access_profile_permissions_profile_id',
    });

    // 3. users.access_profile_id (FK nullable — null = sem perfil = bloqueio total)
    const usersColumns = await queryInterface.describeTable('users');
    if (!usersColumns.access_profile_id) {
      await queryInterface.addColumn('users', 'access_profile_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'access_profiles',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    }

    const usersIndexes = await queryInterface.showIndex('users');
    if (!usersIndexes.some((index) => index.name === 'idx_users_access_profile_id')) {
      await queryInterface.addIndex('users', ['access_profile_id'], {
        name: 'idx_users_access_profile_id',
      });
    }

    await seedAdministradorGeral(queryInterface);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('users', 'idx_users_access_profile_id');
    await queryInterface.removeColumn('users', 'access_profile_id');

    await queryInterface.removeIndex('access_profile_permissions', 'idx_access_profile_permissions_profile_id');
    await queryInterface.removeConstraint('access_profile_permissions', 'uq_access_profile_permissions_profile_module');
    await queryInterface.dropTable('access_profile_permissions');

    await queryInterface.dropTable('access_profiles');

    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_access_profile_permissions_level";');
  },
};

// Seed idempotente: perfil "Administrador Geral" com todas as permissoes
// em approve. Nao atribuido a nenhum usuario — o admin global (role='admin')
// ja esta acima do sistema de perfis (§3). Seguro rodar mesmo quando as
// tabelas ja existiam antes desta migration (baseline).
async function seedAdministradorGeral(queryInterface) {
  const modules = [
    'dashboard', 'produtos', 'contagens', 'vendas', 'clientes', 'compras',
    'requisicoes', 'fornecedores', 'producao', 'bom', 'mrp',
    'chao_de_fabrica', 'centros_de_trabalho', 'qualidade', 'laboratorio',
    'engenharia', 'estoque', 'recebimento', 'expedicao', 'patrimonio',
    'rastreabilidade', 'financeiro', 'relatorios.producao',
    'relatorios.compras', 'relatorios.custos', 'relatorios.financeiro',
  ];

  const [existing] = await queryInterface.sequelize.query(
    `SELECT id FROM access_profiles WHERE nome = 'Administrador Geral' LIMIT 1;`
  );

  let profileId;
  if (existing.length > 0) {
    profileId = existing[0].id;
  } else {
    const [inserted] = await queryInterface.sequelize.query(
      `INSERT INTO access_profiles (nome, descricao, active, created_at, updated_at)
       VALUES ('Administrador Geral', 'Perfil de referencia com acesso total a todos os modulos (nao atribuido a usuarios — o admin global ja opera acima do sistema de perfis)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id;`
    );
    profileId = inserted[0].id;
  }

  const values = modules
    .map((mod) => `(${profileId}, '${mod}', 'approve', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .join(',\n       ');

  await queryInterface.sequelize.query(
    `INSERT INTO access_profile_permissions (access_profile_id, module, level, created_at, updated_at)
     VALUES ${values}
     ON CONFLICT (access_profile_id, module) DO NOTHING;`
  );
}
