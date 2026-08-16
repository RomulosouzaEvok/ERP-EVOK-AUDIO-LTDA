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
 * Contra banco SEM sufixo `_test`/`_ci` (inclusive o banco real da empresa),
 * a confirmação explícita do alvo é obrigatória — ver a seção seguinte:
 *
 * ```bash
 * node scripts/criar-aprovador.cjs --email diretoria@evokaudio.com.br --confirmar-banco-real
 * ```
 *
 * ## ⚠️ Guarda de alvo com confirmação explícita
 *
 * Desde `CASE-003` (2ª extensão — SanaCore, `sana/ERP-LEGACY-001/CASE-003`).
 * Antes deste caso o script **não tinha guarda alguma**: nem sufixo de banco,
 * nem `NODE_ENV` (diferente do que se supunha na triagem — a menção a
 * `NODE_ENV=production` no cabeçalho acima descreve o *outro* script, o seed
 * de teste). Ele escrevia usuário, hash de senha e permissões de perfil em
 * qualquer banco que o `.env` apontasse, e o default de `connect()`, com
 * `DB_NAME` ausente, é o banco REAL da empresa (`APR-2026-016`).
 *
 * Por que `NODE_ENV` sozinho não cobriria o vetor: `server/.env.example`
 * traz `NODE_ENV=development` **junto com** `DB_NAME` apontando para o banco
 * real, porque este projeto não tem banco de desenvolvimento separado. Uma
 * guarda de `NODE_ENV` protegeria o deploy de produção e deixaria passar a
 * estação de trabalho e o agente automatizado com `.env` padrão — que é
 * exatamente o vetor observado. Mesmo raciocínio já registrado em
 * `seed-usuarios-departamentos.cjs` e `apply-pending-migrations.cjs`.
 *
 * Comportamento:
 *
 * - `DB_NAME` com sufixo `_test`/`_ci` (e sem sinal de produção em
 *   `NODE_ENV`/`DB_NAME`/`DB_HOST`) → segue sem atrito;
 * - qualquer outro alvo — inclusive `DB_NAME` ausente/vazio, que cai no
 *   default do banco real → **recusa por padrão**, e só prossegue com
 *   `--confirmar-banco-real` na linha de comando.
 *
 * A guarda **não é fail-closed absoluto**, e isso é deliberado: ela replica
 * o desenho de `apply-pending-migrations.cjs`, não o de
 * `limpar-dados-transacionais.cjs` / `seed-usuarios-departamentos.cjs` (onde
 * a decisão do dono foi recusa sem escape). Criar aprovador no banco real é
 * ato de administração legítimo — é para isso que este script existe, como diz
 * o cabeçalho. O desenho aprovado é *confirmação deliberada obrigatória*, não
 * recusa absoluta. Ver `assertAlvoAutorizado()` abaixo. A leitura das três
 * variáveis replica `run-api-suite.cjs:524-529`. Vetor de origem: resíduo `R2`
 * ("indireção por script") do reteste de `AUD-PROC-CUSTODIA-01` e `CE-03` de
 * `coretriad/governance/RISK_CLASS-RC-PROC-01_CONTENCAO_POR_DISCIPLINA.md`.
 *
 * A senha é gerada com `crypto.randomBytes`, impressa **uma única vez** e
 * gravada em `server/CREDENCIAIS_APROVADOR.local.txt` (coberto pelo
 * `.gitignore` via `*.local.txt`). Não é recuperável depois: no banco existe
 * só o hash bcrypt.
 *
 * Use `--sem-exibir` quando o terminal não for confiável (sessão gravada,
 * pareamento, log de CI): a senha vai **apenas** para o arquivo, e o terminal
 * mostra só o caminho. Uma senha que aparece em transcrição precisa ser
 * trocada de novo — o modo existe para não precisar.
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

