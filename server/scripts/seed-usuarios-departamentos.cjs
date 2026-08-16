'use strict';

/**
 * Cria um Perfil de Acesso e um usuário de teste para cada departamento real
 * da Evok Áudio, para a rodada de testes que antecede o Go-Live.
 *
 * ## Por que este script existe
 *
 * Até 2026-08-10 o ERP tinha **2 usuários no total**: `admin` (autor de 100%
 * dos documentos — 18 pedidos, 13 requisições, 4 importações) e um Analista
 * de Laboratório sem perfil de compras. Isso tornava impossível testar o
 * sistema como ele será operado, e — depois da segregação de função (D-K,
 * commit `bc13006`) — deixava **nenhuma compra aprovável**, porque quem
 * solicita não pode aprovar e só havia um aprovador.
 *
 * ## Decisões de desenho
 *
 * - **Idempotente.** Rodar duas vezes não duplica nada: perfis e usuários são
 *   localizados por chave natural (nome do perfil / e-mail) e atualizados.
 * - **Senhas fortes e aleatórias**, uma por usuário, geradas com
 *   `crypto.randomBytes`. **Nunca** uma senha padrão compartilhada — usuário
 *   de teste com senha fraca é a porta que fica aberta quando o teste vira
 *   produção.
 * - **Identificáveis para limpeza.** Todos usam o domínio `@teste.evokaudio`,
 *   que não é o domínio real da empresa (`@evokaudio.com.br`). Um único
 *   `DELETE ... WHERE email LIKE '%@teste.evokaudio'` remove todos, e é
 *   exatamente o que `--limpar` faz.
 * - **Compras tem DOIS usuários** (analista e gerente). Sem isso a segregação
 *   de função trava o fluxo: o analista abre a requisição e o pedido, e o
 *   gerente aprova. É o mínimo para exercitar a cadeia de suprimentos ponta a
 *   ponta.
 *
 * ## Uso
 *
 * ```bash
 * cd server
 * node scripts/seed-usuarios-departamentos.cjs           # cria/atualiza
 * node scripts/seed-usuarios-departamentos.cjs --limpar  # remove os de teste
 * ```
 *
 * As credenciais são gravadas em `server/CREDENCIAIS_TESTE.local.txt`
 * (coberto pelo `.gitignore` — arquivo `*.local.txt`) e impressas no
 * terminal. **Elas não são recuperáveis depois**: a senha é gravada no banco
 * apenas como hash bcrypt. Perdeu, roda de novo.
 *
 * ⚠️ **Este script NÃO deve rodar em produção.** Ele recusa quando
 * `NODE_ENV === 'production'` **e, desde `CASE-003` (SanaCore,
 * `sana/ERP-LEGACY-001/CASE-003`, `APR-2026-025`), também recusa quando
 * `DB_NAME` não tem sufixo `_test`/`_ci`** — igual a
 * `run-api-suite.cjs:530-536`, fail-closed, sem escape por flag ou variável de
 * ambiente. A checagem usa `resolveDbName()`, que resolve o mesmo default
 * (`|| 'erp_evok_audio'`) usado por `connect()`: isso é deliberado, porque
 * `server/.env.example` traz `DB_NAME=erp_evok_audio` (o banco REAL,
 * `APR-2026-016`) junto com `NODE_ENV=development` — configuração normal de
 * dev local neste projeto, que não tem banco de dev separado do real — e o
 * *agravante próprio deste script* era que, com `DB_NAME` **ausente** do
 * ambiente, o default apontava para o banco real **sem passar por checagem
 * nenhuma**. Agora o default é resolvido antes da guarda, então também cai
 * na recusa. Residual que motivou a correção registrado em
 * `coretriad/governance/RISK_CLASS-RC-PROC-01_CONTENCAO_POR_DISCIPLINA.md`
 * (`CE-03`).
 *
 * @module scripts/seed-usuarios-departamentos
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const serverDir = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(serverDir, '.env') });

const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');

/** Domínio dedicado aos usuários de teste — permite remoção em massa sem ambiguidade. */
const TEST_DOMAIN = '@teste.evokaudio';

