/**
 * 🎮 Controller: BomController
 * 
 * Controlador REST para gerenciamento de Estruturas de Produto (BOM).
 * Intercepta requisições HTTP, valida I/O e delega lógica de negócio ao BomService.
 * 
 * @module controllers/bomController
 * 
 * @description
 * Gerencia o ciclo de vida completo das BOMs:
 * - CRUD de BOMs e seus itens
 * - Explosão de BOM para cálculo de necessidades
 * - Cálculo de custos baseado na BOM ativa
 * - Verificação de disponibilidade de estoque para produção
 * 
 * **Endpoints:**
 * | Método | Rota | Descrição |
 * |--------|------|-----------|
 * | GET    | /api/engineering/bom | Lista BOMs |
 * | GET    | /api/engineering/bom/:id | Detalhes da BOM |
 * | POST   | /api/engineering/bom | Criar BOM |
 * | PUT    | /api/engineering/bom/:id | Atualizar BOM |
 * | DELETE | /api/engineering/bom/:id | Inativar BOM |
 * | GET    | /api/engineering/bom/:id/explode?qty=100 | Explodir BOM |
 * | GET    | /api/engineering/bom/:id/cost?qty=1 | Calcular custo |
 * | GET    | /api/engineering/bom/:id/availability?qty=100 | Disponibilidade |
 * | GET    | /api/engineering/bom/:id/tree | Árvore hierárquica |
 * | GET    | /api/engineering/bom/product/:productId | BOM ativa do produto |
 * 
 * @requires services/bomService
 * @requires models/BillOfMaterial
 * @requires models/BillOfMaterialItem
 */

const { BillOfMaterial, BillOfMaterialItem, Product } = require('../models/index');
const { Op } = require('sequelize');
const BomService = require('../services/bomService');

