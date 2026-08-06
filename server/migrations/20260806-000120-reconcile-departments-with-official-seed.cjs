'use strict';

/**
 * Reconciliação da tabela `departments` com a fonte de verdade oficial do
 * projeto (`server/src/config/seeds.ts` → `DEPARTMENTS`, 17 registros,
 * códigos 01–17).
 *
 * ORIGEM DO PROBLEMA (ver docs/database/AUDITORIA_DEPARTAMENTOS_2026-08-06.md):
 * a auditoria de 2026-08-06 encontrou a tabela `departments` **vazia** (0
 * linhas) no banco `erp_evok_audio` local, apesar de `users` já ter 54
 * linhas (a maioria fixtures de teste RBAC/e2e criadas por scripts que
 * bateram na API local, ex.: "Almoxarife RBAC", "Vendedor Sem Produtos").
 * Como `seedDatabase()` só popula `departments`/`Category` quando
 * `User.count() === 0`, e o admin (`users.id=1`) já existe desde
 * 2026-07-31, o seed nunca mais roda automaticamente neste banco — ou os
 * 17 departamentos nunca chegaram a ser inseridos, ou foram apagados
 * manualmente depois (não há como determinar qual dos dois via logs, a
 * tabela não tem trilha de auditoria própria). De qualquer forma, hoje o
 * banco não reflete o seed oficial nem os docs.
 *
 * Esta migration é a correção do LADO DO BANCO: insere/atualiza os 17
 * departamentos exatamente como definidos em `seeds.ts`, de forma
 * idempotente (`ON CONFLICT (code) DO UPDATE`), sem tocar em
 * `manager_id`/`cost_center_id` (ficam preservados se já setados
 * manualmente, ou NULL se o registro é novo). NÃO insere os departamentos
 * "extras" que só existem nos docs hoje (Contabilidade, Controladoria,
 * Tesouraria, Laboratório de Testes, Garantia da Qualidade, Comércio
 * Exterior) — a decisão de criar essas unidades como registros reais em
 * `departments` (com seus próprios `code`) é de negócio/produto, não uma
 * correção de divergência; documentado como pendência no relatório de
 * auditoria para decisão do dono do produto.
 *
 * ATENÇÃO: aplicar apenas após aprovação explícita (ver relatório). O
 * `down()` remove exclusivamente os 17 códigos oficiais e apenas se não
 * houver nenhuma linha dependente (employees/assets/purchase_requisitions
 * apontando para eles) — hoje (2026-08-06) essas tabelas estão vazias/sem
 * FK para department_id nesses códigos, então o rollback é seguro no
 * ambiente atual.
 */

/** @type {import('sequelize-cli').Migration} */

const DEPARTMENTS = [
  { code: '01', name: 'Diretoria', sigla: 'DIR', description: 'Gestão estratégica' },
  { code: '02', name: 'Recursos Humanos', sigla: 'RH', description: 'Administração de pessoal' },
  { code: '03', name: 'Engenharia do Produto', sigla: 'ENG', description: 'P&D de auto-falantes' },
  { code: '04', name: 'PCP', sigla: 'PCP', description: 'Planejamento e Controle da Produção' },
  { code: '05', name: 'Produção', sigla: 'PROD', description: 'Fabricação' },
  { code: '06', name: 'Almoxarifado', sigla: 'ALM', description: 'Estoque de insumos' },
  { code: '07', name: 'Compras', sigla: 'COMP', description: 'Suprimentos' },
  { code: '08', name: 'Vendas', sigla: 'VEND', description: 'Comercial' },
  { code: '09', name: 'Financeiro', sigla: 'FIN', description: 'Gestão financeira' },
  { code: '10', name: 'Qualidade', sigla: 'QUAL', description: 'Controle qualidade' },
  { code: '11', name: 'Expedição', sigla: 'EXP', description: 'Logística' },
  { code: '12', name: 'Manutenção', sigla: 'MANUT', description: 'Manutenção industrial' },
  { code: '13', name: 'TI', sigla: 'TI', description: 'Tecnologia da informação' },
  { code: '14', name: 'Marketing', sigla: 'MKT', description: 'Comunicação e branding' },
  { code: '15', name: 'Segurança do Trabalho', sigla: 'SST', description: 'Segurança ocupacional' },
  { code: '16', name: 'Jurídico', sigla: 'JUR', description: 'Assessoria jurídica' },
  { code: '17', name: 'Facilities', sigla: 'FAC', description: 'Serviços gerais' },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    for (const dept of DEPARTMENTS) {
      // Idempotente e seguro para reexecução: usa a PK/UNIQUE real (code)
      // via INSERT ... ON CONFLICT em SQL cru, porque queryInterface.bulkInsert
      // não suporta upsert diretamente em todas as versões do dialeto pg
      // usadas aqui sem `updateOnDuplicate` (que exige unique constraint
      // explícita — `code` já é UNIQUE no schema, então isso funciona).
      await queryInterface.sequelize.query(
        `INSERT INTO departments (code, name, sigla, description, active, created_at, updated_at)
         VALUES (:code, :name, :sigla, :description, true, :now, :now)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           sigla = EXCLUDED.sigla,
           description = EXCLUDED.description,
           active = true,
           updated_at = EXCLUDED.updated_at`,
        {
          replacements: { ...dept, now },
        }
      );
    }
  },

  async down(queryInterface, Sequelize) {
    const codes = DEPARTMENTS.map((d) => d.code);
    await queryInterface.sequelize.query(
      `DELETE FROM departments WHERE code IN (:codes)
         AND id NOT IN (SELECT DISTINCT department_id FROM employees WHERE department_id IS NOT NULL)
         AND id NOT IN (SELECT DISTINCT department_id FROM assets WHERE department_id IS NOT NULL)
         AND id NOT IN (SELECT DISTINCT department_id FROM purchase_requisitions WHERE department_id IS NOT NULL)`,
      { replacements: { codes } }
    );
  },
};
