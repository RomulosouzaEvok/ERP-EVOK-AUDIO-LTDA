const express = require('express');

const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const spreadsheetUpload = require('../middlewares/spreadsheetUpload');
const catalogImportController = require('../controllers/catalogImportController');

/**
 * Rotas da importação de cadastro por planilha, montadas em
 * `/api/catalog-import` (`server/app.ts`).
 *
 * ## RBAC
 *
 * Ler/baixar modelo: `authorizeModule('produtos')` — mesmo módulo do cadastro
 * de produtos e itens (`/api/products`, `/api/items`).
 *
 * Simular e importar: `produtos` **e** `bom`, ambos em nível `operate`. São
 * exigidos os dois porque uma importação escreve, na mesma operação, o
 * cadastro (`products`/`items`) **e** a estrutura de produto
 * (`bill_of_materials`) — dar acesso a um só permitiria criar estrutura por
 * um caminho que a tela de BOM protege. Quem opera o carregamento inicial da
 * fábrica é, na prática, Engenharia/PCP, que tem os dois módulos.
 *
 * @module modules/spreadsheetImport/presentation/routes/catalogImport
 */

router.get('/modelos', authenticate, authorizeModule('produtos'), catalogImportController.descreverModelos);
router.get('/modelos/produtos.csv', authenticate, authorizeModule('produtos'), catalogImportController.modeloProdutos);
router.get('/modelos/estrutura.csv', authenticate, authorizeModule('produtos'), catalogImportController.modeloEstrutura);

router.post(
  '/simulacao',
  authenticate,
  authorizeModule('produtos', 'operate'),
  authorizeModule('bom', 'operate'),
  spreadsheetUpload,
  catalogImportController.simular,
);

router.post(
  '/',
  authenticate,
  authorizeModule('produtos', 'operate'),
  authorizeModule('bom', 'operate'),
  spreadsheetUpload,
  catalogImportController.importar,
);

module.exports = router;
