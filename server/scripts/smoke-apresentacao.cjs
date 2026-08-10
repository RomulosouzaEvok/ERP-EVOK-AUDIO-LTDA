'use strict';

/**
 * Percorre, contra a API REAL no ar, o caminho que será usado na
 * apresentação do ERP: login de cada departamento e leitura das telas que
 * aquele perfil abre.
 *
 * ## Por que este script existe
 *
 * Typecheck e testes unitários não provam que uma tela abre — a suíte
 * unitária usa repositório dublê e não toca o Postgres (ver
 * `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`).
 * Antes de apresentar, o que interessa é: **o usuário entra e a tela carrega,
 * ou dá erro na frente de todo mundo?**
 *
 * Só faz leitura (`GET`) e login. Não cria, não altera e não apaga nada.
 *
 * ## Uso
 *
 * ```bash
 * cd server
 * node scripts/smoke-apresentacao.cjs                       # usa http://localhost:5000
 * API_URL=http://localhost:3000 node scripts/smoke-apresentacao.cjs
 * ```
 *
 * As credenciais vêm de `server/CREDENCIAIS_TESTE.local.txt`, gerado por
 * `scripts/seed-usuarios-departamentos.cjs`. Se o arquivo não existir, rode
 * aquele script antes.
 *
 * @module scripts/smoke-apresentacao
 */

const fs = require('fs');
const path = require('path');

const serverDir = path.resolve(__dirname, '..');
const API_URL = process.env.API_URL || 'http://localhost:5000';
const CREDENTIALS_FILE = path.join(serverDir, 'CREDENCIAIS_TESTE.local.txt');

/**
 * Telas verificadas por departamento: rótulo legível + endpoint que a tela
 * chama ao abrir. Um `403` aqui não é falha do sistema — é o RBAC dizendo
 * que aquele perfil não tem o módulo, e é reportado como tal.
 *
 * @type {Record<string, Array<[string, string]>>}
 */
const ROTAS_POR_DEPARTAMENTO = {
  'diretoria@teste.evokaudio': [
    ['Dashboard', '/api/dashboard'],
    ['Vendas', '/api/sales'],
    ['Compras', '/api/purchases'],
    ['Financeiro — a pagar', '/api/finance/payable'],
    ['Financeiro — a receber', '/api/finance/receivable'],
    ['Importacao (COMEX)', '/api/comex/import-processes'],
    ['Juridico — contratos', '/api/jur/contracts'],
  ],
  'compras@teste.evokaudio': [
    ['Requisicoes de compra', '/api/purchase-requisitions'],
    ['Pedidos de compra', '/api/purchases'],
    ['Fornecedores', '/api/suppliers'],
    ['Cotacoes (RFQ)', '/api/rfqs'],
    ['Importacao (COMEX)', '/api/comex/import-processes'],
  ],
  'vendas@teste.evokaudio': [
    ['Vendas', '/api/sales'],
    ['Clientes', '/api/clients'],
    ['Produtos', '/api/products'],
  ],
  'almoxarifado@teste.evokaudio': [
    ['Estoque — posicao', '/api/inventory/stock-report'],
    ['Movimentacoes', '/api/inventory/movements'],
    ['Contagens', '/api/inventory-counts'],
    ['Produtos', '/api/products'],
  ],
  'pcp@teste.evokaudio': [
    ['Ordens de producao', '/api/production-orders'],
    ['Roteiros de fabricacao', '/api/production/routes'],
    ['Plano Mestre (MPS)', '/api/production/master-plans'],
    ['Centros de trabalho', '/api/work-centers'],
  ],
  'producao@teste.evokaudio': [
    ['Ordens de producao', '/api/production-orders'],
    ['Roteiros de fabricacao', '/api/production/routes'],
  ],
  'qualidade@teste.evokaudio': [
    ['Nao conformidades', '/api/quality/non-conformities'],
    ['Inspecoes de qualidade', '/api/quality/inspections'],
    ['Lotes', '/api/inventory/lots'],
  ],
  'financeiro@teste.evokaudio': [
    ['Contas a pagar', '/api/finance/payable'],
    ['Contas a receber', '/api/finance/receivable'],
    ['Fluxo de caixa', '/api/finance/cashflow/projection'],
    ['Centros de custo', '/api/finance/cost-centers'],
  ],
  'engenharia@teste.evokaudio': [
    ['Produtos', '/api/products'],
    ['Estrutura de produto (BOM)', '/api/engineering/bom'],
  ],
  'manutencao@teste.evokaudio': [
    ['Patrimonio', '/api/assets'],
    ['Ordens de manutencao', '/api/maintenance'],
    ['Ordens de servico', '/api/service-orders'],
  ],
  'rh@teste.evokaudio': [['Funcionarios', '/api/employees']],
  'sst@teste.evokaudio': [
    ['SST — tipos de EPI', '/api/sst/epi-types'],
    ['SST — entregas de EPI', '/api/sst/epi-deliveries'],
  ],
  'ti@teste.evokaudio': [['TI — chamados', '/api/ti/tickets']],
  'marketing@teste.evokaudio': [['Marketing — campanhas', '/api/marketing/campaigns']],
  'juridico@teste.evokaudio': [['Contratos', '/api/jur/contracts']],
  'facilities@teste.evokaudio': [['Facilities — veiculos', '/api/facilities/vehicles']],
  'expedicao@teste.evokaudio': [['Vendas a expedir', '/api/sales']],
};

