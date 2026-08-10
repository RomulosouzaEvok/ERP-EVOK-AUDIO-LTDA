'use strict';

/**
 * G17 — o Plano Mestre de Produção (MPS) passa a existir como camada entre a
 * carteira de pedidos e a ordem de produção (decisão D-F do dono do produto,
 * `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4).
 *
 * ## O buraco que esta migration fecha
 *
 * Conferido no código antes de escrever uma linha:
 *
 * | Fato | Onde |
 * |---|---|
 * | Confirmar venda **não** gera produção nenhuma | `ChangeSaleStatusUseCase` só reserva estoque (G9) |
 * | O MRP só calcula contra a demanda que **o usuário digita** no payload | `GenerateMrpPlanUseCase.execute` → `input.demands` |
 * | Nada lê a carteira de pedidos aberta | não existe consulta de saldo `quantity - invoiced_quantity` fora do faturamento |
 * | Nada lê o estoque mínimo como demanda | `products.min_quantity` só alimenta alerta de dashboard |
 *
 * Ou seja: a ponte "o cliente comprou" → "a fábrica produz" era **memória de
 * quem planeja**. Não havia registro de decisão, nem rastro de origem da OP.
 *
 * ## O que esta migration NÃO faz (e por decisão explícita do dono)
 *
 * **Não cria gatilho de OP automática na confirmação da venda.** A decisão
 * D-F registrou que existe PCP formal — há quem planeje. O padrão da
 * indústria (e a recomendação do próprio plano de ação, linha do G17) é a
 * camada de plano mestre: o sistema consolida a informação, **uma pessoa
 * decide**, e a decisão registrada é o que gera OP. Por isso `planned_quantity`
 * é campo do planejador e `production_order_id` só é preenchido no ato
 * explícito de liberação do plano.
 *
 * ## As duas tabelas
 *
 * 1. `master_production_plans` — o plano em si: horizonte declarado pelo
 *    planejador, status do ciclo (`draft → firm → released`), e o rastro de
 *    quem planejou/firmou/liberou (sempre do JWT).
 * 2. `master_production_plan_lines` — uma linha por produto. Guarda a
 *    demanda consolidada **decomposta por origem** (carteira, estoque
 *    mínimo, previsão manual), o suprimento confrontado (saldo de
 *    planejamento e o que já está em produção), a sugestão calculada e —
 *    separadamente — a **decisão do planejador**. Sugestão e decisão em
 *    colunas distintas de propósito: sobrescrever a sugestão apagaria a
 *    evidência de que o humano divergiu do cálculo, que é justamente o que
 *    uma auditoria de PCP quer ver.
 *
 * ## Decisões de política de PCP que esta migration deliberadamente NÃO toma
 *
 * O dono não as tomou, e inventá-las seria fabricar regra de negócio:
 * - **horizonte de planejamento** — não há default; `horizon_start`/`horizon_end`
 *   são obrigatórios e informados pelo planejador a cada plano;
 * - **política de lote mínimo/múltiplo de produção** — `suggested_quantity` é a
 *   necessidade líquida crua, sem arredondamento de lote;
 * - **pedido que chega depois do plano fechado** — não há re-planejamento
 *   automático; o plano é uma fotografia datada (`consolidated_at`) e um
 *   plano novo é criado quando o planejador quiser.
 *
 * ## Efeito nas linhas existentes
 *
 * Nenhum. Duas tabelas novas, nenhuma coluna alterada em tabela existente. O
 * vínculo com a OP mora em `master_production_plan_lines.production_order_id`
 * (e não numa coluna nova em `production_orders`) exatamente para que esta
 * migration não toque o hot path da produção.
 *
 * ⚠️ `comment:` NÃO é usado em `createTable`/`addColumn` (corrompe o SQL gerado
 * neste projeto) — os comentários vão em `COMMENT ON COLUMN`.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_production_plans', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      plan_number: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      horizon_start: { type: Sequelize.DATEONLY, allowNull: false },
      horizon_end: { type: Sequelize.DATEONLY, allowNull: false },
      status: {
        type: Sequelize.ENUM('draft', 'firm', 'released', 'canceled'),
        allowNull: false,
        defaultValue: 'draft',
      },
      planner_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      consolidated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      firmed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      firmed_at: { type: Sequelize.DATE, allowNull: true },
      released_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      released_at: { type: Sequelize.DATE, allowNull: true },
      canceled_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      canceled_at: { type: Sequelize.DATE, allowNull: true },
      cancel_reason: { type: Sequelize.TEXT, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('master_production_plans', ['status'], {
      name: 'idx_master_production_plans_status',
    });
    await queryInterface.addIndex('master_production_plans', ['planner_id'], {
      name: 'idx_master_production_plans_planner_id',
    });
    await queryInterface.addIndex('master_production_plans', ['horizon_start', 'horizon_end'], {
      name: 'idx_master_production_plans_horizon',
    });

    // CHECK em SQL cru, seguindo o precedente das migrations `20260809-000026`
    // e `20260810-000030` (reserva por documento) — `addConstraint({type:'check'})`
    // não é usado neste projeto.
    await queryInterface.sequelize.query(`
      ALTER TABLE master_production_plans
        ADD CONSTRAINT chk_master_production_plans_horizon_order
        CHECK (horizon_end >= horizon_start);
    `);

    await queryInterface.createTable('master_production_plan_lines', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      plan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'master_production_plans', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      demand_sales_orders: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      demand_safety_stock: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      demand_forecast: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      gross_requirement: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      supply_on_hand: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      supply_withheld: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      supply_reserved: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      supply_in_production: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      net_requirement: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      suggested_quantity: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      planned_quantity: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      due_date: { type: Sequelize.DATEONLY, allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'planned', 'dismissed', 'released'),
        allowNull: false,
        defaultValue: 'pending',
      },
      production_order_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'production_orders', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      decided_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      decided_at: { type: Sequelize.DATE, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // Um produto aparece UMA vez por plano. Sem isso, duas consolidações
    // concorrentes do mesmo plano (ou um retry de rede) duplicariam a
    // necessidade e o planejador liberaria duas OPs para a mesma demanda.
    await queryInterface.addIndex('master_production_plan_lines', ['plan_id', 'product_id'], {
      name: 'uq_master_production_plan_lines_plan_product',
      unique: true,
    });
    await queryInterface.addIndex('master_production_plan_lines', ['status'], {
      name: 'idx_master_production_plan_lines_status',
    });
    await queryInterface.addIndex('master_production_plan_lines', ['production_order_id'], {
      name: 'idx_master_production_plan_lines_production_order_id',
    });

    // Quantidade decidida nunca negativa. A regra também vive no use case
    // (`DecideMasterProductionPlanLineUseCase`), mas o banco é a última linha
    // de defesa: quantidade negativa aqui viraria OP de quantidade negativa.
    await queryInterface.sequelize.query(`
      ALTER TABLE master_production_plan_lines
        ADD CONSTRAINT chk_master_production_plan_lines_planned_quantity_non_negative
        CHECK (planned_quantity >= 0);
    `);

    await queryInterface.sequelize.query(`
      COMMENT ON TABLE master_production_plans IS 'G17: Plano Mestre de Producao (MPS) — camada de decisao entre a carteira de pedidos e a ordem de producao. Decisao D-F do dono do produto (existe PCP formal). NAO existe geracao automatica de OP na confirmacao da venda: a OP nasce do ato explicito de liberar um plano firme.';
      COMMENT ON COLUMN master_production_plans.plan_number IS 'Numero legivel do plano (MPS-YYYY-NNNN), serializado por advisory lock anual — mesmo padrao de production_orders.order_number apos o G16.';
      COMMENT ON COLUMN master_production_plans.horizon_start IS 'Inicio do horizonte de planejamento. SEM default: horizonte e politica de PCP e o dono nao a definiu — quem planeja declara a cada plano.';
      COMMENT ON COLUMN master_production_plans.horizon_end IS 'Fim do horizonte de planejamento. Vira a data de necessidade padrao das linhas (e, por consequencia, o due_date da OP gerada) quando o planejador nao informa outra.';
      COMMENT ON COLUMN master_production_plans.status IS 'draft (consolidado, em edicao) | firm (decisao congelada) | released (OPs geradas) | canceled. So plano firm gera OP.';
      COMMENT ON COLUMN master_production_plans.planner_id IS 'FK -> users.id de quem criou o plano. SEMPRE do JWT (req.user.id), nunca do body — anti-spoofing e regra P0 do projeto.';
      COMMENT ON COLUMN master_production_plans.consolidated_at IS 'Momento em que a demanda foi fotografada. O plano NAO se re-consolida sozinho: pedido que chega depois entra no proximo plano (politica de replanejamento nao decidida pelo dono).';

      COMMENT ON TABLE master_production_plan_lines IS 'G17: linha do plano mestre — um produto por plano. Guarda a demanda consolidada decomposta por origem, o suprimento confrontado, a sugestao calculada e, em coluna separada, a DECISAO do planejador.';
      COMMENT ON COLUMN master_production_plan_lines.demand_sales_orders IS 'Carteira de pedidos: soma de (sale_items.quantity - sale_items.invoiced_quantity) das vendas confirmed/partially_invoiced. E a demanda que ninguem lia antes do G17.';
      COMMENT ON COLUMN master_production_plan_lines.demand_safety_stock IS 'products.min_quantity — o estoque minimo passa a ser demanda de planejamento, nao so alerta de dashboard.';
      COMMENT ON COLUMN master_production_plan_lines.demand_forecast IS 'Previsao informada manualmente pelo planejador na criacao do plano. NAO existe entidade de forecast no ERP (risco residual registrado); zero quando nao informada.';
      COMMENT ON COLUMN master_production_plan_lines.supply_on_hand IS 'Saldo de PLANEJAMENTO do produto = max(0, products.quantity - retido em quarentena/bloqueio - reservado). Mesmo saldo do G7/G9: material nao inspecionado e material reservado NAO contam como disponivel.';
      COMMENT ON COLUMN master_production_plan_lines.supply_withheld IS 'Parcela retida em lot_controls com status quarantine/blocked (services/quarantineBalanceService), ja descontada de supply_on_hand. Guardada para auditoria do numero.';
      COMMENT ON COLUMN master_production_plan_lines.supply_reserved IS 'products.reserved_quantity (cache derivado da soma das reservas vivas por OP e por venda, G3/G9), ja descontado de supply_on_hand.';
      COMMENT ON COLUMN master_production_plan_lines.supply_in_production IS 'Saldo a produzir das OPs abertas (planned/released/in_progress/paused): soma de max(0, quantity - quantity_produced). E o "confronto com o que ja esta em producao".';
      COMMENT ON COLUMN master_production_plan_lines.suggested_quantity IS 'Sugestao do sistema = necessidade liquida crua. SEM arredondamento de lote minimo/multiplo: politica de lote e decisao de PCP nao tomada pelo dono.';
      COMMENT ON COLUMN master_production_plan_lines.planned_quantity IS 'A DECISAO do planejador — o que de fato sera produzido. Nasce igual a sugestao e pode divergir dela; a divergencia fica visivel porque suggested_quantity nunca e sobrescrita.';
      COMMENT ON COLUMN master_production_plan_lines.status IS 'pending (sugestao nao revisada) | planned (planejador decidiu produzir) | dismissed (planejador decidiu NAO produzir) | released (OP gerada).';
      COMMENT ON COLUMN master_production_plan_lines.production_order_id IS 'FK -> production_orders.id gerada por esta linha. E o RASTRO DE ORIGEM da OP: dela se chega ao plano, ao planejador e a demanda que a justificou.';
      COMMENT ON COLUMN master_production_plan_lines.decided_by IS 'FK -> users.id de quem registrou a decisao da linha. SEMPRE do JWT.';
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('master_production_plan_lines');
    await queryInterface.dropTable('master_production_plans');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_master_production_plan_lines_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_master_production_plans_status";');
  },
};