/**
 * Flag única e inequívoca de confirmação de alvo não descartável.
 *
 * Mesmo nome usado em `apply-pending-migrations.cjs`, de propósito: quem opera
 * este repositório encontra os três scripts guardados e precisa reconhecer o
 * mesmo padrão — consistência aqui vale mais que elegância. Comparada por
 * igualdade exata: `--confirmar` (a flag de `limpar-dados-transacionais.cjs`,
 * já na memória muscular de quem opera) NÃO satisfaz esta guarda, e é
 * justamente a igualdade exata que impede a colisão entre as duas.
 */
const FLAG_CONFIRMACAO = '--confirmar-banco-real';

/**
 * Resolve o nome do banco **efetivo**, incluindo o default para o banco REAL
 * que este script usa quando `DB_NAME` não está no ambiente.
 *
 * Existe como função separada para que a guarda avalie exatamente o mesmo
 * valor que o `Sequelize` usará na conexão (ver `connect()`) — o agravante que
 * motivou a correção equivalente em `seed-usuarios-departamentos.cjs` era
 * justamente a guarda ver `process.env.DB_NAME` cru (`undefined`) e a conexão
 * ver o default.
 *
 * @param {NodeJS.ProcessEnv} env
 * @returns {string}
 */
function resolveDbName(env) {
  return env.DB_NAME || 'erp_evok_audio';
}

/**
 * Sinais de que o alvo é produção, lidos das mesmas três variáveis que
 * `run-api-suite.cjs:524-529` inspeciona. Aqui eles NÃO causam recusa
 * absoluta (criar aprovador em produção é o uso legítimo do script): eles
 * apenas desqualificam o alvo como "descartável", exigindo confirmação
 * explícita.
 *
 * @param {NodeJS.ProcessEnv} env
 * @param {string} dbName valor já resolvido
 * @returns {string[]} descrição textual de cada sinal encontrado
 */
function sinaisDeProducao(env, dbName) {
  const sinais = [];
  if (env.NODE_ENV === 'production') sinais.push('NODE_ENV=production');
  if (/prod/i.test(dbName)) sinais.push(`DB_NAME="${dbName}" casa /prod/i`);
  if (/prod/i.test(env.DB_HOST || '')) sinais.push(`DB_HOST="${env.DB_HOST}" casa /prod/i`);
  return sinais;
}

/**
 * Classifica o alvo sem efeito colateral (não imprime, não sai, não conecta).
 * Separada de `assertAlvoAutorizado()` para ser exercitável em teste unitário
 * sem banco algum (`APR-2026-016`).
 *
 * @param {NodeJS.ProcessEnv} env
 * @param {string[]} argv argumentos de linha de comando (sem node/script)
 * @returns {{dbName: string, dbHost: string, sinais: string[], descartavel: boolean, confirmado: boolean, autorizado: boolean}}
 */
function avaliarAlvo(env, argv) {
  const dbName = resolveDbName(env);
  const sinais = sinaisDeProducao(env, dbName);
  const descartavel = /(_test|_ci)$/i.test(dbName) && sinais.length === 0;
  const confirmado = argv.includes(FLAG_CONFIRMACAO);
  return {
    dbName,
    dbHost: env.DB_HOST || 'localhost',
    sinais,
    descartavel,
    confirmado,
    autorizado: descartavel || confirmado,
  };
}

/**
 * Recusa escrever usuário/perfil em alvo não descartável sem confirmação
 * explícita.
 *
 * Este script **escreve** (`INSERT`/`UPDATE` em `users`, `access_profiles` e
 * `access_profile_permissions`, incluindo `DELETE` das permissões do perfil)
 * — operação legítima em produção, e é para isso que ele existe. Por isso a
 * guarda não é recusa absoluta: banco com sufixo `_test`/`_ci` passa sem
 * atrito; qualquer outro alvo exige `--confirmar-banco-real`, que é
 * deliberado, visível no histórico do shell e impossível de digitar por
 * acidente.
 *
 * Roda como primeira instrução de `main()`, portanto antes de `connect()` e
 * antes de qualquer conexão.
 *
 * @param {NodeJS.ProcessEnv} env
 * @param {string[]} argv
 * @returns {{dbName: string, dbHost: string, sinais: string[], descartavel: boolean, confirmado: boolean, autorizado: boolean}}
 */