/** Onde as credenciais em texto claro são gravadas (uma única vez, na criação). */
const CREDENTIALS_FILE = path.join(serverDir, 'CREDENCIAIS_TESTE.local.txt');

/**
 * Mapa departamento → perfil de acesso.
 *
 * `modules` usa as chaves de `src/shared/domain/accessModules.ts`. O nível
 * `approve` foi dado apenas onde o departamento realmente decide algo — dar
 * `approve` a todo mundo transformaria o teste numa simulação inútil, já que
 * nenhuma regra de alçada seria exercitada.
 *
 * @type {Array<{dept: string, cargo: string, email: string, perfil: string, role: string, modules: Array<[string, string]>}>}
 */
const SEEDS = [
  {
    dept: 'Diretoria',
    cargo: 'Diretor',
    email: `diretoria${TEST_DOMAIN}`,
    perfil: 'Diretoria',
    role: 'admin',
    modules: [
      ['diretor', 'approve'], ['dashboard', 'approve'], ['financeiro', 'approve'],
      ['vendas', 'approve'], ['compras', 'approve'], ['requisicoes', 'approve'],
      ['comex', 'approve'], ['juridico', 'approve'], ['contabilidade', 'approve'],
      ['tesouraria', 'approve'], ['controladoria', 'approve'],
      ['relatorios.producao', 'operate'], ['relatorios.compras', 'operate'],
      ['relatorios.custos', 'operate'], ['relatorios.financeiro', 'operate'],
    ],
  },
  {
    dept: 'Recursos Humanos',
    cargo: 'Analista de RH',
    email: `rh${TEST_DOMAIN}`,
    perfil: 'Recursos Humanos',
    role: 'operator',
    modules: [['rh', 'approve'], ['dashboard', 'operate']],
  },
  {
    dept: 'Engenharia do Produto',
    cargo: 'Engenheiro de Produto',
    email: `engenharia${TEST_DOMAIN}`,
    perfil: 'Engenharia do Produto',
    role: 'operator',
    modules: [
      ['engenharia', 'approve'], ['bom', 'approve'], ['produtos', 'approve'],
      ['laboratorio', 'operate'], ['dashboard', 'operate'],
    ],
  },
  {
    dept: 'PCP',
    cargo: 'Planejador de Producao',
    email: `pcp${TEST_DOMAIN}`,
    perfil: 'PCP',
    role: 'operator',
    modules: [
      ['mrp', 'approve'], ['producao', 'approve'], ['centros_de_trabalho', 'approve'],
      ['bom', 'operate'], ['estoque', 'operate'], ['requisicoes', 'operate'],
      ['dashboard', 'operate'], ['relatorios.producao', 'operate'],
    ],
  },
  {
    dept: 'Produção',
    cargo: 'Supervisor de Producao',
    email: `producao${TEST_DOMAIN}`,
    perfil: 'Producao',
    role: 'operator',
    modules: [
      ['producao', 'approve'], ['chao_de_fabrica', 'approve'],
      ['centros_de_trabalho', 'operate'], ['bom', 'operate'],
      ['estoque', 'operate'], ['dashboard', 'operate'],
    ],
  },
  {
    dept: 'Almoxarifado',
    cargo: 'Almoxarife',
    email: `almoxarifado${TEST_DOMAIN}`,
    perfil: 'Almoxarifado',
    role: 'operator',
    modules: [
      ['estoque', 'approve'], ['contagens', 'approve'], ['recebimento', 'approve'],
      ['produtos', 'operate'], ['rastreabilidade', 'operate'],
      ['requisicoes', 'operate'], ['dashboard', 'operate'],
    ],
  },
  {
    dept: 'Compras',
    cargo: 'Analista de Compras',
    email: `compras${TEST_DOMAIN}`,
    perfil: 'Compras (analista)',
    role: 'operator',
    // Sem `approve` de proposito: este usuario SOLICITA. Quem aprova e o
    // gerente abaixo — e sem essa separacao a segregacao de funcao (D-K)
    // impediria qualquer compra de andar.
    modules: [
      ['compras', 'operate'], ['requisicoes', 'operate'], ['fornecedores', 'approve'],
      ['comex', 'operate'], ['dashboard', 'operate'], ['relatorios.compras', 'operate'],
    ],
  },
  {
    dept: 'Compras',
    cargo: 'Gerente de Compras',
    email: `compras.gerente${TEST_DOMAIN}`,
    perfil: 'Compras (gerente)',
    role: 'operator',
    modules: [
      ['compras', 'approve'], ['requisicoes', 'approve'], ['fornecedores', 'approve'],
      ['comex', 'approve'], ['dashboard', 'operate'], ['relatorios.compras', 'operate'],
    ],
  },
  {
    dept: 'Vendas',
    cargo: 'Vendedor',
    email: `vendas${TEST_DOMAIN}`,
    perfil: 'Vendas',
    role: 'operator',
    modules: [
      ['vendas', 'approve'], ['clientes', 'approve'], ['produtos', 'operate'],
      ['estoque', 'operate'], ['dashboard', 'operate'],
    ],
  },
  {
    dept: 'Financeiro',
    cargo: 'Analista Financeiro',
    email: `financeiro${TEST_DOMAIN}`,
    perfil: 'Financeiro',
    role: 'financial',
    modules: [
      ['financeiro', 'approve'], ['contabilidade', 'approve'], ['tesouraria', 'approve'],
      ['controladoria', 'approve'], ['clientes', 'operate'], ['fornecedores', 'operate'],
      ['dashboard', 'operate'], ['relatorios.financeiro', 'operate'], ['relatorios.custos', 'operate'],
    ],
  },
  {
    dept: 'Qualidade',
    cargo: 'Inspetor de Qualidade',
    email: `qualidade${TEST_DOMAIN}`,
    perfil: 'Qualidade',
    role: 'operator',
    modules: [
      ['qualidade', 'approve'], ['laboratorio', 'approve'],
      ['rastreabilidade', 'approve'], ['recebimento', 'operate'],
      ['estoque', 'operate'], ['dashboard', 'operate'],
    ],
  },
  {
    dept: 'Expedição',
    cargo: 'Auxiliar de Expedicao',
    email: `expedicao${TEST_DOMAIN}`,
    perfil: 'Expedicao',
    role: 'operator',
    modules: [
      ['expedicao', 'approve'], ['estoque', 'operate'], ['vendas', 'operate'],
      ['rastreabilidade', 'operate'], ['dashboard', 'operate'],
    ],
  },
  {
    dept: 'Manutenção',
    cargo: 'Tecnico de Manutencao',
    email: `manutencao${TEST_DOMAIN}`,
    perfil: 'Manutencao',
    role: 'operator',
    // `garantia` cobre as ordens de servico (`/api/service-orders`), que a
    // Manutencao opera no dia a dia — descoberto pelo smoke de apresentacao,
    // que acusou 403 nessa tela.
    modules: [
      ['manutencao', 'approve'], ['patrimonio', 'approve'], ['garantia', 'operate'],
      ['centros_de_trabalho', 'operate'], ['dashboard', 'operate'],
    ],
  },
  {
    dept: 'TI',
    cargo: 'Analista de TI',
    email: `ti${TEST_DOMAIN}`,
    perfil: 'Tecnologia da Informacao',
    role: 'operator',
    modules: [['ti', 'approve'], ['patrimonio', 'operate'], ['dashboard', 'operate']],
  },
  {
    dept: 'Marketing',
    cargo: 'Analista de Marketing',
    email: `marketing${TEST_DOMAIN}`,
    perfil: 'Marketing',
    role: 'operator',
    modules: [['marketing', 'approve'], ['clientes', 'operate'], ['dashboard', 'operate']],
  },
  {
    dept: 'Segurança do Trabalho',
    cargo: 'Tecnico de Seguranca do Trabalho',
    email: `sst${TEST_DOMAIN}`,
    perfil: 'Seguranca e Saude do Trabalho',
    role: 'operator',
    modules: [['sst', 'approve'], ['dashboard', 'operate']],
  },
  {
    dept: 'Jurídico',
    cargo: 'Advogado',
    email: `juridico${TEST_DOMAIN}`,
    perfil: 'Juridico',
    role: 'operator',
    modules: [['juridico', 'approve'], ['dashboard', 'operate']],
  },
  {
    dept: 'Facilities',
    cargo: 'Coordenador de Facilities',
    email: `facilities${TEST_DOMAIN}`,
    perfil: 'Facilities',
    role: 'operator',
    modules: [
      ['facilities', 'approve'], ['patrimonio', 'operate'],
      ['manutencao', 'operate'], ['dashboard', 'operate'],
    ],
  },
];

