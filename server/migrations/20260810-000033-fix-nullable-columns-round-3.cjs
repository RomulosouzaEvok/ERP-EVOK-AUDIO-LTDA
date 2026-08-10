'use strict';

/**
 * S-1 — "Bomba de schema" (allowNull implicito), TERCEIRA RODADA.
 *
 * Fecha o escopo que `20260810-000028-fix-nullable-columns-round-2.cjs`
 * deixou explicitamente para depois (ver §P1-06 daquele cabecalho: "Restam 12
 * da mesma contradicao FORA do escopo desta correcao, em `employees`,
 * `service_orders`, `assets` e `maintenance_orders` (...) merecem a propria
 * migration, com o proprio teste").
 *
 * CAUSA RAIZ (provada, nao inferida)
 * ----------------------------------
 * Nenhuma destas tabelas e criada por SQL versionado: `01_schema.sql` so cria
 * o schema PT legado (usuarios, fornecedores, items, ...). `assets`,
 * `employees`, `service_orders`, `maintenance_orders`, `departments`,
 * `bill_of_materials` e `purchase_orders` nascem de
 * `20260731-000001-baseline-schema.cjs`, que gera DDL a partir dos models
 * COMPILADOS em tempo de execucao (`DYNAMIC_MODEL_FILES` ->
 * `createTableFromModel`).
 *
 * Na versao daquela migration vigente ate `f9f03ea` (2026-08-05), o mapeador
 * fazia `allowNull: attribute.allowNull` e repassava `undefined` direto para
 * `queryInterface.createTable`. Como a forma predominante de declarar coluna
 * opcional neste projeto e a abreviada (`notes: DataTypes.TEXT`, sem a chave
 * `allowNull`), `undefined` virou `NOT NULL` no Postgres. O banco de dev foi
 * provisionado com essa versao; o `f9f03ea` corrigiu o mapeador para
 * `attribute.allowNull !== false`, mas NAO reparou o banco ja criado — ele
 * cai no atalho `shouldBootstrapCanonicalSchema` ("schema ja existe") e nunca
 * mais passa pelo `createTable`.
 *
 * Consequencia hoje, em producao-equivalente (dev):
 *  - `POST /api/assets` responde 500 em 100% dos casos. `CreateAssetUseCase`
 *    exige apenas `tag` e `name`; `product_id`, `qr_code` e
 *    `last_inventory_date` nem sequer sao repassados pelo use case, entao
 *    nenhum payload possivel satisfaz o NOT NULL.
 *  - `POST /api/employees` idem (`CreateEmployeeUseCase` exige `name`/`cpf`).
 *  - Abertura de ordem de manutencao e de ordem de servico idem.
 * As 4 tabelas estao com 0 linhas — o que e a propria evidencia de que esses
 * fluxos nunca funcionaram, mesmo padrao do "35 movimentacoes, nenhuma
 * `reference_type='adjustment'`" que denunciou a primeira rodada.
 *
 * CRITERIO COLUNA A COLUNA (identico ao da rodada 2)
 * -------------------------------------------------
 * So foi afrouxada a coluna em que as TRES camadas ja concordam que o valor e
 * opcional (definicao do model + interface de atributos TypeScript + semantica
 * da FK) e que a aplicacao legitimamente nao preenche no INSERT. Onde o dado e
 * realmente obrigatorio, o schema esta certo e quem mentia era o model — essas
 * NAO estao aqui; foram corrigidas no model para `allowNull: false` (ver
 * §"NAO afrouxadas").
 *
 * P1-06 — FKs `ON DELETE SET NULL` sobre coluna `NOT NULL`
 * --------------------------------------------------------
 * As 12 restantes do achado sao integralmente resolvidas aqui, porque todas as
 * colunas envolvidas passam a aceitar NULL:
 *   fk_assets_department_id             (assets.department_id)
 *   fk_assets_product_id                (assets.product_id)
 *   fk_assets_responsible_id            (assets.responsible_id)
 *   fk_employees_user_id                (employees.user_id)
 *   fk_maintenance_orders_created_by    (maintenance_orders.created_by)
 *   fk_maintenance_orders_diagnosed_by  (maintenance_orders.diagnosed_by)
 *   fk_maintenance_orders_reported_by   (maintenance_orders.reported_by)
 *   fk_maintenance_orders_technician_id (maintenance_orders.technician_id)
 *   fk_service_orders_created_by        (service_orders.created_by)
 *   fk_service_orders_product_id        (service_orders.product_id)
 *   fk_service_orders_responsible_id    (service_orders.responsible_id)
 *   fk_service_orders_technician_id     (service_orders.technician_id)
 *
 * NAO afrouxadas (o schema esta certo; quem divergia era o model)
 * --------------------------------------------------------------
 * Quatro colunas de data que o model ja preenche via `defaultValue:
 * DataTypes.NOW` (aplicado no cliente pelo Sequelize, por isso o INSERT nunca
 * as omite) e que a interface de atributos declara NAO-nula. Continuam
 * `NOT NULL`; os models passaram a declarar `allowNull: false`:
 *   - `purchase_orders.order_date`      — os 3 pontos de INSERT
 *     (CreatePurchaseUseCase, ConvertRequisitionToPurchaseOrders, AwardRfq)
 *     gravam `order_date: new Date()`. Pedido de compra sem data e invalido.
 *   - `maintenance_orders.report_date`  — os use cases de facilities gravam
 *     explicitamente; a data de abertura do chamado e obrigatoria.
 *   - `service_orders.entry_date`       — data de entrada do equipamento.
 *   - `bill_of_materials.revision_date` — data de efetivacao da revisao da
 *     estrutura; e o que da rastreabilidade a versao da BOM.
 *
 * FORA DE ESCOPO, deliberadamente
 * -------------------------------
 *  - `access_profile_permissions.access_profile_id`: NAO e drift de schema. O
 *    model declara `accessProfileId` com `allowNull: false` e `field:
 *    'access_profile_id'`; a associacao em `src/models/index.ts:657-658` usa
 *    `foreignKey: 'access_profile_id'` (nome da COLUNA, nao do atributo), o
 *    que faz o Sequelize criar um SEGUNDO atributo homonimo com `allowNull`
 *    default (true). O banco e o model concordam — a guarda so enxerga o
 *    atributo-fantasma. Correcao pertence a `index.ts` (em uso por outro
 *    agente nesta data). Mesmo padrao em `users.access_profile_id`.
 *  - `production_order_reservations.production_order_id`: ja tratado por
 *    `20260810-000030-generalize-stock-reservations-for-sales-g9.cjs`, que
 *    torna a coluna nullable com CHECK de exatamente-um-dono. Duplicar aqui
 *    criaria conflito de ordem entre as duas migrations.
 *
 * DOWN
 * ----
 * Mesma estrategia da rodada 2: `SET NOT NULL` so nas colunas sem nenhum NULL
 * no momento da reversao, pulando as demais com aviso. Reverter reintroduz a
 * quebra de `POST /api/assets` e `POST /api/employees`.
 */