module.exports = {

  // ======================================================================
  // CRUD - LISTAGEM
  // ======================================================================

  /**
   * Lista todas as BOMs com paginação e filtros.
   * 
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.page=1] - Número da página
   * @param {number} [req.query.limit=10] - Itens por página
   * @param {string} [req.query.status] - Filtrar por status (draft, active, inactive, superseded)
   * @param {string} [req.query.search] - Busca por nome do produto
   * @param {number} [req.query.product_id] - Filtrar por produto específico
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON com lista de BOMs e paginação
   * 
   * @throws {500} Erro interno do servidor (logado internamente)
   */
  async list(req, res) {
    try {
      const { page = 1, limit = 10, status, search, product_id } = req.query;
      const where = {};

      if (status) where.status = status;
      if (product_id) where.product_id = product_id;

      // Filtro de busca por nome do produto (via include)
      const productWhere = {};
      if (search) {
        productWhere.name = { [Op.like]: `%${search}%` };
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const { count, rows } = await BillOfMaterial.findAndCountAll({
        where,
        include: [
          { 
            model: Product, 
            as: 'product', 
            attributes: ['id', 'name', 'code', 'product_type'],
            where: Object.keys(productWhere).length > 0 ? productWhere : undefined
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [['updatedAt', 'DESC']]
      });

      res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      });
    } catch (error) {
      // Log interno sem vazar detalhes do erro
      console.error('[BOM] Erro ao listar:', error.message);
      res.status(500).json({ 
        success: false, 
        error: process.env.NODE_ENV === 'production' 
          ? 'Erro interno ao listar estruturas de produto' 
          : error.message 
      });
    }
  },

  /**
   * Obtém uma BOM específica com seus itens.
   * 
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route params
   * @param {number} req.params.id - ID da BOM
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON com dados completos da BOM
   * 
   * @throws {404} BOM não encontrada
   * @throws {500} Erro interno do servidor
   */
  async getById(req, res) {
    try {
      const bom = await BillOfMaterial.findByPk(req.params.id, {
        include: [
          { model: Product, as: 'product', attributes: ['id', 'name', 'code', 'product_type'] },
          { 
            model: BillOfMaterialItem, 
            as: 'items',
            include: [{ model: Product, as: 'componentProduct', attributes: ['id', 'name', 'code', 'cost_price'] }],
            order: [['bom_level', 'ASC'], ['sequence_order', 'ASC']]
          }
        ]
      });

      if (!bom) {
        return res.status(404).json({ success: false, error: 'Estrutura de produto (BOM) não encontrada' });
      }

      res.json({ success: true, data: bom });
    } catch (error) {
      console.error('[BOM] Erro ao buscar por ID:', error.message);
      res.status(500).json({ 
        success: false, 
        error: process.env.NODE_ENV === 'production' 
          ? 'Erro interno ao buscar estrutura de produto' 
          : error.message 
      });
    }
  },

  /**
   * Obtém a BOM ativa de um produto específico.
   * 
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route params
   * @param {number} req.params.productId - ID do produto
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON com BOM ativa do produto
   * 
   * @throws {404} Produto não encontrado ou sem BOM ativa
   */
  async getByProduct(req, res) {
    try {
      const product = await Product.findByPk(req.params.productId);
      if (!product) {
        return res.status(404).json({ success: false, error: 'Produto não encontrado' });
      }

      const bom = await BillOfMaterial.findOne({
        where: { product_id: req.params.productId, status: 'active' },
        include: [
          { model: BillOfMaterialItem, as: 'items',
            include: [{ model: Product, as: 'componentProduct', attributes: ['id', 'name', 'code', 'cost_price', 'quantity', 'min_quantity'] }],
            order: [['bom_level', 'ASC'], ['sequence_order', 'ASC']]
          }
        ]
      });

      if (!bom) {
        return res.status(404).json({ 
          success: false, 
          error: `Produto "${product.name}" não possui BOM ativa. Crie uma pelo POST /api/engineering/bom`
        });
      }

      res.json({ success: true, data: bom });
    } catch (error) {
      console.error('[BOM] Erro ao buscar por produto:', error.message);
      res.status(500).json({ 
        success: false, 
        error: process.env.NODE_ENV === 'production' 
          ? 'Erro interno ao buscar BOM do produto' 
          : error.message 
      });
    }
  },

  // ======================================================================
  // CRUD - CRIAÇÃO
  // ======================================================================

  /**
   * Cria uma nova BOM para um produto com seus componentes.
   * 
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {number} req.body.product_id - ID do produto acabado
   * @param {Array<Object>} req.body.items - Lista de componentes
   * @param {number} req.body.items[].component_product_id - ID do componente
   * @param {number} req.body.items[].quantity - Quantidade por unidade
   * @param {string} [req.body.items[].unit='un'] - Unidade de medida
   * @param {number} [req.body.items[].bom_level=1] - Nível hierárquico
   * @param {string} [req.body.revision='00'] - Revisão
   * @param {string} [req.body.notes] - Observações
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON com BOM criada
   * 
   * @throws {400} Dados inválidos ou incompletos
   * @throws {404} Produto ou componente não encontrado
   */
  async create(req, res) {
    try {
      const { product_id, items, revision, revision_notes, notes } = req.body;

      // Validações de I/O
      if (!product_id) {
        return res.status(400).json({ success: false, error: 'ID do produto é obrigatório' });
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Adicione pelo menos um item componente à BOM' });
      }

      // Valida cada item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.component_product_id) {
          return res.status(400).json({ success: false, error: `Item ${i + 1}: component_product_id é obrigatório` });
        }
        if (!item.quantity || parseFloat(item.quantity) <= 0) {
          return res.status(400).json({ success: false, error: `Item ${i + 1}: quantidade deve ser maior que zero` });
        }
      }

      const result = await BomService.createBOM({
        product_id,
        created_by: req.user.id,
        items,
        revision,
        revision_notes,
        notes
      });

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      // Tratamento de erros conhecidos do serviço
      const statusCode = error.statusCode || 500;
      console.error('[BOM] Erro ao criar:', error.message);
      res.status(statusCode).json({ 
        success: false, 
        error: process.env.NODE_ENV === 'production' && statusCode === 500
          ? 'Erro interno ao criar estrutura de produto'
          : error.message 
      });
    }
  },

  // ======================================================================
  // CRUD - ATUALIZAÇÃO
  // ======================================================================

  /**
   * Atualiza dados gerais de uma BOM (não os itens).
   * Para alterar itens, criar uma nova revisão.
   * 
   * @param {Object} req - Express request object
   * @param {number} req.params.id - ID da BOM
   * @param {Object} req.body - Campos a atualizar
   * @param {string} [req.body.revision] - Nova revisão
   * @param {string} [req.body.revision_notes] - Notas da revisão
   * @param {string} [req.body.notes] - Observações
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON com BOM atualizada
   * 
   * @throws {404} BOM não encontrada
   */
  async update(req, res) {
    try {
      const allowedFields = ['revision', 'revision_notes', 'notes', 'status'];
      const updateData = {};

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      const [updated] = await BillOfMaterial.update(updateData, { 
        where: { id: req.params.id } 
      });

      if (!updated) {
        return res.status(404).json({ success: false, error: 'BOM não encontrada' });
      }

      const bom = await BillOfMaterial.findByPk(req.params.id, {
        include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }]
      });

      res.json({ success: true, data: bom });
    } catch (error) {
      console.error('[BOM] Erro ao atualizar:', error.message);
      res.status(500).json({ 
        success: false, 
        error: process.env.NODE_ENV === 'production' 
          ? 'Erro interno ao atualizar estrutura de produto' 
          : error.message 
      });
    }
  },

  // ======================================================================
  // CRUD - REMOÇÃO (SOFT DELETE)
  // ======================================================================

  /**
   * Inativa (soft delete) uma BOM.
   * Apenas BOMs em status 'draft' ou 'active' podem ser inativadas.
   * 
   * @param {Object} req - Express request object
   * @param {number} req.params.id - ID da BOM
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Mensagem de sucesso
   * 
   * @throws {400} BOM em status que não permite inativação
   * @throws {404} BOM não encontrada
   */
  async remove(req, res) {
    try {
      const bom = await BillOfMaterial.findByPk(req.params.id);
      if (!bom) {
        return res.status(404).json({ success: false, error: 'BOM não encontrada' });
      }

      if (!['draft', 'active'].includes(bom.status)) {
        return res.status(400).json({ 
          success: false, 
          error: `BOM em status "${bom.status}" não pode ser inativada. Apenas BOMs 'draft' ou 'active'` 
        });
      }

      await BillOfMaterial.update(
        { status: 'inactive' },
        { where: { id: req.params.id } }
      );

      res.json({ success: true, data: { message: 'BOM inativada com sucesso' } });
    } catch (error) {
      console.error('[BOM] Erro ao remover:', error.message);
      res.status(500).json({ 
        success: false, 
        error: process.env.NODE_ENV === 'production' 
          ? 'Erro interno ao inativar estrutura de produto' 
          : error.message 
      });
    }
  },

  // ======================================================================
  // OPERAÇÕES DE ENGENHARIA (SERVIÇOS)
  // ======================================================================

  /**
   * Explode a BOM para uma quantidade específica.
   * Retorna todos os componentes necessários em todos os níveis.
   * 
   * @param {Object} req - Express request object
   * @param {number} req.params.id - ID da BOM
   * @param {Object} req.query - Query params
   * @param {number} req.query.qty - Quantidade a produzir (obrigatório)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} BOM explodida
   * 
   * @throws {400} Quantidade não informada
   * @throws {404} BOM não encontrada
   */
  async explode(req, res) {
    try {
      const { qty } = req.query;
      if (!qty || parseInt(qty) <= 0) {
        return res.status(400).json({ success: false, error: 'Parâmetro "qty" (quantidade) é obrigatório e deve ser > 0' });
      }

      const bom = await BillOfMaterial.findByPk(req.params.id);
      if (!bom) {
        return res.status(404).json({ success: false, error: 'BOM não encontrada' });
      }

      const result = await BomService.explodeBOM(bom.product_id, parseInt(qty));
      res.json({ success: true, data: result });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      console.error('[BOM] Erro ao explodir:', error.message);
      res.status(statusCode).json({ 
        success: false, 
        error: process.env.NODE_ENV === 'production' && statusCode === 500
          ? 'Erro interno ao explodir estrutura de produto'
          : error.message 
      });
    }
  },

  /**
   * Calcula o custo do produto baseado na BOM ativa.
   * 
   * @param {Object} req - Express request object
   * @param {number} req.params.id - ID da BOM
   * @param {Object} req.query - Query params
   * @param {number} [req.query.qty=1] - Quantidade para calcular
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Detalhamento de custos
   */
  async cost(req, res) {
    try {
      const qty = parseInt(req.query.qty) || 1;
      if (qty <= 0) {
        return res.status(400).json({ success: false, error: 'Quantidade deve ser maior que zero' });
      }

      const bom = await BillOfMaterial.findByPk(req.params.id);
      if (!bom) {
        return res.status(404).json({ success: false, error: 'BOM não encontrada' });
      }

      const result = await BomService.calculateCost(bom.product_id, qty);
      res.json({ success: true, data: result });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      console.error('[BOM] Erro ao calcular custo:', error.message);
      res.status(statusCode).json({ 
        success: false, 
        error: process.env.NODE_ENV === 'production' && statusCode === 500
          ? 'Erro interno ao calcular custo'
          : error.message 
      });
    }
  },

  /**
   * Verifica disponibilidade de estoque para produzir uma quantidade.
   * 
   * @param {Object} req - Express request object
   * @param {number} req.params.id - ID da BOM
   * @param {Object} req.query - Query params
   * @param {number} req.query.qty - Quantidade desejada
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Status de disponibilidade
   */
  async availability(req, res) {
    try {
      const { qty } = req.query;
      if (!qty || parseInt(qty) <= 0) {
        return res.status(400).json({ success: false, error: 'Parâmetro "qty" (quantidade) é obrigatório' });
      }

      const bom = await BillOfMaterial.findByPk(req.params.id);
      if (!bom) {
        return res.status(404).json({ success: false, error: 'BOM não encontrada' });
      }

      const result = await BomService.checkAvailability(bom.product_id, parseInt(qty));
      res.json({ success: true, data: result });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      console.error('[BOM] Erro ao verificar disponibilidade:', error.message);
      res.status(statusCode).json({ 
        success: false, 
        error: process.env.NODE_ENV === 'production' && statusCode === 500
          ? 'Erro interno ao verificar disponibilidade'
          : error.message 
      });
    }
  },

  /**
   * Retorna a árvore hierárquica completa da BOM para visualização.
   * 
   * @param {Object} req - Express request object
   * @param {number} req.params.id - ID da BOM
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Árvore estruturada
   */
  async tree(req, res) {
    try {
      const result = await BomService.getBOMTree(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      console.error('[BOM] Erro ao buscar árvore:', error.message);
      res.status(statusCode).json({ 
        success: false, 
        error: process.env.NODE_ENV === 'production' && statusCode === 500
          ? 'Erro interno ao buscar árvore da BOM'
          : error.message 
      });
    }
  },

  /**
   * Lista todos os itens de uma BOM específica.
   * 
   * @param {Object} req - Express request object
   * @param {number} req.params.id - ID da BOM
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Lista de itens
   */
  async listItems(req, res) {
    try {
      const items = await BillOfMaterialItem.findAll({
        where: { bom_id: req.params.id },
        include: [{ model: Product, as: 'componentProduct', attributes: ['id', 'name', 'code', 'cost_price', 'quantity'] }],
        order: [['bom_level', 'ASC'], ['sequence_order', 'ASC']]
      });

      res.json({ success: true, data: items });
    } catch (error) {
      console.error('[BOM] Erro ao listar itens:', error.message);
      res.status(500).json({ 
        success: false, 
        error: process.env.NODE_ENV === 'production' 
          ? 'Erro interno ao listar itens da BOM' 
          : error.message 
      });
    }
  }
};