/**
 * Gera uma senha forte e legível o suficiente para ser digitada num teste.
 *
 * Usa `crypto.randomBytes` (CSPRNG), não `Math.random`. O alfabeto exclui
 * caracteres ambíguos (`0/O`, `1/l/I`) porque estas senhas serão digitadas a
 * partir de um papel ou de uma tela.
 *
 * @param {number} [length=16] - Comprimento da senha.
 * @returns {string} Senha aleatória.
 */
function generatePassword(length = 16) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/**
 * Resolve o nome do banco efetivo, incluindo o default (`erp_evok_audio`,
 * o banco REAL) que este script usa quando `DB_NAME` não está no ambiente.
 *
 * Existe como função separada — em vez de o default ficar só dentro de
 * `connect()` — para que `assertBancoDescartavel()` avalie o mesmo valor
 * que de fato será usado na conexão, incluindo o default. Se o default
 * fosse resolvido só dentro de `connect()`, a guarda de sufixo checaria
 * `process.env.DB_NAME` (possivelmente `undefined`) e não o valor real de
 * conexão — o próprio agravante que motivou `CASE-003`.
 *
 * @returns {string}
 */
function resolveDbName() {
  return process.env.DB_NAME || 'erp_evok_audio';
}

/**
 * Recusa (fail-closed, sem escape por flag/env) rodar fora de um banco
 * descartável. Mesmo padrão de `run-api-suite.cjs:530-536` — sufixo
 * `_test`/`_ci` obrigatório. Deve receber o valor **resolvido** (com
 * default já aplicado — ver `resolveDbName()`), nunca `process.env.DB_NAME`
 * cru, senão o default escaparia da checagem.
 *
 * Implementado em `CASE-003` (SanaCore, `sana/ERP-LEGACY-001/CASE-003`,
 * `APR-2026-025`) — decisão do dono foi fail-closed **sem** escape; não
 * adicione flag, variável de ambiente ou argumento que contorne esta guarda.
 *
 * @param {string} dbName valor já resolvido (com default aplicado)
 * @returns {void}
 */