/**
 * Colunas indevidamente NOT NULL, agrupadas por tabela, com a justificativa
 * de negocio de cada uma.
 */
const COLUMNS_TO_RELAX = {
  // Patrimonio. `CreateAssetUseCase` so exige `tag` e `name`; todo o resto do
  // cadastro e progressivo (o ativo e plaqueado primeiro, detalhado depois).
  assets: {
    description: 'descricao longa e texto livre opcional',
    product_id: 'ativo raramente corresponde a um produto do catalogo; FK ON DELETE SET NULL',
    department_id: 'ativo pode estar sem alocacao departamental; FK ON DELETE SET NULL',
    responsible_id: 'ativo pode estar sem responsavel nomeado; FK ON DELETE SET NULL',
    location: 'localizacao fisica e preenchida no inventario, nao no cadastro',
    brand: 'marca e opcional (ex.: ativo fabricado internamente)',
    model: 'modelo e opcional',
    serial_number: 'nem todo ativo tem numero de serie (moveis, ferramentas)',
    purchase_date: 'ativo doado/fabricado internamente nao tem data de compra',
    purchase_value: 'ativo sem valor de aquisicao conhecido (doacao, ativo antigo)',
    current_value: 'valor contabil so existe apos a primeira depreciacao',
    useful_life_months: 'vida util so se aplica a ativo depreciavel',
    qr_code: 'gerado sob demanda pelo servico de QR, nao no cadastro',
    notes: 'texto livre opcional',
    last_inventory_date: 'so existe apos o primeiro inventario fisico do ativo',
  },

  // RH. `CreateEmployeeUseCase` so exige `name`/`cpf` (+ `department_id`).
  // Documentacao pessoal e dado bancario sao coletados ao longo da admissao.
  employees: {
    user_id: 'nem todo funcionario tem login no ERP; FK ON DELETE SET NULL',
    rg: 'documento coletado durante a admissao, nao no cadastro inicial',
    pis_pasep: 'PIS/PASEP nao se aplica a PJ/estagiario e chega depois',
    ctps: 'CTPS nao se aplica a regime PJ',
    phone: 'contato e opcional',
    email: 'e-mail e opcional (chao de fabrica frequentemente nao tem)',
    address: 'endereco e coletado na documentacao de admissao',
    position: 'cargo pode vir de hr_job_positions (job_position_id) em vez do texto livre',
    dismissal_date: 'so existe apos o desligamento',
    bank_name: 'dado bancario e coletado depois da admissao',
    bank_agency: 'dado bancario e coletado depois da admissao',
    bank_account: 'dado bancario e coletado depois da admissao',
    pix_key: 'PIX e alternativa opcional a conta bancaria',
    education_level: 'escolaridade e opcional',
    emergency_contact: 'contato de emergencia e opcional',
    emergency_phone: 'contato de emergencia e opcional',
    notes: 'texto livre opcional',
    photo_url: 'foto e opcional e enviada em upload posterior',
  },

  // Manutencao. A ordem nasce `open` com apenas o problema relatado; tudo o
  // que descreve diagnostico, execucao e fechamento so existe depois.
  maintenance_orders: {
    reported_by: 'chamado pode nascer de rotina automatica sem usuario; FK ON DELETE SET NULL',
    diagnosed_problem: 'so existe apos a etapa de diagnostico',
    diagnosed_by: 'so existe apos o diagnostico; FK ON DELETE SET NULL',
    diagnosis_date: 'so existe apos o diagnostico',
    service_performed: 'so existe apos a execucao do servico',
    technician_id: 'tecnico so e designado quando a ordem sai de open; FK ON DELETE SET NULL',
    start_date: 'so existe quando a ordem entra em in_progress',
    completion_date: 'so existe no fechamento da ordem',
    result: 'desfecho so e conhecido no fechamento',
    notes: 'texto livre opcional',
    scheduled_date: 'so se aplica a manutencao preventiva agendada',
    frequency_days: 'so se aplica a manutencao preventiva recorrente',
    next_maintenance_date: 'so se aplica a manutencao preventiva recorrente',
    created_by: 'ordem gerada por rotina automatica nao tem autor; FK ON DELETE SET NULL',
  },

  // Assistencia tecnica. A OS nasce `open` com o relato do cliente; o resto
  // do ciclo (diagnostico -> execucao -> entrega) preenche progressivamente.
  service_orders: {
    product_id: 'equipamento pode nao ser do catalogo (assistencia de terceiro); FK ON DELETE SET NULL',
    equipment_description: 'texto livre usado quando nao ha product_id',
    reported_issue: 'relato do cliente pode ser registrado depois da abertura',
    diagnosed_issue: 'so existe apos a etapa de diagnostico',
    service_performed: 'so existe apos a execucao do servico',
    completion_date: 'so existe na conclusao do servico',
    delivery_date: 'so existe na entrega ao cliente',
    technician_id: 'tecnico so e designado quando a OS sai de open; FK ON DELETE SET NULL',
    responsible_id: 'responsavel comercial e opcional; FK ON DELETE SET NULL',
    notes: 'texto livre opcional',
    created_by: 'OS pode nascer de integracao sem usuario; FK ON DELETE SET NULL',
  },

  // Estrutura organizacional. O seed oficial preenche `description`, mas ela
  // e texto livre: `DepartmentAttributes.description` e `string | null` e o
  // cadastro manual de subarea nao exige descricao.
  departments: {
    description: 'descricao do departamento e texto livre opcional',
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
            `[20260810-000033] ${table}.${column}: ${nulls} linha(s) com NULL — ` +
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
