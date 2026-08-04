/**
 * 🔊 Model: AcousticTestResult (Resultados de Teste Acústico)
 *
 * @module models/AcousticTestResult
 *
 * Registra os resultados de testes de laboratório (impedância, resposta em
 * frequência, THD, potência RMS/pico, vida útil, polaridade, ruído e
 * parâmetros Thiele-Small) realizados sobre produtos/lotes/números de série,
 * com comparação contra especificação (min/max) e vínculo opcional com
 * não-conformidade quando reprovado.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface AcousticTestResultAttributes {
  id: number;
  product_id: number;
  serial_number: string | null;
  lot_number: string | null;
  production_order_id: number | null;
  test_type:
    | 'impedance'
    | 'frequency_response'
    | 'thd'
    | 'power_rms'
    | 'power_peak'
    | 'life'
    | 'polarity'
    | 'noise'
    | 'thiele_small';
  test_date: Date;
  tester_id: number;
  parameters: Record<string, unknown> | null;
  result: number | null;
  unit: string | null;
  specification_min: number | null;
  specification_max: number | null;
  passed: boolean;
  curve_data: Record<string, unknown> | null;
  notes: string | null;
  non_conformity_id: number | null;
  /**
   * Quantidade consumida (destruída) do produto testado, em teste
   * destrutivo. Quando informada (> 0), é debitada automaticamente do
   * Depósito LABORATORIO na MESMA transação do registro do teste
   * (Bloco 4, UC-42-E). `null`/`0` para testes não destrutivos.
   */
  consumed_quantity: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const AcousticTestResult = sequelize.define('AcousticTestResult', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → products.id' },
  serial_number: { type: DataTypes.STRING(50), allowNull: true },
  lot_number: { type: DataTypes.STRING(80), allowNull: true },
  production_order_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → production_orders.id' },
  test_type: {
    type: DataTypes.ENUM(
      'impedance',
      'frequency_response',
      'thd',
      'power_rms',
      'power_peak',
      'life',
      'polarity',
      'noise',
      'thiele_small'
    ),
    allowNull: false,
  },
  test_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  tester_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → users.id (técnico responsável pelo teste)' },
  parameters: { type: DataTypes.JSONB, allowNull: true, comment: 'Parâmetros do teste (ex.: Thiele-Small)' },
  result: { type: DataTypes.DECIMAL(12, 4), allowNull: true },
  unit: { type: DataTypes.STRING(20), allowNull: true },
  specification_min: { type: DataTypes.DECIMAL(12, 4), allowNull: true },
  specification_max: { type: DataTypes.DECIMAL(12, 4), allowNull: true },
  passed: { type: DataTypes.BOOLEAN, allowNull: false },
  curve_data: { type: DataTypes.JSONB, allowNull: true, comment: 'Dados de curva (ex.: frequência x SPL)' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  non_conformity_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → non_conformities.id (quando reprovado)' },
  consumed_quantity: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: true,
    comment: 'Quantidade consumida (destruída) do produto testado, debitada automaticamente do Depósito LABORATORIO na mesma transação do registro do teste (UC-42-E).',
  },
}, {
  tableName: 'acoustic_test_results',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['product_id'], name: 'idx_acoustic_test_results_product_id' },
    { fields: ['test_type'], name: 'idx_acoustic_test_results_test_type' },
    { fields: ['test_date'], name: 'idx_acoustic_test_results_test_date' },
    { fields: ['passed'], name: 'idx_acoustic_test_results_passed' },
    { fields: ['serial_number'], name: 'idx_acoustic_test_results_serial_number' },
  ],
});

export = AcousticTestResult;
