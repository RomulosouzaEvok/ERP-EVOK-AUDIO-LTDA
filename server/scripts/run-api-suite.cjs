const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

const serverDir = path.resolve(__dirname, '..');
// .env.test (banco isolado, ver server/.env.test) tem prioridade sobre
// .env — carregado primeiro porque dotenv.config() NAO sobrescreve
// variaveis ja presentes no processo; se .env.test nao existir, cai no
// .env normal (comportamento antigo preservado para quem ainda nao criou
// o arquivo, mas o guard em main() bloqueia rodar sem DB_NAME de teste).
require('dotenv').config({ path: path.join(serverDir, '.env.test') });
require('dotenv').config({ path: path.join(serverDir, '.env') });
const jestBin = path.join(serverDir, 'node_modules', 'jest', 'bin', 'jest.js');

const productFixtureDefaults = {
  location: 'CI',
  ncm: '85182100',
  cest: '0000000',
  weight: 0,
  lead_time: 0,
  drawing_number: 'CI',
  revision: '00',
  ts_params_fs: 0,
  ts_params_qms: 0,
  ts_params_qes: 0,
  ts_params_qts: 0,
  ts_params_vas: 0,
  ts_params_sd: 0,
  ts_params_xmax: 0,
  ts_params_re: 0,
  ts_params_le: 0,
  ts_params_bl: 0,
  ts_params_mms: 0,
  ts_params_cms: 0,
  ts_params_spl: 0,
};

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function spawnLogged(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const isWindowsCommand = process.platform === 'win32' && /\.(cmd|bat)$/i.test(command);
    const child = isWindowsCommand
      ? spawn('cmd.exe', ['/d', '/s', '/c', `${command} ${args.join(' ')}`], {
          cwd: serverDir,
          stdio: 'inherit',
          ...options,
        })
      : spawn(command, args, {
          cwd: serverDir,
          stdio: 'inherit',
          shell: false,
          ...options,
        });

    child.on('error', reject);

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} falhou com codigo ${code}`));
    });
  });
}

function waitForReady(url, timeoutMs) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode === 200) {
          resolve();
          return;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Readiness nao alcancada: status ${response.statusCode}`));
          return;
        }

        setTimeout(attempt, 1000);
      });

      request.on('error', () => {
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error('Readiness nao alcancada dentro do timeout.'));
          return;
        }

        setTimeout(attempt, 1000);
      });
    };

    attempt();
  });
}

