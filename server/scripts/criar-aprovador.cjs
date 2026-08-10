'use strict';

/**
 * Cria um **aprovador REAL** de compras, no domínio corporativo da empresa.
 *
 * ## Por que existe, separado do seed de teste
 *
 * A segregação de função (**D-K**, `shared/domain/segregationOfDuties.ts`) é
 * sobre **identidade**, não privilégio: nenhum nível de permissão transforma
 * uma pessoa em duas, e nem `role = 'admin'` isenta. Com um único aprovador,
 * toda compra que ele mesmo solicitou fica inaprovável — que era exatamente o
 * estado do ERP até 2026-08-10.
 *
 * `scripts/seed-usuarios-departamentos.cjs` desfez esse impasse **para
 * teste**: criou 20 usuários no domínio `@teste.evokaudio`, entre eles um
 * Diretor e um Gerente de Compras. Mas aquele script:
 *
 *   - **recusa rodar com `NODE_ENV=production`** (por desenho — ele existe
 *     para exercitar o sistema, não para operá-lo);
 *   - usa um domínio que não é o da empresa;
 *   - **regenera a senha a cada execução**, o que é correto para teste e
 *     inaceitável para uma conta operacional.
 *
 * Este script é a contrapartida de produção: cria **uma** conta real, com
 * e-mail corporativo, e não mexe na senha de quem já existe a menos que
 * mandem explicitamente (`--rotacionar-senha`).
 *
 * ## ⚠️ Por que NÃO reaproveitar o perfil "Diretoria" já existente
 *
 * O perfil `Diretoria` no banco foi criado pelo seed de teste, e
 * `seed-usuarios-departamentos.cjs --limpar` **apaga perfis por NOME**, sem
 * olhar quem está vinculado. Como `users.access_profile_id` é
 * `ON DELETE SET NULL`, um aprovador real pendurado naquele perfil perderia
 * **todas** as permissões em silêncio no dia em que alguém limpasse os dados
 * de teste — e o sintoma (compra que não aprova mais) apareceria longe da
 * causa. Por isso este script cria/usa um perfil próprio, fora da lista do
 * seed de teste.
 *
 * ## Papel: `operator` + perfil, não `admin`
 *
 * `role = 'admin'` faz `authorizeModule` liberar tudo antes de qualquer
 * checagem (`middlewares/auth.ts`), o que tornaria o perfil decorativo. Um
 * diretor real precisa da alçada (`diretor`), não de acesso irrestrito ao
 * ERP inteiro. `resolveAvailableApproverRoles` concede o papel `diretor` a
 * quem tem o módulo `diretor` no perfil — então `operator` + perfil entrega
 * exatamente a alçada, e nada além dela. Use `--admin` só se for mesmo essa
 * a intenção.
 *
 * ## Uso
 *
 * ```bash
 * cd server
 * node scripts/criar-aprovador.cjs --email diretoria@evokaudio.com.br --nome "Fulano de Tal"
 * node scripts/criar-aprovador.cjs --email compras@evokaudio.com.br --nome "Beltrana" --perfil compras
 * node scripts/criar-aprovador.cjs --email diretoria@evokaudio.com.br --rotacionar-senha
 * ```
 *
 * A senha é gerada com `crypto.randomBytes`, impressa **uma única vez** e
 * gravada em `server/CREDENCIAIS_APROVADOR.local.txt` (coberto pelo
 * `.gitignore` via `*.local.txt`). Não é recuperável depois: no banco existe
 * só o hash bcrypt.
 *
 * @module scripts/criar-aprovador
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const serverDir = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(serverDir, '.env') });

const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');

/** Domínio reservado ao seed de teste — proibido aqui. */
const DOMINIO_DE_TESTE = '@teste.evokaudio';

/** Onde a credencial gerada é registrada (fora do Git). */
const ARQUIVO_CREDENCIAL = path.join(serverDir, 'CREDENCIAIS_APROVADOR.local.txt');

/**
 * Perfis de aprovação oferecidos, com o conjunto de módulos de cada um.
 *
 * `diretoria` espelha os módulos do perfil de mesmo papel usado nos testes,
 * **incluindo `diretor`** — que é o que `resolveAvailableApproverRoles` lê
 * para conceder a alçada da diretoria (G11: compra nacional acima de
 * R$ 500 mil e **toda** importação).
 *
 * `compras` é o gerente do dia a dia: aprova requisição, pedido e COMEX, mas
 * **não** tem `diretor` — de propósito, senão a alçada deixaria de existir.
 */