function assertBancoDescartavel(dbName) {
  if (!/(_test|_ci)$/i.test(dbName || '')) {
    console.error(
      `RECUSADO: DB_NAME="${dbName}" nao tem sufixo "_test" ou "_ci" — nao parece ser um banco descartavel. ` +
      'seed-usuarios-departamentos.cjs cria e apaga usuarios/perfis de teste (DELETE em massa no modo --limpar) ' +
      'e se recusa a rodar fora de um banco de teste/CI. Configure DB_NAME para um banco com sufixo _test ou _ci ' +
      '(ver server/.env.test) antes de rodar.',
    );
    process.exit(1);
  }
}

/**
 * Abre a conexão com o PostgreSQL a partir do `.env` do servidor.
 *
 * @returns {import('sequelize').Sequelize} Instância conectada.
 */
function connect() {
  return new Sequelize(
    resolveDbName(),
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      dialect: 'postgres',
      logging: false,
    },
  );
}

/**
 * Remove todos os usuários e perfis de teste criados por este script.
 *
 * Só toca em e-mails do domínio de teste — nenhum dado real é alcançável por
 * esta função, mesmo se executada por engano.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {Promise<void>}
 */
async function limpar(sequelize) {
  const perfis = SEEDS.map((s) => s.perfil);
  await sequelize.transaction(async (transaction) => {
    const [users] = await sequelize.query(
      `DELETE FROM users WHERE email LIKE :pattern RETURNING id, email`,
      { replacements: { pattern: `%${TEST_DOMAIN}` }, transaction },
    );
    console.log(`  usuários removidos: ${users.length}`);

    const [perms] = await sequelize.query(
      `DELETE FROM access_profile_permissions
        WHERE access_profile_id IN (SELECT id FROM access_profiles WHERE nome IN (:perfis))
        RETURNING id`,
      { replacements: { perfis }, transaction },
    );
    console.log(`  permissões removidas: ${perms.length}`);

    const [profs] = await sequelize.query(
      `DELETE FROM access_profiles WHERE nome IN (:perfis) RETURNING id, nome`,
      { replacements: { perfis }, transaction },
    );
    console.log(`  perfis removidos: ${profs.length}`);
  });

  if (fs.existsSync(CREDENTIALS_FILE)) {
    fs.unlinkSync(CREDENTIALS_FILE);
    console.log(`  arquivo de credenciais removido`);
  }
}

