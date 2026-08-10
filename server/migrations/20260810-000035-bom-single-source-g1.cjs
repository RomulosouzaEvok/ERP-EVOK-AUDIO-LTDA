'use strict';

/**
 * G1 — Estrutura de produto (BOM) passa a ter FONTE UNICA.
 *
 * ## O que o G1 resolveu
 *
 * O ERP carregava DUAS arvores de produto paralelas, com mestres e chaves
 * diferentes, e nada reconciliava as duas:
 *
 *   - `item_estruturas` (mestre `items`, UUID) — lida pelo MRP
 *   - `bill_of_materials` (mestre `products`, INTEGER) — lida pela criacao,
 *     liberacao, consumo e CUSTEIO da ordem de producao
 *
 * A unica ponte era casamento de string (`products.code = items.codigo`), e
 * ela nunca foi exercida para estrutura. Ou seja: planejamento e consumo
 * podiam discordar sobre o que compoe um produto sem ninguem perceber.
 *
 * A decisao (2026-08-10, com o dono confirmando que NINGUEM mantinha nenhuma
 * das duas ainda — 0 linha de engenharia real, so residuo de teste e2e):
 * **`bill_of_materials` sobrevive**. Racional completo em
 * `server/src/services/bomStructureProjection.ts` e em
 * `docs/producao/06-BOM.md`.
 *
 * O MRP e a explosao de item passaram a LER a BOM ativa, projetada em UUID
 * pelo crosswalk que o resto do ERP ja usa. Nada foi copiado: a projecao e
 * de leitura, feita na hora, entao nao existe replica para dessincronizar.
 *
 * ## O que ESTA migration faz (e o que ela NAO faz)
 *
 * Ela NAO cria tabela, NAO cria coluna, NAO apaga linha e NAO faz backfill.
 * Aditiva e reversivel. Sao duas coisas:
 *
 * ### 1. `uq_bill_of_materials_active_per_product` (indice unico PARCIAL)
 *
 * So pode existir UMA BOM `active` por produto. Sem isso,
 * `BillOfMaterial.findOne({ product_id, status: 'active' })` — usada pela
 * explosao, pela reserva na liberacao da OP e pelo custeio na conclusao —
 * devolve uma revisao ARBITRARIA quando ha duas ativas. Isso reabre o G1 por
 * dentro do proprio modulo de BOM: planejamento e consumo pegando revisoes
 * diferentes do mesmo produto.
 *
 * A camada de aplicacao ja garante isso em transacao
 * (`SequelizeBOMRepository.activateExclusively`: ativar uma revisao rebaixa a
 * anterior para `superseded`, com os componentes intactos); o indice e a rede
 * de baixo — mesmo padrao do G5 (`uq_production_routes_active_per_product`) e
 * das paradas de maquina.
 *
 * ⚠️ Indice PARCIAL (`WHERE status = 'active'`) de proposito: revisoes
 * `draft`, `inactive` e `superseded` continuam podendo coexistir aos montes
 * por produto — e esse historico que sustenta o consumo e o custo das OPs ja
 * concluidas (ISO 9001 §8.5.6).
 *
 * ⚠️ Se o banco de destino ja tiver 2+ BOMs `active` do mesmo produto, a
 * criacao do indice FALHA de proposito: e dado ambiguo que pede decisao da
 * engenharia, nao correcao automatica. Consulta de diagnostico no rodape.
 *
 * (Conferido em 2026-08-10 no banco de dev: 2 BOMs ativas, de produtos
 * DIFERENTES — o indice passa.)
 *
 * ### 2. `COMMENT ON` marcando `item_estruturas` como legado congelado
 *
 * A tabela NAO e removida nesta migration. Ela guarda 4 linhas de residuo de
 * teste e nenhum dado de engenharia, mas remover tabela e passo separado
 * (fase de contracao), depois que a baseline congelada de schema existir —
 * ver `docs/database/DATABASE.md`. O que muda agora e que o banco passa a
 * DIZER que ela e legado, para o proximo a abrir o schema nao supor que ela
 * ainda vale.
 *
 * `comment:` em `addColumn` corrompe o SQL gerado neste projeto — por isso
 * tudo vai por `COMMENT ON`, como nas migrations recentes.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_bill_of_materials_active_per_product
         ON bill_of_materials (product_id)
       WHERE status = 'active';`
    );

    await queryInterface.sequelize.query(
      `COMMENT ON TABLE bill_of_materials IS 'G1 (2026-08-10): FONTE UNICA da estrutura de produto do ERP. Lida pela criacao/liberacao/conclusao de OP (reserva, consumo, custeio) e, desde o G1, tambem pelo MRP e pela explosao de item via projecao em UUID (services/bomStructureProjection). Ciclo de revisao ISO 9001 8.5.6: draft = editavel; active = vigente e IMUTAVEL no conteudo (so 1 por produto, ver uq_bill_of_materials_active_per_product); inactive = aposentada; superseded = substituida por revisao mais nova, com os componentes INTACTOS para sustentar as OPs que rodaram com ela.';`
    );

    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN bill_of_materials.revision IS 'G1: identifica a versao da estrutura. Nao pode repetir para o mesmo produto entre revisoes nao-inativas (regra G1-BOM-REV-DUP em BomService.createBOM) — sem rotulo unico nao ha como dizer contra qual versao cada OP rodou.';`
    );

    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN bill_of_materials.status IS 'G1: draft = editavel; active = vigente, conteudo congelado, no maximo 1 por produto; inactive = aposentada; superseded = substituida por revisao mais nova (terminal, intocavel).';`
    );

    await queryInterface.sequelize.query(
      `COMMENT ON TABLE item_estruturas IS 'LEGADO CONGELADO (G1, 2026-08-10). Era a segunda arvore de produto do ERP (mestre items/UUID) e alimentava o MRP em paralelo a bill_of_materials, que a producao consome e custeia. Desde o G1 NINGUEM le esta tabela: MRP e explosao de item leem a BOM ativa projetada (services/bomStructureProjection), e a escrita esta bloqueada (regra G1-ESTRUTURA-DUPLA em CreateItemStructureUseCase). Nao inserir. Remocao prevista para a fase de contracao do schema, junto com as tabelas orfas do schema PT — ver docs/database/DATABASE.md.';`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS uq_bill_of_materials_active_per_product;'
    );

    await queryInterface.sequelize.query(
      'COMMENT ON TABLE bill_of_materials IS NULL;'
    );
    await queryInterface.sequelize.query(
      'COMMENT ON COLUMN bill_of_materials.revision IS NULL;'
    );
    await queryInterface.sequelize.query(
      'COMMENT ON COLUMN bill_of_materials.status IS NULL;'
    );
    await queryInterface.sequelize.query(
      'COMMENT ON TABLE item_estruturas IS NULL;'
    );
  },
};

/*
 * Diagnostico previo (rodar ANTES de aplicar):
 *
 *   -- 1) Duas BOMs ativas do mesmo produto quebram o indice de proposito:
 *   SELECT product_id, COUNT(*) AS ativas, array_agg(id) AS boms
 *     FROM bill_of_materials
 *    WHERE status = 'active'
 *    GROUP BY product_id
 *   HAVING COUNT(*) > 1;
 *
 *   -- 2) Lacunas de catalogo: componente de BOM ativa SEM item canonico.
 *   --    Nao bloqueia a migration, mas e material invisivel para o MRP.
 *   --    Mesma consulta exposta por MrpRepository.listStructureGaps.
 *   SELECT DISTINCT p.id AS product_id, p.code
 *     FROM bill_of_materials b
 *     JOIN bill_of_material_items bi ON bi.bom_id = b.id
 *     JOIN products p ON p.id IN (b.product_id, bi.component_product_id)
 *     LEFT JOIN items i ON i.codigo = p.code
 *    WHERE b.status = 'active' AND i.id IS NULL;
 *
 *   -- 3) Residuo da arvore antiga (conferir que nao ha engenharia real la):
 *   SELECT COUNT(*) FROM item_estruturas;
 */
