/**
 * 🛣️ Routes: BOM (Bill of Materials)
 * 
 * Definição de todas as rotas REST para o módulo de Estrutura de Produto.
 * 
 * @module routes/bom
 * 
 * @description
 * Endpoints para gerenciamento completo da Estrutura de Produto (BOM):
 * - CRUD de BOMs (cabeçalho)
 * - Operações de engenharia: explosão, custo, disponibilidade, árvore
 * - Controle de versões e revisões
 * 
 * @requires middlewares/auth - Autenticação JWT + RBAC
 * @requires controllers/bomController - Controlador
 * 
 * @example
 * // Exemplo de requisição para criar BOM:
 * POST /api/engineering/bom
 * {
 *   "product_id": 1,
 *   "revision": "00",
 *   "notes": "BOM inicial Alto-Falante 12\" PRO",
 *   "items": [
 *     { "component_product_id": 10, "quantity": 1, "unit": "un", "bom_level": 1 },
 *     { "component_product_id": 11, "quantity": 1, "unit": "un", "bom_level": 1 }
 *   ]
 * }
 */

const express = require('express');
const router = express.Router();
const bomController = require('../controllers/bomController');
const { authenticate } = require('../middlewares/auth');

// ═══════════════════════════════════════════════════════════════════════
// CRUD BOM
// ═══════════════════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/engineering/bom:
 *   get:
 *     tags: [BOM - Estrutura de Produto]
 *     summary: Lista todas as BOMs
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, active, inactive, superseded] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: Lista de BOMs }
 */
router.get('/', authenticate, bomController.list);

/**
 * @openapi
 * /api/engineering/bom/product/{productId}:
 *   get:
 *     tags: [BOM - Estrutura de Produto]
 *     summary: Retorna a BOM ativa de um produto
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: BOM ativa do produto }
 *       404: { description: Produto sem BOM ativa }
 */
router.get('/product/:productId', authenticate, bomController.getByProduct);

/**
 * @openapi
 * /api/engineering/bom/{id}:
 *   get:
 *     tags: [BOM - Estrutura de Produto]
 *     summary: Retorna BOM por ID com itens
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: BOM completa }
 */
router.get('/:id', authenticate, bomController.getById);

/**
 * @openapi
 * /api/engineering/bom:
 *   post:
 *     tags: [BOM - Estrutura de Produto]
 *     summary: Cria nova BOM para um produto
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [product_id, items]
 *             properties:
 *               product_id: { type: integer }
 *               revision: { type: string, default: '00' }
 *               items: { type: array }
 *     responses:
 *       201: { description: BOM criada }
 */
router.post('/', authenticate, bomController.create);

/**
 * @openapi
 * /api/engineering/bom/{id}:
 *   put:
 *     tags: [BOM - Estrutura de Produto]
 *     summary: Atualiza dados da BOM
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: BOM atualizada }
 */
router.put('/:id', authenticate, bomController.update);

/**
 * @openapi
 * /api/engineering/bom/{id}:
 *   delete:
 *     tags: [BOM - Estrutura de Produto]
 *     summary: Inativa uma BOM
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: BOM inativada }
 */
router.delete('/:id', authenticate, bomController.remove);

// ═══════════════════════════════════════════════════════════════════════
// OPERAÇÕES DE ENGENHARIA
// ═══════════════════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/engineering/bom/{id}/explode:
 *   get:
 *     tags: [BOM - Engenharia]
 *     summary: Explode BOM para quantidade específica
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: qty
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: BOM explodida }
 */
router.get('/:id/explode', authenticate, bomController.explode);

/**
 * @openapi
 * /api/engineering/bom/{id}/cost:
 *   get:
 *     tags: [BOM - Engenharia]
 *     summary: Calcula custo baseado na BOM
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: qty
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200: { description: Detalhamento de custos }
 */
router.get('/:id/cost', authenticate, bomController.cost);

/**
 * @openapi
 * /api/engineering/bom/{id}/availability:
 *   get:
 *     tags: [BOM - Engenharia]
 *     summary: Verifica disponibilidade de estoque para produzir
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: qty
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Status de disponibilidade }
 */
router.get('/:id/availability', authenticate, bomController.availability);

/**
 * @openapi
 * /api/engineering/bom/{id}/tree:
 *   get:
 *     tags: [BOM - Engenharia]
 *     summary: Retorna árvore hierárquica da BOM
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Árvore da BOM }
 */
router.get('/:id/tree', authenticate, bomController.tree);

/**
 * @openapi
 * /api/engineering/bom/{id}/items:
 *   get:
 *     tags: [BOM - Estrutura de Produto]
 *     summary: Lista itens de uma BOM
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Lista de itens }
 */
router.get('/:id/items', authenticate, bomController.listItems);

module.exports = router;