async function ensureFixtures() {
  const models = require(path.join(serverDir, 'dist', 'src', 'models', 'index.js'));
  const {
    sequelize, User, Supplier, Product, BillOfMaterial, CompanyFiscalConfig,
    Warehouse, ProductWarehouseStock, Item, ProductionCostSettings, LotControl,
    WorkCenter, ProductionRoute, ProductionRouteStep,
  } = models;

  try {
    await sequelize.authenticate();

    // NUNCA usar o usuario admin real (admin@evokaudio.com.br) aqui: esta
    // suite escreve senha/role via `.update()` direto no model, fora de
    // qualquer use case auditado (nao gera audit_log), e roda contra
    // qualquer banco que `DB_NAME` apontar no momento — inclusive o banco
    // de desenvolvimento do dia a dia se ninguem isolar `.env.test`. Um
    // incidente real (2026-08-05): isso sobrescreveu a senha do admin de
    // producao/dev local, derrubando o acesso do dono do produto sem
    // nenhum log explicando o motivo. Usuario sintetico `@evok.local`
    // (mesma convencao ja usada em outros ~11 arquivos de teste do
    // projeto) elimina o vetor por completo — nao ha usuario real para
    // colidir, entao a senha pode ser fixa e conhecida sem risco.
    const [admin] = await User.findOrCreate({
      where: { email: 'ci-admin@evok.local' },
      defaults: {
        name: 'CI Admin (run-api-suite)',
        password: process.env.ADMIN_SEED_PASSWORD || 'ci-admin-seed-password-2026',
        active: true,
        role: 'admin',
      },
    });
    await admin.update({
      password: process.env.ADMIN_SEED_PASSWORD || 'ci-admin-seed-password-2026',
      active: true,
      role: 'admin',
    });

    // SEGUNDO administrador — existe por causa da segregacao de funcao
    // (D-K, `src/shared/domain/segregationOfDuties.ts`, 2026-08-10): quem
    // solicita uma compra nao pode aprova-la, e a regra e sobre IDENTIDADE,
    // entao `role: 'admin'` nao isenta. Com um unico usuario na suite, toda
    // requisicao/pedido/importacao criada pelos testes ficava inaprovavel
    // (422 D-K-*), o que derrubava a cadeia inteira a partir da aprovacao.
    // `role: 'admin'` tambem lhe da a alcada de diretoria do G11/G11-COMEX
    // (`resolveAvailableApproverRoles` trata admin como `diretor`), entao um
    // unico usuario extra cobre os 4 pontos de aprovacao do ERP.
    // Mesmo dominio sintetico `@evok.local` do admin de CI acima, pelas
    // mesmas razoes de seguranca documentadas la.
    const [approver] = await User.findOrCreate({
      where: { email: 'ci-approver@evok.local' },
      defaults: {
        name: 'CI Aprovador (run-api-suite)',
        password: process.env.ADMIN_SEED_PASSWORD || 'ci-admin-seed-password-2026',
        active: true,
        role: 'admin',
      },
    });
    await approver.update({
      password: process.env.ADMIN_SEED_PASSWORD || 'ci-admin-seed-password-2026',
      active: true,
      role: 'admin',
    });

    const [supplier] = await Supplier.findOrCreate({
      where: { cnpj: '11222333000181' },
      defaults: {
        company_name: 'Fornecedor CI EVOK',
        trade_name: 'Fornecedor CI EVOK',
        cnpj: '11222333000181',
        ie: 'ISENTO',
        phone: '(00) 0000-0000',
        status: 'active',
        email: 'fornecedor-ci@evok.local',
        cep: '00000-000',
        street: 'Rua CI',
        number: '1',
        complement: 'N/A',
        neighborhood: 'Centro',
        city: 'Homologacao',
        state: 'SP',
        contact_name: 'Contato CI',
        contact_phone: '(00) 0000-0000',
        payment_terms: 'A vista',
        notes: 'Fixture automatizada de testes API',
      },
    });

    const [purchaseProduct] = await Product.findOrCreate({
      where: { code: 'CI-PRODUCT-001' },
      defaults: {
        name: 'Produto CI Compras',
        code: 'CI-PRODUCT-001',
        description: 'Fixture automatizada de compras',
        quantity: 25,
        price: 20,
        cost_price: 10,
        status: 'active',
        product_type: 'component',
        unit: 'un',
        ...productFixtureDefaults,
      },
    });

    // Dual-write por deposito (Bloco 4, docs/governance/TODO.md; §12 da
    // BUSINESS_RULES.md): `CreateSaleUseCase`/`ChangeSaleStatusUseCase`
    // debitam o saldo do produto ESPECIFICAMENTE no deposito ACABADOS, nao
    // mais so `products.quantity` global. Este fixture so ajustava
    // `products.quantity` (acima), entao qualquer teste que criasse/
    // confirmasse uma venda com este produto recebia 422 ("saldo
    // insuficiente ... no deposito ACABADOS"). Ajustado direto via
    // Sequelize (mesmo padrao ja usado neste arquivo para os demais
    // fixtures) para nao depender do endpoint HTTP `POST /api/inventory/
    // movements` como fixture. Sempre reforca um saldo generoso (nao so na
    // primeira execucao) para sobreviver a rodadas repetidas de CI no
    // mesmo banco.
    const acabadosWarehouse = await Warehouse.findOne({ where: { code: 'ACABADOS', active: true } });
    if (!acabadosWarehouse) {
      throw new Error('Deposito ACABADOS nao encontrado/ativo - rode as migrations do Bloco 4 antes dos testes.');
    }
    const [acabadosStock] = await ProductWarehouseStock.findOrCreate({
      where: { product_id: purchaseProduct.id, warehouse_id: acabadosWarehouse.id },
      defaults: { product_id: purchaseProduct.id, warehouse_id: acabadosWarehouse.id, quantity: 0 },
    });
    const ACABADOS_FIXTURE_QUANTITY = 100000;
    if (Number(acabadosStock.quantity) < ACABADOS_FIXTURE_QUANTITY) {
      const topUp = ACABADOS_FIXTURE_QUANTITY - Number(acabadosStock.quantity);
      await acabadosStock.increment('quantity', { by: topUp });
      await purchaseProduct.increment('quantity', { by: topUp });
    }

    // Lote LIBERADO do produto de fixture — exigido pelo gate de qualidade na
    // saida (decisao D-L, 2026-08-10): a partir dela, faturar um produto que
    // TEM lote so e permitido enquanto houver saldo em lote `available`; se o
    // saldo liberado nao cobrir a emissao e existir lote retido
    // (`quarantine`/`blocked`), o faturamento e recusado com 422 `D-L`.
    //
    // O CI-PRODUCT-001 acumula lotes em QUARENTENA a cada rodada (os testes de
    // recebimento de compra criam um lote novo por recebimento, e lote de
    // compra nasce em quarentena desde o G7). Sem este lote liberado
    // generoso, a suite passaria hoje e comecaria a falhar sozinha na rodada
    // em que o saldo liberado acabasse — exatamente o tipo de fixture que
    // esconde regressao. Mesmo padrao de reforco do saldo ACABADOS acima.
    const CI_RELEASED_LOT_QUANTITY = 100000;
    const [ciReleasedLot] = await LotControl.findOrCreate({
      where: { product_id: purchaseProduct.id, lot_number: 'CI-LOTE-LIBERADO-001' },
      defaults: {
        product_id: purchaseProduct.id,
        lot_number: 'CI-LOTE-LIBERADO-001',
        status: 'available',
        quantity_initial: CI_RELEASED_LOT_QUANTITY,
        quantity_available: CI_RELEASED_LOT_QUANTITY,
        created_by: admin.id,
        notes: 'Fixture automatizada: lote liberado para o gate de qualidade na saida (D-L)',
      },
    });
    if (Number(ciReleasedLot.quantity_available) < CI_RELEASED_LOT_QUANTITY) {
      await ciReleasedLot.update({
        status: 'available',
        quantity_initial: CI_RELEASED_LOT_QUANTITY,
        quantity_available: CI_RELEASED_LOT_QUANTITY,
      });
    }

    const [lowStockProduct] = await Product.findOrCreate({
      where: { code: 'CI-LOW-STOCK-001' },
      defaults: {
        name: 'Produto CI Estoque Baixo',
        code: 'CI-LOW-STOCK-001',
        description: 'Fixture automatizada de concorrencia',
        quantity: 1,
        price: 5,
        cost_price: 2,
        status: 'active',
        product_type: 'component',
        unit: 'un',
        ...productFixtureDefaults,
      },
    });
    await lowStockProduct.update({ quantity: 1, reserved_quantity: 0, status: 'active' });

    const [bomFinishedProduct] = await Product.findOrCreate({
      where: { code: 'CI-BOM-FINISHED-001' },
      defaults: {
        name: 'Produto CI BOM Pai',
        code: 'CI-BOM-FINISHED-001',
        description: 'Fixture automatizada BOM pai',
        quantity: 0,
        price: 100,
        cost_price: 50,
        status: 'active',
        product_type: 'finished',
        unit: 'un',
        ...productFixtureDefaults,
      },
    });

    await BillOfMaterial.update(
      { status: 'superseded' },
      {
        where: {
          product_id: bomFinishedProduct.id,
          status: { [Op.ne]: 'superseded' },
        },
      },
    );

    const [bom] = await BillOfMaterial.findOrCreate({
      where: {
        product_id: bomFinishedProduct.id,
        revision: 'CI',
      },
      defaults: {
        product_id: bomFinishedProduct.id,
        revision: 'CI',
        revision_date: new Date().toISOString().slice(0, 10),
        revision_notes: 'Fixture automatizada de testes API',
        status: 'active',
        created_by: admin.id,
        approved_by: admin.id,
        approval_date: new Date().toISOString().slice(0, 10),
        notes: 'Fixture automatizada de testes API',
        total_components: 1,
        total_cost: 3,
        manufacturing_time_minutes: 1,
      },
    });
    await bom.update({
      status: 'active',
      approved_by: admin.id,
      approval_date: new Date().toISOString().slice(0, 10),
    });

    // Roteiro de fabricacao do produto de BOM — fixture do gap G6, endurecido
    // em 2026-08-11.
    //
    // O gate de partida passou a exigir LASTRO DE ROTEIRO: alguma linha de
    // apontamento ligada a uma etapa, ou roteiro ativo cadastrado para o
    // produto. Antes bastava existir qualquer linha, e uma linha manual
    // (`production_route_step_id: null`) destravava a partida de uma OP sem
    // roteiro nenhum — era assim que `production-order-scrap.test.ts`
    // conseguia iniciar suas OPs, exercitando exatamente a brecha.
    //
    // Com o roteiro aqui, a liberacao da OP materializa a etapa (G4) e o
    // teste volta a percorrer o caminho REAL da fabrica. Criado direto pelos
    // models (mesmo padrao dos demais fixtures deste arquivo) e idempotente.
    const [ciWorkCenter] = await WorkCenter.findOrCreate({
      where: { code: 'CI-WC-001' },
      defaults: {
        code: 'CI-WC-001',
        name: 'Centro de Trabalho CI',
        description: 'Fixture automatizada de testes API (roteiro do produto de BOM)',
        machines_count: 1,
        capacity_hours_per_day: 8,
        efficiency_factor: 1,
        cost_per_hour: 50,
        active: true,
      },
    });
    // Reforca o estado esperado mesmo em banco reaproveitado: centro inativo
    // ou sem taxa faria a OP falhar por `G6-START-WC-INACTIVE`/
    // `G4-LABOR-RATE-MISSING`, e a falha pareceria regressao de codigo.
    if (!ciWorkCenter.active || Number(ciWorkCenter.cost_per_hour) <= 0) {
      await ciWorkCenter.update({ active: true, cost_per_hour: 50 });
    }

    const [ciRoute] = await ProductionRoute.findOrCreate({
      where: { product_id: bomFinishedProduct.id, revision: 'CI' },
      defaults: {
        product_id: bomFinishedProduct.id,
        route_code: `CI-ROUTE-${bomFinishedProduct.id}`,
        revision: 'CI',
        status: 'active',
        description: 'Fixture automatizada de testes API',
        created_by: admin.id,
        approved_by: admin.id,
        approved_at: new Date(),
      },
    });
    if (ciRoute.status !== 'active') {
      await ciRoute.update({ status: 'active' });
    }

    await ProductionRouteStep.findOrCreate({
      where: { production_route_id: ciRoute.id, sequence: 1 },
      defaults: {
        production_route_id: ciRoute.id,
        sequence: 1,
        step_code: 'CI010',
        name: 'Montagem (fixture CI)',
        work_center_id: ciWorkCenter.id,
        standard_time_minutes: 10,
        setup_time_minutes: 5,
        is_active: true,
      },
    });

    // Taxa horaria de mao-de-obra — fixture do gap G4 (2026-08-10).
    // Concluir uma OP passou a exigir apontamento por etapa E custeio real
    // dessa etapa: sem `work_centers.cost_per_hour` na etapa nem
    // `production_cost_settings.default_labor_rate_per_hour` global, a
    // conclusao falha com `G4-LABOR-RATE-MISSING` (com taxa zero o custo de
    // mao-de-obra sairia zero e o estoque ficaria subavaliado). O banco de
    // teste nasce com a taxa zerada, entao todo teste que conclui OP sem
    // roteiro/centro de trabalho proprio dependia de uma configuracao que
    // ninguem fazia. Configurar aqui e o equivalente do que o dono faz uma
    // vez em Producao > Configuracao de Custeio.
    const [costSettings] = await ProductionCostSettings.findOrCreate({
      where: { id: 1 },
      defaults: { id: 1, overhead_calculation_basis: 'material_labor', overhead_rate_percent: 0, default_labor_rate_per_hour: 50 },
    });
    if (Number(costSettings.default_labor_rate_per_hour) <= 0) {
      await costSettings.update({ default_labor_rate_per_hour: 50 });
    }

    await CompanyFiscalConfig.findOrCreate({
      where: { id: 1 },
      defaults: {
        id: 1,
        legal_name: 'EVOK Audio Ltda (CI)',
        cnpj: '11222333000199',
        ie: 'ISENTO',
        crt: '3',
        cep: '00000-000',
        street: 'Rua CI',
        number: '1',
        neighborhood: 'Centro',
        city: 'Homologacao',
        city_ibge_code: '3550308',
        state: 'SP',
        nfe_series: 1,
        nfe_next_number: 1,
        nfe_environment: 'homologacao',
        nfe_provider: 'mock',
      },
    });

    // `purchase-requisitions.test.ts` consome `GET /api/items` esperando
    // pelo menos 1 registro — o schema novo (`Item`, Fase 4) nunca tinha
    // fixture nesta suite (só o legado `Product` acima), entao o teste
    // sempre recebia lista vazia e falhava em `expect(itemId).toBeTruthy()`
    // (achado em 2026-08-05 ao rodar a suite de integracao pela primeira
    // vez contra um banco de teste isolado). `GET /api/items` nao faz
    // JOIN com `ItemDetalheComercial`/`ItemEspecificacaoTecnica`
    // (confirmado em SequelizeItemRepository.list — sem `include`), entao
    // um `Item` puro basta.
    await Item.findOrCreate({
      where: { codigo: 'CI-ITEM-001' },
      defaults: {
        codigo: 'CI-ITEM-001',
        descricao: 'Item CI (fixture automatizada de testes API)',
        tipo: 'MATERIA_PRIMA',
        unidade: 'un',
        status: 'ATIVO',
        estoque_atual: 100,
        estoque_reservado: 0,
        estoque_seguranca: 0,
        lote_minimo: 1,
        lead_time_dias: 1,
        custo_padrao: 5,
      },
    });

    return {
      adminId: admin.id,
      adminPasswordVersion: admin.passwordVersion,
      approverId: approver.id,
      approverPasswordVersion: approver.passwordVersion,
      supplierId: supplier.id,
      purchaseProductId: purchaseProduct.id,
      lowStockProductId: lowStockProduct.id,
      bomLinkedProductId: bomFinishedProduct.id,
    };
  } finally {
    await sequelize.close();
  }
}