const PERFIS = {
  diretoria: {
    nome: 'Diretoria Executiva',
    descricao: 'Perfil de PRODUCAO — alcada de diretoria (G11/D-G) e aprovacao da cadeia de compras.',
    modulos: [
      ['diretor', 'approve'],
      ['compras', 'approve'],
      ['requisicoes', 'approve'],
      ['comex', 'approve'],
      ['fornecedores', 'approve'],
      ['financeiro', 'approve'],
      ['tesouraria', 'approve'],
      ['contabilidade', 'approve'],
      ['controladoria', 'approve'],
      ['juridico', 'approve'],
      ['vendas', 'approve'],
      ['dashboard', 'approve'],
      ['relatorios.compras', 'operate'],
      ['relatorios.custos', 'operate'],
      ['relatorios.financeiro', 'operate'],
      ['relatorios.producao', 'operate'],
    ],
  },
  compras: {
    nome: 'Compras — Gerencia (producao)',
    descricao: 'Perfil de PRODUCAO — aprova requisicao, pedido e COMEX no dia a dia. SEM alcada de diretoria.',
    modulos: [
      ['compras', 'approve'],
      ['requisicoes', 'approve'],
      ['comex', 'approve'],
      ['fornecedores', 'approve'],
      ['dashboard', 'operate'],
      ['relatorios.compras', 'operate'],
    ],
  },
};

/**
 * Lê um argumento nomeado da linha de comando.
 *
 * @param {string} nome - Nome do argumento (sem `--`).
 * @returns {string | undefined} Valor informado.
 */