/**
 * Lê o arquivo de credenciais gerado pelo seed e devolve o mapa e-mail →
 * senha.
 *
 * @returns {Map<string, string>}
 * @throws {Error} Se o arquivo não existir.
 */
function lerCredenciais() {
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    throw new Error(
      `Arquivo de credenciais nao encontrado: ${CREDENTIALS_FILE}\n`
      + 'Rode antes: node scripts/seed-usuarios-departamentos.cjs',
    );
  }
  const texto = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
  const mapa = new Map();
  let emailAtual = null;
  for (const linha of texto.split('\n')) {
    const email = linha.match(/e-mail:\s*(\S+)/);
    if (email) { emailAtual = email[1]; continue; }
    const senha = linha.match(/senha:\s{2}(.+)$/);
    if (senha && emailAtual) { mapa.set(emailAtual, senha[1].trim()); emailAtual = null; }
  }
  return mapa;
}

/**
 * Autentica um usuário e devolve o token JWT.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<string|null>} Token, ou `null` se o login falhar.
 */
async function login(email, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body?.data?.token || body?.token || null;
}

/**
 * Faz um `GET` autenticado e classifica o resultado.
 *
 * @param {string} rota
 * @param {string} token
 * @returns {Promise<{status: number, veredito: string}>}
 */
async function verificar(rota, token) {
  const res = await fetch(`${API_URL}${rota}`, { headers: { Authorization: `Bearer ${token}` } });
  let veredito;
  if (res.status === 200) veredito = 'OK';
  else if (res.status === 403) veredito = 'SEM ACESSO (RBAC)';
  else if (res.status === 404) veredito = 'ROTA NAO EXISTE';
  else if (res.status >= 500) veredito = 'ERRO DO SERVIDOR';
  else veredito = `HTTP ${res.status}`;
  return { status: res.status, veredito };
}

async function main() {
  console.log(`API: ${API_URL}\n`);

  const credenciais = lerCredenciais();
  const problemas = [];
  let totalOk = 0;
  let totalRotas = 0;

  for (const [email, rotas] of Object.entries(ROTAS_POR_DEPARTAMENTO)) {
    const senha = credenciais.get(email);
    if (!senha) {
      console.log(`${email}\n   SEM CREDENCIAL no arquivo — pulando\n`);
      problemas.push(`${email}: credencial ausente`);
      continue;
    }

    const token = await login(email, senha);
    if (!token) {
      console.log(`${email}\n   LOGIN FALHOU\n`);
      problemas.push(`${email}: login falhou`);
      continue;
    }

    console.log(`${email}  (login OK)`);
    for (const [rotulo, rota] of rotas) {
      totalRotas += 1;
      const { status, veredito } = await verificar(rota, token);
      if (veredito === 'OK') totalOk += 1;
      else problemas.push(`${email} > ${rotulo} (${rota}): ${veredito} [${status}]`);
      const marca = veredito === 'OK' ? '  ok  ' : ' FALHA';
      console.log(`  ${marca} ${rotulo.padEnd(30)} ${veredito}`);
    }
    console.log('');
  }

  console.log('='.repeat(70));
  console.log(`Telas verificadas: ${totalRotas} — OK: ${totalOk} — com problema: ${totalRotas - totalOk}`);
  if (problemas.length > 0) {
    console.log('\nPROBLEMAS:');
    problemas.forEach((p) => console.log(`  - ${p}`));
  } else {
    console.log('\nTodas as telas verificadas abriram.');
  }
  console.log('='.repeat(70));
}

main().catch((e) => {
  console.error('FALHA:', e.message);
  process.exit(1);
});