/**
 * Roda uma suite Jest contra a API ja no ar.
 *
 * @param {string} suiteName - Pasta sob `tests/` (`integration` | `edge` | `characterization`).
 * @param {NodeJS.ProcessEnv} env - Ambiente com os tokens/fixtures exportados.
 * @param {string} [filter] - Regex opcional de caminho (`process.argv[3]`) para
 *   rodar so alguns arquivos durante depuracao. Com filtro, a checagem de
 *   "nenhum teste pulado" e ignorada — ela so faz sentido na suite completa,
 *   onde um `describe.skip` silencioso e o defeito que se quer pegar.
 * @returns {Promise<void>}
 */
async function runJestSuite(suiteName, env, filter) {
  const outputFile = path.join('tmp', `jest-${suiteName}.json`);
  await spawnLogged(process.execPath, [
    jestBin,
    '--runInBand',
    `tests/${suiteName}`,
    // Jest 30 removeu `--testPathPattern` (singular) em favor de
    // `--testPathPatterns`. Com o nome antigo o Jest aborta com codigo 1
    // ANTES de rodar qualquer teste — o filtro de depuracao estava
    // simplesmente quebrado, e a falha se parecia com "suite reprovou".
    ...(filter ? ['--testPathPatterns', filter] : []),
    '--ci',
    '--forceExit',
    '--json',
    `--outputFile=${outputFile}`,
  ], { env });
  if (!filter) {
    await spawnLogged(process.execPath, ['scripts/assert-jest-no-skips.cjs', outputFile], { env });
  }
}

