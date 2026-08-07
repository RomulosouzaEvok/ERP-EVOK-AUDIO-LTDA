'use strict';

/**
 * BLOCO 2 TI — RF-TI-046/RNF-TI-05, resolução do conflito de parametrização
 * apontado pela auditoria cruzada (`docs/business/BLOCO_2_TI_AUDITORIA.md`,
 * achado #1).
 *
 * DECISÃO REVISADA: o `AdmDBA` original decidiu "sem tabela, configuração de
 * aplicação", citando como precedente RF-SST-019 (Bloco 1 SST). Essa citação
 * não se sustenta: RF-SST-019 nunca foi de fato implementado em código (nenhum
 * mecanismo de configuração para o prazo do ASO demissional existe em
 * `server/src/modules/sst/` na data desta auditoria — é uma decisão apenas
 * documentada, não um padrão testado). Em contraste, o projeto TEM um
 * precedente real e em produção para exatamente este problema: a tabela
 * singleton `production_cost_settings` (ver `server/src/models/ProductionCostSettings.ts`,
 * migration `20260804-000008`), com colunas tipadas fixas (não chave/valor
 * genérico) para parâmetros de negócio configuráveis sem deploy.
 *
 * O módulo TI tem uma superfície de parametrização bem maior que o caso
 * pontual de SST (RF-TI-046: SLA de 1ª resposta/resolução por prioridade — 4
 * níveis x 2 métricas —, dias de auto-close, dias de reabertura, janelas de
 * alerta de vencimento de licença, frequência mínima de teste de restore),
 * usada por múltiplos use-cases (`CreateTicketUseCase`, `CloseTicketUseCase`,
 * `ReopenTicketUseCase`, `ListExpiringLicensesUseCase`,
 * `CheckBackupHealthUseCase`). Uma tabela singleton dá auditabilidade
 * (created_at/updated_at) e futura tela administrativa, seguindo o padrão já
 * comprovado de `production_cost_settings` em vez de reintroduzir a decisão
 * não testada de SST.
 *
 * Singleton (uma única linha, id=1, mesmo padrão de `production_cost_settings`/
 * `CompanyFiscalConfig`). Seed da linha única é responsabilidade do
 * `programador` (idempotente, mesmo padrão de outras tabelas singleton).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ti_settings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      sla_response_minutes_low: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1440 },
      sla_response_minutes_medium: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 240 },
      sla_response_minutes_high: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 120 },
      sla_response_minutes_urgent: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 },
      sla_resolution_minutes_low: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 7200 },
      sla_resolution_minutes_medium: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 2880 },
      sla_resolution_minutes_high: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 480 },
      sla_resolution_minutes_urgent: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 240 },
      auto_close_business_days: {
        type: Sequelize.INTEGER, allowNull: false, defaultValue: 3,
        comment: 'Dias úteis para auto-close de chamado resolved sem confirmação (RF-TI-011/BR-TI-006)',
      },
      reopen_window_days: {
        type: Sequelize.INTEGER, allowNull: false, defaultValue: 7,
        comment: 'Dias corridos após closed_at em que a reabertura ainda é permitida (RF-TI-006/BR-TI-003)',
      },
      license_alert_window_days_1: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 },
      license_alert_window_days_2: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 15 },
      license_alert_window_days_3: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 7 },
      restore_test_max_interval_days: {
        type: Sequelize.INTEGER, allowNull: false, defaultValue: 31,
        comment: 'Frequência mínima de teste de restore antes de alertar (RF-TI-042/BR-TI-018)',
      },
      backup_daily_alert_hours: {
        type: Sequelize.INTEGER, allowNull: false, defaultValue: 26,
        comment: 'Horas sem backup daily bem-sucedido antes de alertar (RF-TI-041/BR-TI-017)',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE ti_settings ADD CONSTRAINT ck_ti_settings_singleton CHECK (id = 1);
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ti_settings');
  },
};
