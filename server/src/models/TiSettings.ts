/**
 * Model: TiSettings (Configuração de Parametrização do Módulo TI)
 *
 * @module models/TiSettings
 *
 * Tabela singleton `ti_settings` (migration `20260807-000156`, uma única
 * linha `id=1`, mesmo padrão de `ProductionCostSettings`). Cobre SLA por
 * prioridade, dias de auto-close/reabertura, janelas de alerta de licença
 * e frequência de teste de restore (RF-TI-046/RNF-TI-05) — nenhum desses
 * parâmetros é hard-coded em use case.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface TiSettingsAttributes {
  id: number;
  sla_response_minutes_low: number;
  sla_response_minutes_medium: number;
  sla_response_minutes_high: number;
  sla_response_minutes_urgent: number;
  sla_resolution_minutes_low: number;
  sla_resolution_minutes_medium: number;
  sla_resolution_minutes_high: number;
  sla_resolution_minutes_urgent: number;
  auto_close_business_days: number;
  reopen_window_days: number;
  license_alert_window_days_1: number;
  license_alert_window_days_2: number;
  license_alert_window_days_3: number;
  restore_test_max_interval_days: number;
  backup_daily_alert_hours: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const TiSettings = sequelize.define<any, TiSettingsAttributes>('TiSettings', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  sla_response_minutes_low: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1440 },
  sla_response_minutes_medium: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 240 },
  sla_response_minutes_high: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 120 },
  sla_response_minutes_urgent: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
  sla_resolution_minutes_low: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 7200 },
  sla_resolution_minutes_medium: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2880 },
  sla_resolution_minutes_high: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 480 },
  sla_resolution_minutes_urgent: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 240 },
  auto_close_business_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
  reopen_window_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 7 },
  license_alert_window_days_1: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
  license_alert_window_days_2: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 15 },
  license_alert_window_days_3: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 7 },
  restore_test_max_interval_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 31 },
  backup_daily_alert_hours: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 26 },
}, {
  tableName: 'ti_settings',
  underscored: true,
  timestamps: true,
});

export = TiSettings;