async function main() {
  // Guard duro: esta suite escreve fixtures destrutivos (sobrescreve
  // usuario admin, cria centenas de registros CI-*, incrementa estoque em
  // +100000 unidades) direto no banco apontado por DB_HOST/DB_NAME/
  // NODE_ENV do ambiente atual — nao existe isolamento de banco por
  // codigo, so por configuracao. Se alguem rodar isto com credenciais de
  // producao copiadas para debug local, o dano e real e imediato. Barato
  // de checar, caro de nao checar.
  if (process.env.NODE_ENV === 'production' || /prod/i.test(process.env.DB_NAME || '') || /prod/i.test(process.env.DB_HOST || '')) {
    throw new Error(
      'run-api-suite.cjs recusou rodar: NODE_ENV/DB_NAME/DB_HOST parecem apontar para producao. ' +
      'Esta suite sobrescreve usuarios e dados de forma destrutiva — nunca rode contra producao.',
    );
  }
  if (!/(_test|_ci)$/i.test(process.env.DB_NAME || '')) {
    throw new Error(
      `run-api-suite.cjs recusou rodar: DB_NAME="${process.env.DB_NAME}" nao parece ser um banco de teste ` +
      '(esperado sufixo "_test" ou "_ci"). Esta suite sobrescreve dados de forma destrutiva — configure ' +
      'DB_NAME em server/.env.test (ou equivalente) para um banco descartavel antes de rodar test:integration.',
    );
  }

  const suite = process.argv[2] || 'api';
  // Filtro opcional de depuracao: `node scripts/run-api-suite.cjs integration sale-`
  // roda so os arquivos cujo caminho casa com o regex. Sem argumento, roda tudo
  // (comportamento de CI, inalterado).
  const filter = process.argv[3];
  const port = process.env.TEST_API_PORT || '3101';
  const n8nWebhookSecret = process.env.N8N_WEBHOOK_SECRET || 'ci-n8n-webhook-secret-for-integration-tests';
  const baseEnv = {
    ...process.env,
    NODE_ENV: 'test',
    PORT: port,
    N8N_WEBHOOK_SECRET: n8nWebhookSecret,
  };

  await spawnLogged(npmCommand(), ['run', 'migration:up'], { env: baseEnv });

  const server = spawn(process.execPath, ['dist/index.js'], {
    cwd: serverDir,
    env: baseEnv,
    stdio: 'inherit',
  });

  try {
    await waitForReady(`http://127.0.0.1:${port}/health/ready`, 60000);
    const fixtures = await ensureFixtures();

    /**
     * Emite um JWT para um usuario de fixture (mesma tecnica de
     * `tests/helpers/testApi.ts#mintToken`).
     *
     * @param {number} id - Id do usuario.
     * @param {number|null|undefined} passwordVersion - Versao de senha atual (invalidacao de sessao).
     * @returns {string} Token valido por 1 hora.
     */
    const mint = (id, passwordVersion) => jwt.sign(
      { id, passwordVersion },
      process.env.JWT_SECRET,
      { expiresIn: '1h', issuer: 'erp-evok-audio', audience: 'erp-evok-audio-api' },
    );

    const token = mint(fixtures.adminId, fixtures.adminPasswordVersion);
    const approverJwt = mint(fixtures.approverId, fixtures.approverPasswordVersion);
    const testEnv = {
      ...baseEnv,
      RUN_INTEGRATION: 'true',
      TEST_API_URL: `http://127.0.0.1:${port}`,
      TEST_AUTH_TOKEN: token,
      // Token do SEGUNDO administrador (segregacao de funcao D-K) — ver
      // `tests/helpers/testApi.ts#approverToken`.
      TEST_APPROVER_TOKEN: approverJwt,
      TEST_APPROVER_USER_ID: String(fixtures.approverId),
      TEST_SUPPLIER_ID: String(fixtures.supplierId),
      TEST_PRODUCT_ID: String(fixtures.purchaseProductId),
      TEST_LOW_STOCK_PRODUCT_ID: String(fixtures.lowStockProductId),
      TEST_LOW_STOCK_QUANTITY: '999999',
      TEST_BOM_LINKED_PRODUCT_ID: String(fixtures.bomLinkedProductId),
      TEST_N8N_WEBHOOK_PATH: '/api/webhooks/n8n',
      TEST_N8N_WEBHOOK_SECRET: n8nWebhookSecret,
    };

    if (suite === 'integration') {
      await runJestSuite('integration', testEnv, filter);
    } else if (suite === 'edge') {
      await runJestSuite('edge', testEnv, filter);
    } else if (suite === 'characterization') {
      // Testes de caracterizacao do legado (ERP-LEGACY-001, passo 30):
      // documentam o comportamento ATUAL da API, certo ou errado. Rodam
      // apenas sob demanda (`npm run test:characterization`) — ficam FORA
      // do default `api` de proposito, para nao mudar o escopo do CI
      // existente.
      await runJestSuite('characterization', testEnv, filter);
    } else {
      await runJestSuite('integration', testEnv, filter);
      await runJestSuite('edge', testEnv, filter);
    }
  } finally {
    server.kill('SIGTERM');
    await new Promise((resolve) => server.on('exit', resolve));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
