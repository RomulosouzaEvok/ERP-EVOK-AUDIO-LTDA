'use strict';

/**
 * S-1 — "Bomba de schema" (allowNull implicito), SEGUNDA RODADA.
 *
 * Contexto
 * --------
 * Mesma classe de defeito ja corrigida uma vez para `production_orders` em
 * `20260804-000012-fix-production-orders-nullable-columns.cjs`. Historico:
 * o schema fisico deste banco nasceu de um `sequelize.sync`/bootstrap antigo
 * que traduzia "model nao declara allowNull" para `NOT NULL` no Postgres.
 * Resultado: dezenas de colunas legitimamente opcionais (o model TypeScript,
 * a interface de atributos e ate as FKs `ON DELETE SET NULL` as tratam como
 * nullable) ficaram `NOT NULL` SEM DEFAULT no banco.
 *
 * Observacao importante sobre o bootstrap canonico: hoje
 * `20260731-000001-baseline-schema.cjs:148` usa
 * `allowNull: attribute.allowNull !== false`, ou seja, um banco criado do
 * zero nasce com essas colunas NULLABLE. O defeito NAO e recriado pelo
 * bootstrap atual — mas o banco novo fica DIFERENTE do banco de dev, que e a
 * origem do achado de governanca "o banco de teste esta mais quebrado que o
 * de dev" (VALIDACAO_CADEIA_PRODUTO_2026-08-10.md §5). Esta migration
 * converge os dois, e na mesma entrega os models passam a declarar
 * `allowNull` EXPLICITO em todas as colunas tocadas, para que o bootstrap
 * produza exatamente este schema.
 *
 * Efeito pratico do defeito (tudo respondendo HTTP 500 hoje, 100% das vezes):
 *  - `POST /api/engineering/bom`   -> BUG-01 / P0-05
 *  - `POST /api/clients`           -> BUG-02 (nenhum cliente pode ser criado)
 *  - `POST /api/sales`             -> BUG-03 (nenhum pedido de venda)
 *  - `PUT /api/sales/:id/status` (confirmed) -> BUG-04 (conta a receber)
 *  - `POST /api/inventory/counts`  -> P0-05 (contagem de inventario)
 *  - `POST /api/inventory/movements`, aprovacao de contagem e TODO o app
 *    mobile -> P0-01 (`InventoryService.adjust` grava `reference_id` nulo)
 *
 * Agravante: o gap G2 (commit 5ec0651) passou a exigir BOM ativa para
 * concluir OP. Como criar BOM era impossivel, a cadeia do produto ficou
 * fechada em circuito.
 *
 * Referencias:
 *  - docs/governance/auditorias/AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md
 *    (achados P0-01, P0-02, P0-05, P1-06 e recomendacao S-1)
 *  - docs/governance/VALIDACAO_CADEIA_PRODUTO_2026-08-10.md (BUG-01 a BUG-04)
 *
 * Criterio usado coluna a coluna
 * ------------------------------
 * So foi afrouxada a coluna em que as TRES camadas ja concordam que o valor
 * e opcional (model Sequelize + interface de atributos + semantica da FK) e
 * em que a aplicacao legitimamente NAO preenche o campo no momento do
 * INSERT. Coluna que a aplicacao sempre preenche NAO foi afrouxada — nesses
 * casos quem estava errado era o model, e o model foi corrigido para
 * `allowNull: false` (ver §"NAO afrouxadas" no fim deste cabecalho).
 *
 * P1-06 — FKs `ON DELETE SET NULL` sobre coluna `NOT NULL`
 * --------------------------------------------------------
 * Contradicao que o Postgres aceita na criacao e so denuncia no DELETE do
 * pai. As 5 que existiam dentro do escopo desta migration sao resolvidas
 * aqui, porque a coluna passa a aceitar NULL:
 *   fk_bom_items_parent_item_id          (bill_of_material_items.parent_item_id)
 *   fk_bom_items_alternative_product_id  (bill_of_material_items.alternative_product_id)
 *   fk_inventory_counts_approved_by      (inventory_counts.approved_by)
 *   fk_inventory_count_items_counted_by  (inventory_count_items.counted_by)
 *   fk_accounts_receivable_sale_id       (accounts_receivable.sale_id)
 * Restam 12 da mesma contradicao FORA do escopo desta correcao, em
 * `employees`, `service_orders`, `assets` e `maintenance_orders` (todas com
 * o model declarando `| null`). Nao foram tocadas aqui de proposito: sao de
 * modulos que esta entrega nao consegue validar por API, e as 4 tabelas
 * estao com 0 linhas — merecem a propria migration, com o proprio teste.
 *
 * NAO afrouxadas (o schema esta certo; quem divergia era o model)
 * --------------------------------------------------------------
 *  - `inventory_movements.description`: `createMovement` sempre grava
 *    (`data.description ?? ''`) e os 2 unicos pontos de INSERT da tabela
 *    preenchem. Continua NOT NULL; o model passou a `allowNull: false`.
 *  - `inventory_movements.reference_type`: todo movimento tem categoria de
 *    origem, e todos os chamadores vivos passam o valor. Continua NOT NULL;
 *    o model passou a `allowNull: false`. (O fallback invalido de ENUM
 *    'reservation'/'reservation_release' em `inventoryService.ts:476,573` e
 *    outro achado — P1-03/S-2 — e nao e resolvido por schema.)
 *  - `clients.phone|email|notes|status|ind_final|ind_ie`,
 *    `sales.notes|status|payment_method|installments|discount|nfe_status`,
 *    `accounts_receivable.installment|status|interest|fine|discount|
 *    collection_status|amount_paid`, `inventory_count_items.system_quantity|
 *    status`, `inventory_counts.status|count_type`, e todas as colunas com
 *    DEFAULT de `bill_of_material_items`: sao NOT NULL **com DEFAULT**, logo
 *    nunca quebram um INSERT que as omite. Ficam como estao.
 *  - Chaves e valores de negocio obrigatorios de verdade
 *    (`sales.customer_id/user_id/total_amount`, `clients.name/cpf_cnpj`,
 *    `inventory_counts.count_number/created_by`,
 *    `accounts_receivable.customer_id/amount/due_date`,
 *    `bill_of_material_items.bom_id/component_product_id`,
 *    `inventory_movements.product_id/user_id/type/quantity`): mantidas.
 *
 * DOWN
 * ----
 * O `down` reaplica `SET NOT NULL` **apenas nas colunas que estiverem sem
 * nenhum NULL** no momento da reversao, e pula (com aviso) as demais. Isso o
 * torna sempre executavel, ao contrario do `down` de 20260804-000012, que
 * estouraria assim que o sistema voltasse a operar normalmente. Reverter
 * esta migration reintroduz os 6 bugs P0 acima — nao ha motivo real para
 * faze-lo.
 */

