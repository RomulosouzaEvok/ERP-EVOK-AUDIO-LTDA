const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

const serverDir = path.resolve(__dirname, '..');
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
  const { sequelize, User, Supplier, Product, BillOfMaterial } = models;

  try {
    await sequelize.authenticate();

    const admin = await User.findOne({ where: { email: 'admin@evokaudio.com.br' } });
    if (!admin) {
      throw new Error('Usuario admin seed nao encontrado para os testes de integracao.');
    }
    await admin.update({
      password: process.env.ADMIN_SEED_PASSWORD,
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

    return {
      adminId: admin.id,
      supplierId: supplier.id,
      purchaseProductId: purchaseProduct.id,
      lowStockProductId: lowStockProduct.id,
      bomLinkedProductId: bomFinishedProduct.id,
    };
  } finally {
    await sequelize.close();
  }
}

async function runJestSuite(suiteName, env) {
  const outputFile = path.join('tmp', `jest-${suiteName}.json`);
  await spawnLogged(process.execPath, [
    jestBin,
    '--runInBand',
    `tests/${suiteName}`,
    '--ci',
    '--forceExit',
    '--json',
    `--outputFile=${outputFile}`,
  ], { env });
  await spawnLogged(process.execPath, ['scripts/assert-jest-no-skips.cjs', outputFile], { env });
}

async function main() {
  const suite = process.argv[2] || 'api';
  const port = process.env.TEST_API_PORT || '3101';
  const baseEnv = {
    ...process.env,
    NODE_ENV: 'test',
    PORT: port,
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

    const token = jwt.sign({ id: fixtures.adminId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const testEnv = {
      ...baseEnv,
      RUN_INTEGRATION: 'true',
      TEST_API_URL: `http://127.0.0.1:${port}`,
      TEST_AUTH_TOKEN: token,
      TEST_SUPPLIER_ID: String(fixtures.supplierId),
      TEST_PRODUCT_ID: String(fixtures.purchaseProductId),
      TEST_LOW_STOCK_PRODUCT_ID: String(fixtures.lowStockProductId),
      TEST_LOW_STOCK_QUANTITY: '999999',
      TEST_BOM_LINKED_PRODUCT_ID: String(fixtures.bomLinkedProductId),
      TEST_N8N_WEBHOOK_PATH: '/api/webhooks/n8n',
      TEST_N8N_SIGNATURE: 'ci-signature',
    };

    if (suite === 'integration') {
      await runJestSuite('integration', testEnv);
    } else if (suite === 'edge') {
      await runJestSuite('edge', testEnv);
    } else {
      await runJestSuite('integration', testEnv);
      await runJestSuite('edge', testEnv);
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
