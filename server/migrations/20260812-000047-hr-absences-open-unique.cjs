'use strict';

/**
 * Achado de auditoria de arquitetura (2026-08-12, módulo `rh/` — extensão de
 * afastamentos do Bloco 6): `CreateAbsenceUseCase.execute` chama
 * `findOpenByEmployeeId` e só então decide se lança `ConflictError`, mas essa
 * garantia de "no máximo um afastamento aberto por funcionário" vivia só na
 * aplicação. O índice existente (`idx_hr_absences_employee_open`, migration
 * `20260808-000020`) é comum, não único — sob READ COMMITTED (padrão do
 * Postgres), duas requisições concorrentes de afastamento para o mesmo
 * funcionário podem passar a checagem antes de qualquer commit e gerar dois
 * afastamentos abertos simultâneos, o que corrompe `ReturnFromAbsenceUseCase`
 * (que assume no máximo um afastamento aberto para saber quanto reativar de
 * benefício).
 *
 * Mesmo padrão já usado em `production_routes` (G5,
 * `20260810-000034-production-route-active-unique-g5.cjs`): índice único
 * PARCIAL, não uma coluna nova. Migration puramente aditiva e reversível.
 *
 * ⚠️ Se o banco de destino já tiver 2+ afastamentos abertos (`actual_end_date
 * IS NULL`) para o mesmo funcionário, a criação do índice FALHA de propósito
 * — é um dado ambíguo que precisa de decisão humana do RH (qual afastamento
 * está de fato em curso), não de correção automática. Diagnóstico no
 * comentário ao final deste arquivo.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_absences_employee_open
         ON hr_absences (employee_id)
       WHERE actual_end_date IS NULL;`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS uq_hr_absences_employee_open;'
    );
  },
};

/*
 * Diagnostico previo (rodar ANTES de aplicar, se o banco ja tiver afastamentos):
 *
 *   SELECT employee_id, COUNT(*) AS abertos, array_agg(id) AS afastamentos
 *     FROM hr_absences
 *    WHERE actual_end_date IS NULL
 *    GROUP BY employee_id
 *   HAVING COUNT(*) > 1;
 *
 * Se retornar linhas, decidir com o RH qual afastamento continua aberto e
 * encerrar (`actual_end_date`) os demais ANTES de aplicar esta migration.
 */