function assertAlvoAutorizado(env, argv) {
  const alvo = avaliarAlvo(env, argv);
  if (alvo.descartavel) return alvo;

  if (!alvo.confirmado) {
    console.error(
      `RECUSADO: este script escreve usuario, senha e permissoes de perfil, e o banco alvo lido e "${alvo.dbName}" @ "${alvo.dbHost}", `
      + 'que nao tem sufixo "_test" nem "_ci"'
      + (alvo.sinais.length ? ` (sinais de producao: ${alvo.sinais.join('; ')})` : '') + '.\n'
      + 'Se o alvo esta ERRADO: corrija DB_NAME/DB_HOST em server/.env (ou aponte para um banco _test/_ci) e rode de novo.\n'
      + `Se o alvo esta CERTO e voce quer mesmo criar/alterar um aprovador nele, repita o comando com ${FLAG_CONFIRMACAO}:\n`
      + `  node scripts/criar-aprovador.cjs --email <e-mail> ${FLAG_CONFIRMACAO}\n`
      + 'Guarda de CASE-003 (RC-PROC-01, CE-03).',
    );
    process.exit(1);
  }

  console.warn(
    `ATENCAO: criando/alterando aprovador em "${alvo.dbName}" @ "${alvo.dbHost}", que NAO e um banco descartavel`
    + (alvo.sinais.length ? ` (sinais de producao: ${alvo.sinais.join('; ')})` : '')
    + `. Confirmado explicitamente via ${FLAG_CONFIRMACAO}.`,
  );
  return alvo;
}

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
 * Nota de `CASE-003` (2ª extensão): este script **não consome argumento
 * posicional** — tudo é lido por `indexOf('--nome')` aqui ou por
 * `argv.includes` em `flag()`. Por isso `--confirmar-banco-real` pôde ser
 * introduzida sem o risco encontrado em `apply-pending-migrations.cjs`, onde
 * `process.argv[2]` era usado cru como filtro regex e a flag nova o teria
 * quebrado em silêncio.
 *
 * Continua valendo, e é **anterior** a esta guarda, que um valor omitido faz
 * a flag seguinte virar o valor: `--nome --confirmar-banco-real` grava o nome
 * literal "--confirmar-banco-real" — exatamente como `--nome --admin` já
 * fazia. Não é regressão introduzida pela guarda; está registrado como
 * observação do caso.
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
  // Default 'erp_evok_audio' é o banco REAL de producao (APR-2026-016) —
  // deliberado: este script existe para criar contas operacionais de
  // verdade (ver cabecalho), diferente de seed-usuarios-departamentos.cjs.
  // Desde CASE-003 (2a extensao) o default vem de resolveDbName(), a MESMA
  // funcao que assertAlvoAutorizado() avalia: guarda e conexao nao podem
  // divergir sobre qual banco esta sendo tocado.
  return new Sequelize(
    resolveDbName(process.env),
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
  // PRIMEIRA instrução: o alvo é decidido antes de qualquer validação de
  // argumento e muito antes de connect(). Se o banco estiver errado, o
  // operador precisa saber disso antes de descobrir que digitou o e-mail
  // errado — e o script não pode abrir conexão para descobrir.
  assertAlvoAutorizado(process.env, process.argv.slice(2));

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
      if (flag('sem-exibir')) {
        console.log('  senha ................. gerada e gravada SEM exibir no terminal');
        console.log(`  leia em ${path.relative(process.cwd(), ARQUIVO_CREDENCIAL)} (fora do Git) e troque no primeiro acesso`);
      } else {
        console.log(`  senha ................. ${senhaGerada}`);
        console.log(`  (gravada em ${path.relative(process.cwd(), ARQUIVO_CREDENCIAL)}, fora do Git — troque no primeiro acesso)`);
      }
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