/**
 * Cria (ou atualiza) perfis, permissões e usuários de teste.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {Promise<Array<{dept: string, cargo: string, email: string, senha: string, perfil: string}>>}
 */
async function semear(sequelize) {
  const criados = [];

  await sequelize.transaction(async (transaction) => {
    for (const seed of SEEDS) {
      // 1. Perfil de acesso (chave natural: nome)
      const [existingProfile] = await sequelize.query(
        `SELECT id FROM access_profiles WHERE nome = :nome LIMIT 1`,
        { replacements: { nome: seed.perfil }, transaction },
      );

      let profileId;
      if (existingProfile.length > 0) {
        profileId = existingProfile[0].id;
        await sequelize.query(
          `UPDATE access_profiles SET descricao = :desc, active = true, updated_at = NOW() WHERE id = :id`,
          { replacements: { desc: `Perfil de teste — ${seed.dept}`, id: profileId }, transaction },
        );
      } else {
        const [inserted] = await sequelize.query(
          `INSERT INTO access_profiles (nome, descricao, active, created_at, updated_at)
           VALUES (:nome, :desc, true, NOW(), NOW()) RETURNING id`,
          { replacements: { nome: seed.perfil, desc: `Perfil de teste — ${seed.dept}` }, transaction },
        );
        profileId = inserted[0].id;
      }

      // 2. Permissões — substituídas por completo, para o script ser a fonte
      //    da verdade do que cada perfil pode fazer.
      await sequelize.query(
        `DELETE FROM access_profile_permissions WHERE access_profile_id = :id`,
        { replacements: { id: profileId }, transaction },
      );
      for (const [modulo, nivel] of seed.modules) {
        await sequelize.query(
          `INSERT INTO access_profile_permissions (access_profile_id, module, level, created_at, updated_at)
           VALUES (:id, :modulo, CAST(:nivel AS enum_access_profile_permissions_level), NOW(), NOW())`,
          { replacements: { id: profileId, modulo, nivel }, transaction },
        );
      }

      // 3. Usuário. A senha é regerada a cada execução — o hash bcrypt no
      //    banco é irreversível, então não há como "reexibir" a anterior.
      const senha = generatePassword();
      const hash = await bcrypt.hash(senha, 10);

      const [existingUser] = await sequelize.query(
        `SELECT id FROM users WHERE email = :email LIMIT 1`,
        { replacements: { email: seed.email }, transaction },
      );

      if (existingUser.length > 0) {
        await sequelize.query(
          `UPDATE users SET name = :name, password = :hash, role = CAST(:role AS enum_users_role),
                  department = :dept, active = true, access_profile_id = :pid,
                  password_version = password_version + 1, updated_at = NOW()
            WHERE id = :id`,
          {
            replacements: {
              name: seed.cargo, hash, role: seed.role, dept: seed.dept,
              pid: profileId, id: existingUser[0].id,
            },
            transaction,
          },
        );
      } else {
        await sequelize.query(
          `INSERT INTO users (name, email, password, role, department, active, access_profile_id, created_at, updated_at)
           VALUES (:name, :email, :hash, CAST(:role AS enum_users_role), :dept, true, :pid, NOW(), NOW())`,
          {
            replacements: {
              name: seed.cargo, email: seed.email, hash,
              role: seed.role, dept: seed.dept, pid: profileId,
            },
            transaction,
          },
        );
      }

      criados.push({ dept: seed.dept, cargo: seed.cargo, email: seed.email, senha, perfil: seed.perfil });
    }
  });

  return criados;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('RECUSADO: este script cria usuários de teste e não deve rodar em produção.');
    process.exit(1);
  }

  assertBancoDescartavel(resolveDbName());

  const limparModo = process.argv.includes('--limpar');
  const sequelize = connect();

  try {
    await sequelize.authenticate();
    console.log(`Banco: ${resolveDbName()} @ ${process.env.DB_HOST || 'localhost'}\n`);

    if (limparModo) {
      console.log('Removendo usuários e perfis de teste...');
      await limpar(sequelize);
      console.log('\nLimpeza concluída.');
      return;
    }

    console.log(`Criando ${SEEDS.length} usuários de teste (1 por departamento + gerente de Compras)...\n`);
    const criados = await semear(sequelize);

    const linhas = [
      '='.repeat(78),
      'CREDENCIAIS DE TESTE — ERP EVOK AUDIO',
      `Gerado em: ${new Date().toISOString()}`,
      '',
      'ATENCAO:',
      '  - Estas senhas NAO sao recuperaveis. O banco guarda apenas o hash.',
      '  - Perdeu? Rode o script de novo (gera senhas novas).',
      '  - Todos usam o dominio @teste.evokaudio, que NAO e o dominio real da',
      '    empresa. Isso e proposital: permite remover todos de uma vez.',
      '  - REMOVA ANTES DE IR PARA PRODUCAO:',
      '      node scripts/seed-usuarios-departamentos.cjs --limpar',
      '='.repeat(78),
      '',
    ];

    for (const c of criados) {
      linhas.push(`${c.dept} — ${c.cargo}`);
      linhas.push(`  e-mail: ${c.email}`);
      linhas.push(`  senha:  ${c.senha}`);
      linhas.push('');
    }

    linhas.push('-'.repeat(78));
    linhas.push('SEGREGACAO DE FUNCAO (D-K): Compras tem DOIS usuarios de proposito.');
    linhas.push('  O analista SOLICITA (requisicao e pedido); o gerente APROVA.');
    linhas.push('  Sem essa separacao nenhuma compra anda — quem solicita nao aprova.');
    linhas.push('-'.repeat(78));

    const texto = linhas.join('\n');
    fs.writeFileSync(CREDENTIALS_FILE, texto, { encoding: 'utf8' });

    console.log(texto);
    console.log(`\nCredenciais gravadas em: ${CREDENTIALS_FILE}`);
    console.log('(arquivo *.local.txt — nao vai para o Git)');
  } finally {
    await sequelize.close();
  }
}

main().catch((err) => {
  console.error('FALHA:', err.message);
  process.exit(1);
});
