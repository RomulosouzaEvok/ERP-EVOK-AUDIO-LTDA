'use strict';

/**
 * G5 — API de Roteiro de Producao (`production_routes` /
 * `production_route_steps`).
 *
 * As DUAS tabelas ja existiam (criadas por sync na baseline
 * `20260731-000001`, FKs em `05_add_critical_foreign_keys.sql`) e ja eram
 * LIDAS pelo custeio de mao-de-obra, pela carga-maquina e pelo OEE — o que
 * nao existia era API para cadastra-las. Esta migration NAO cria tabela nem
 * coluna: ela apenas coloca no banco a UNICA regra estrutural que o novo
 * ciclo de vida do roteiro passou a exigir, mais documentacao de coluna.
 *
 * ## 1. `uq_production_routes_active_per_product` (indice unico PARCIAL)
 *
 * So pode existir UM roteiro `active` por produto. Sem isso, dois roteiros
 * ativos do mesmo produto fazem
 * `SequelizeWorkCenterRepository.aggregateLoadByWorkCenter` (que junta
 * `production_routes` por `product_id`) somar a carga duas vezes, e deixam
 * indefinido qual roteiro a fabrica deve executar.
 *
 * O use case ja garante isso em transacao (ativar uma revisao torna a
 * anterior `superseded`, com lock pessimista); o indice e a rede de baixo,
 * no mesmo padrao ja adotado para paradas de maquina
 * (`production_downtimes`, 2026-08-06).
 *
 * ⚠️ Indice PARCIAL (`WHERE status = 'active'`) de proposito: revisoes
 * `draft`, `inactive` e `superseded` continuam podendo coexistir aos montes
 * para o mesmo produto — e exatamente esse historico que preserva o roteiro
 * que as OPs ja abertas usaram.
 *
 * ⚠️ Se o banco de destino ja tiver 2+ roteiros `active` para o mesmo
 * produto, a criacao do indice FALHA (comportamento desejado: e um dado
 * ambiguo que precisa de decisao humana, nao de correcao automatica). A
 * consulta para diagnosticar esta no bloco de comentario ao final deste
 * arquivo.
 *
 * ## 2. `COMMENT ON COLUMN` de `production_routes.status` e `.revision`
 *
 * `comment:` em `addColumn` corrompe o SQL gerado neste projeto — por isso
 * os comentarios vao por `COMMENT ON COLUMN`, como nas migrations recentes.
 *
 * NENHUMA coluna e adicionada, alterada ou removida. Migration puramente
 * aditiva e reversivel.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_production_routes_active_per_product
         ON production_routes (product_id)
       WHERE status = 'active';`
    );

    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN production_routes.status IS 'G5: ciclo de vida do roteiro. draft = editavel; active = liberado e CONGELADO (so 1 por produto, ver uq_production_routes_active_per_product); inactive = aposentado (reversivel); superseded = substituido por revisao mais nova (final).';`
    );

    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN production_routes.revision IS 'G5: revisao do roteiro, unica por produto (indice unico product_id+revision). Alterar roteiro liberado exige NOVA revisao (POST /api/production/routes/:id/revise), preservando as etapas que as OPs em andamento referenciam.';`
    );

    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN production_routes.total_standard_time_minutes IS 'G5: soma de standard_time_minutes das etapas ATIVAS (tempo padrao por unidade). NAO inclui setup_time_minutes, que e tempo por lote — mesma convencao do OEE (GetOeeReportUseCase).';`
    );

    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN production_route_steps.sequence IS 'G5: ordem da operacao, obrigatoriamente 1..N contigua e sem repeticao dentro do roteiro (validada em productionRouteRules.normalizeAndValidateSteps; unicidade tambem no indice production_route_steps(production_route_id, sequence)).';`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS uq_production_routes_active_per_product;'
    );

    await queryInterface.sequelize.query(
      'COMMENT ON COLUMN production_routes.status IS NULL;'
    );
    await queryInterface.sequelize.query(
      'COMMENT ON COLUMN production_routes.revision IS NULL;'
    );
    await queryInterface.sequelize.query(
      'COMMENT ON COLUMN production_routes.total_standard_time_minutes IS NULL;'
    );
    await queryInterface.sequelize.query(
      'COMMENT ON COLUMN production_route_steps.sequence IS NULL;'
    );
  },
};

/*
 * Diagnostico previo (rodar ANTES de aplicar, se o banco ja tiver roteiros):
 *
 *   SELECT product_id, COUNT(*) AS ativos, array_agg(route_code) AS roteiros
 *     FROM production_routes
 *    WHERE status = 'active'
 *    GROUP BY product_id
 *   HAVING COUNT(*) > 1;
 *
 * Se retornar linhas, decidir com o PCP qual revisao continua ativa e mover
 * as demais para 'superseded' ANTES de aplicar esta migration.
 */