/**
 * Colunas indevidamente NOT NULL, agrupadas por tabela, com a justificativa
 * de negocio de cada uma.
 */
const COLUMNS_TO_RELAX = {
  // BUG-01 / P0-05 — criar estrutura de produto.
  bill_of_material_items: {
    // Auto-relacionamento hierarquico: componente de 1o nivel NAO tem pai.
    // Model: `defaultValue: null`. FK `fk_bom_items_parent_item_id` e SET NULL.
    parent_item_id: 'componente de primeiro nivel nao tem item pai',
    // Substituto aprovado, opcional. `bomService.ts` grava
    // `item.alternative_product_id || null`. FK tambem e SET NULL.
    alternative_product_id: 'produto substituto e opcional na estrutura',
    // Texto livre. `bomService.ts` grava `item.notes || null`.
    notes: 'observacao do item da estrutura e texto livre opcional',
  },

  // P0-05 — criar contagem de inventario (a contagem nasce `draft`).
  inventory_counts: {
    location: 'area fisica e opcional (o model ja documenta "(opcional)")',
    started_at: 'so existe quando a contagem sai de draft para counting',
    completed_at: 'so existe quando a contagem vai para pending_approval',
    approved_at: 'so existe na aprovacao/rejeicao',
    approved_by: 'so existe na aprovacao/rejeicao; FK e ON DELETE SET NULL',
    notes: 'texto livre opcional',
  },

  // P0-05 — item de contagem nasce `pending`, sem nada contado.
  inventory_count_items: {
    counted_quantity: 'preenchido so no apontamento fisico da contagem',
    variance_quantity: 'derivado; so existe apos a contagem fisica',
    counted_by: 'quem contou so e conhecido no apontamento; FK ON DELETE SET NULL',
    counted_at: 'quando contou so e conhecido no apontamento',
    notes: 'texto livre opcional',
  },

  // P0-01 / P0-02 — ajuste manual, aprovacao de contagem e app mobile.
  inventory_movements: {
    // `InventoryService.adjust()` nao recebe nem repassa referenceId: um
    // ajuste manual/contagem/consumo predial NAO tem documento de origem.
    // Coluna e polimorfica (nao tem FK), pareada com reference_type.
    reference_id: 'ajuste manual/contagem/scan mobile nao tem documento de origem',
  },

  // BUG-03 / P0-05 — criar pedido de venda.
  sales: {
    nfe_number: 'preenchido so na emissao da NF-e (POST /api/sales/:id/nfe)',
    nfe_key: 'preenchido so na autorizacao da NF-e',
  },

  // BUG-02 — criar cliente. Todas estas sao declaradas `| null` na interface
  // `ClientAttributes` e nenhuma delas e sequer aceita pelo
  // `createClientSchema` (`.strict()`), no caso de `cnae`.
  clients: {
    cep: 'endereco e opcional no cadastro (model declara nullable)',
    street: 'endereco e opcional no cadastro',
    number: 'endereco e opcional no cadastro',
    complement: 'complemento e opcional por definicao',
    neighborhood: 'endereco e opcional no cadastro',
    city: 'endereco e opcional no cadastro',
    state: 'UF e opcional no cadastro',
    tax_regime: 'regime tributario so se aplica a pessoa juridica',
    ie: 'inscricao estadual so se aplica a contribuinte de ICMS',
    im: 'inscricao municipal so se aplica a prestador de servico',
    // ATENCAO: `cnae` NAO e aceito por `createClientSchema` (.strict()) —
    // nao existe payload capaz de preencher esta coluna hoje. Ela e
    // classificacao de atividade economica de PESSOA JURIDICA e nao faz
    // sentido para cliente PF. Afrouxar aqui apenas restaura o desenho
    // declarado no model; a pergunta de negocio "o cadastro de cliente deve
    // passar a coletar CNAE?" continua aberta para AnalistaNegocios.
    cnae: 'nao e coletado por nenhum endpoint; so se aplica a pessoa juridica',
  },

  // BUG-04 — confirmar venda (geracao da parcela de contas a receber).
  accounts_receivable: {
    payment_date: 'a parcela nasce pending; data de pagamento so existe na baixa',
    payment_method: 'forma de pagamento so e conhecida na baixa',
    invoice_number: 'numero da fatura/NF e opcional na geracao da parcela',
    barcode: 'codigo de barras de boleto e opcional',
    pix_key: 'chave PIX e opcional',
    protest_date: 'so existe se a parcela for protestada',
    negativation_date: 'so existe se houver negativacao',
    notes: 'texto livre opcional',
    // P1-06: `fk_accounts_receivable_sale_id` e ON DELETE SET NULL sobre uma
    // coluna NOT NULL. Nenhum caminho de codigo cria conta a receber sem
    // venda hoje (os 4 pontos de INSERT sao do modulo `sales`), entao isto
    // NAO habilita recebivel avulso — apenas torna o SET NULL executavel.
    sale_id: 'FK ON DELETE SET NULL exige coluna nullable (P1-06)',
  },
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const [table, columns] of Object.entries(COLUMNS_TO_RELAX)) {
      for (const column of Object.keys(columns)) {
        await queryInterface.sequelize.query(
          `ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP NOT NULL;`
        );
      }
    }
  },

  async down(queryInterface) {
    for (const [table, columns] of Object.entries(COLUMNS_TO_RELAX)) {
      for (const column of Object.keys(columns)) {
        const [rows] = await queryInterface.sequelize.query(
          `SELECT count(*)::int AS nulls FROM "${table}" WHERE "${column}" IS NULL;`
        );
        const nulls = Number(rows[0] && rows[0].nulls) || 0;

        if (nulls > 0) {
          console.log(
            `[20260810-000028] ${table}.${column}: ${nulls} linha(s) com NULL — ` +
              'SET NOT NULL pulado (reaplicar destruiria dado valido).'
          );
          continue;
        }

        await queryInterface.sequelize.query(
          `ALTER TABLE "${table}" ALTER COLUMN "${column}" SET NOT NULL;`
        );
      }
    }
  },
};