function arg(nome) {
  const index = process.argv.indexOf(`--${nome}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

/**
 * `true` quando a flag booleana foi passada.
 *
 * @param {string} nome - Nome da flag (sem `--`).
 * @returns {boolean}
 */
function flag(nome) {
  return process.argv.includes(`--${nome}`);
}

/**
 * Gera uma senha forte, sem caracteres ambíguos (serão digitados à mão).
 *
 * @param {number} [length=18] - Comprimento.
 * @returns {string} Senha aleatória.
 */
function gerarSenha(length = 18) {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (byte) => alfabeto[byte % alfabeto.length]).join('');
}

/**
 * Abre a conexão com o banco configurado em `.env`.
 *
 * @returns {import('sequelize').Sequelize}
 */
function connect() {
  return new Sequelize(
    process.env.DB_NAME || 'erp_evok_audio',
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
 * Garante o perfil de acesso e suas permissões.
 *
 * As permissões são substituídas por completo para que este script seja a
 * fonte da verdade do que o perfil pode fazer — perfil de aprovação que
 * acumula permissão de origem desconhecida é achado de auditoria.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @param {{nome: string, descricao: string, modulos: string[][]}} perfil
 * @param {import('sequelize').Transaction} transaction
 * @returns {Promise<number>} Id do perfil.
 */
async function garantirPerfil(sequelize, perfil, transaction) {
  const [existente] = await sequelize.query(
    'SELECT id FROM access_profiles WHERE nome = :nome LIMIT 1',
    { replacements: { nome: perfil.nome }, transaction },
  );

  let profileId;
  if (existente.length > 0) {
    profileId = existente[0].id;
    await sequelize.query(
      'UPDATE access_profiles SET descricao = :desc, active = true, updated_at = NOW() WHERE id = :id',
      { replacements: { desc: perfil.descricao, id: profileId }, transaction },
    );
  } else {
    const [inserido] = await sequelize.query(
      `INSERT INTO access_profiles (nome, descricao, active, created_at, updated_at)
       VALUES (:nome, :desc, true, NOW(), NOW()) RETURNING id`,
      { replacements: { nome: perfil.nome, desc: perfil.descricao }, transaction },
    );
    profileId = inserido[0].id;
  }

  await sequelize.query(
    'DELETE FROM access_profile_permissions WHERE access_profile_id = :id',
    { replacements: { id: profileId }, transaction },
  );
  for (const [modulo, nivel] of perfil.modulos) {
    await sequelize.query(
      `INSERT INTO access_profile_permissions (access_profile_id, module, level, created_at, updated_at)
       VALUES (:id, :modulo, CAST(:nivel AS enum_access_profile_permissions_level), NOW(), NOW())`,
      { replacements: { id: profileId, modulo, nivel }, transaction },
    );
  }

  return profileId;
}

async function main() {
  const email = (arg('email') || '').trim();
  const nome = (arg('nome') || '').trim();
  const chavePerfil = (arg('perfil') || 'diretoria').trim().toLowerCase();
  const departamento = (arg('departamento') || (chavePerfil === 'compras' ? 'Compras' : 'Diretoria')).trim();
  const rotacionar = flag('rotacionar-senha');
  const comoAdmin = flag('admin');

  if (!email || !email.includes('@')) {
    console.error('Informe --email <e-mail corporativo>. Ex.: --email diretoria@evokaudio.com.br');
    process.exit(1);
  }
  if (email.toLowerCase().endsWith(DOMINIO_DE_TESTE)) {
    console.error(
      `RECUSADO: "${DOMINIO_DE_TESTE}" e o dominio dos usuarios de TESTE, que sao apagados por `
      + '`seed-usuarios-departamentos.cjs --limpar`. Um aprovador real precisa do dominio da empresa.',
    );
    process.exit(1);
  }
  const perfil = PERFIS[chavePerfil];
  if (!perfil) {
    console.error(`Perfil desconhecido "${chavePerfil}". Use um de: ${Object.keys(PERFIS).join(', ')}.`);
    process.exit(1);
  }

  const sequelize = connect();
  await sequelize.authenticate();

  let senhaGerada = null;
  let acao = '';
  let userId = null;

  try {
    await sequelize.transaction(async (transaction) => {
      const profileId = await garantirPerfil(sequelize, perfil, transaction);

      const [existente] = await sequelize.query(
        'SELECT id, name FROM users WHERE lower(email) = lower(:email) LIMIT 1',
        { replacements: { email }, transaction },
      );

      const role = comoAdmin ? 'admin' : 'operator';

      if (existente.length > 0) {
        userId = existente[0].id;
        acao = 'atualizado';
        // Senha só é tocada sob pedido explícito: rotacionar em silêncio
        // derrubaria a sessão de alguém que já usa a conta.
        if (rotacionar) {
          senhaGerada = gerarSenha();
          const hash = await bcrypt.hash(senhaGerada, 10);
          await sequelize.query(
            `UPDATE users SET name = COALESCE(NULLIF(:name, ''), name), password = :hash,
                    role = CAST(:role AS enum_users_role), department = :dept, active = true,
                    access_profile_id = :pid, password_version = password_version + 1, updated_at = NOW()
              WHERE id = :id`,
            { replacements: { name: nome, hash, role, dept: departamento, pid: profileId, id: userId }, transaction },
          );
        } else {
          await sequelize.query(
            `UPDATE users SET name = COALESCE(NULLIF(:name, ''), name),
                    role = CAST(:role AS enum_users_role), department = :dept, active = true,
                    access_profile_id = :pid, updated_at = NOW()
              WHERE id = :id`,
            { replacements: { name: nome, role, dept: departamento, pid: profileId, id: userId }, transaction },
          );
        }
      } else {
        acao = 'criado';
        senhaGerada = gerarSenha();
        const hash = await bcrypt.hash(senhaGerada, 10);
        const [inserido] = await sequelize.query(
          `INSERT INTO users (name, email, password, role, department, active, access_profile_id, created_at, updated_at)
           VALUES (:name, :email, :hash, CAST(:role AS enum_users_role), :dept, true, :pid, NOW(), NOW())
           RETURNING id`,
          {
            replacements: { name: nome || email.split('@')[0], email, hash, role, dept: departamento, pid: profileId },
            transaction,
          },
        );
        userId = inserido[0].id;
      }
    });

    // Conferência pós-escrita: o que importa não é o INSERT ter retornado id,
    // é o usuário sair daqui com a alçada que se pretendeu dar.
    const [conferencia] = await sequelize.query(
      `SELECT u.id, u.name, u.email, u.role, u.active, p.nome AS perfil,
              bool_or(pp.module = 'diretor') AS tem_alcada_diretoria,
              bool_or(pp.module = 'compras' AND pp.level = 'approve') AS aprova_compra
         FROM users u
         LEFT JOIN access_profiles p ON p.id = u.access_profile_id
         LEFT JOIN access_profile_permissions pp ON pp.access_profile_id = p.id
        WHERE u.id = :id
        GROUP BY u.id, u.name, u.email, u.role, u.active, p.nome`,
      { replacements: { id: userId } },
    );
    const linha = conferencia[0];

    const [autoria] = await sequelize.query(
      `SELECT count(*) FILTER (WHERE requester_id = :id) AS pedidos_proprios,
              count(*) AS pedidos_totais
         FROM purchase_orders`,
      { replacements: { id: userId } },
    );

    console.log('');
    console.log(`Aprovador ${acao}: #${linha.id} ${linha.name} <${linha.email}>`);
    console.log(`  papel ................. ${linha.role}`);
    console.log(`  perfil ................ ${linha.perfil}`);
    console.log(`  alcada de diretoria ... ${linha.tem_alcada_diretoria ? 'SIM (modulo `diretor`)' : 'nao'}`);
    console.log(`  aprova compra ......... ${linha.aprova_compra ? 'SIM' : 'nao'}`);
    console.log(`  pedidos que ele mesmo solicitou (inaprovaveis por D-K): ${autoria[0].pedidos_proprios} de ${autoria[0].pedidos_totais}`);

    if (senhaGerada) {
      const conteudo = [
        'CREDENCIAL DE APROVADOR — ARQUIVO LOCAL, FORA DO GIT',
        `gerado em: ${new Date().toISOString()}`,
        '',
        `e-mail: ${linha.email}`,
        `senha.: ${senhaGerada}`,
        `perfil: ${linha.perfil}`,
        '',
        'Troque esta senha no primeiro acesso. Ela existe no banco apenas como',
        'hash bcrypt — perdeu, rode o script de novo com --rotacionar-senha.',
        '',
      ].join('\n');
      fs.writeFileSync(ARQUIVO_CREDENCIAL, conteudo, 'utf8');
      console.log('');
      console.log(`  senha ................. ${senhaGerada}`);
      console.log(`  (gravada em ${path.relative(process.cwd(), ARQUIVO_CREDENCIAL)}, fora do Git — troque no primeiro acesso)`);
    } else {
      console.log('');
      console.log('  senha ................. inalterada (use --rotacionar-senha para gerar uma nova)');
    }
    console.log('');
  } finally {
    await sequelize.close();
  }
}

main().catch((erro) => {
  console.error('FALHA:', erro.message);
  process.exit(1);
});
