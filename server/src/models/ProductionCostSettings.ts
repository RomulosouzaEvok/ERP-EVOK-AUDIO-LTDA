/**
 * Model: ProductionCostSettings (Configuracao de Custeio de Producao)
 *
 * @module models/ProductionCostSettings
 *
 * Tabela singleton (uma unica linha, id=1, mesmo padrao de
 * `CompanyFiscalConfig`) com a configuracao global de rateio de overhead
 * (despesas indiretas de fabrica) usada no custeio real de producao, alem de
 * uma taxa de mao-de-obra de fallback para etapas de rota sem
 * `work_center_id` estruturado.
 *
 * Decisao de modelagem (roadmap pos-Go-Live, item 7/9 LEVANTAMENTO_ERP): uma
 * taxa global simples e configuravel, sem sistema completo de centros de
 * custo — ver docs/DATABASE.md para o racional e o contrato de uso pelo
 * proximo agente (calculo de custeio).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type OverheadCalculationBasis = 'material_labor' | 'labor_only' | 'material_only';

interface ProductionCostSettingsAttributes {
  id: number;
  overhead_calculation_basis: OverheadCalculationBasis;
  overhead_rate_percent: number;
  default_labor_rate_per_hour: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ProductionCostSettings = sequelize.define('ProductionCostSettings', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  overhead_calculation_basis: {
    type: DataTypes.ENUM('material_labor', 'labor_only', 'material_only'),
    allowNull: false,
    defaultValue: 'material_labor',
    comment: 'Base de calculo do rateio de overhead: material+mao-de-obra, so mao-de-obra, ou so material'
  },
  overhead_rate_percent: {
    type: DataTypes.DECIMAL(9, 6),
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0, max: 1000 },
    comment: 'Percentual de rateio de overhead aplicado sobre a base escolhida (ex.: 25.5 = 25,5%)'
  },
  default_labor_rate_per_hour: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
    comment: 'Taxa de mao-de-obra/h de fallback quando a etapa da rota nao tem work_center_id vinculado'
  }
}, {
  tableName: 'production_cost_settings',
  underscored: true,
  timestamps: true
});

export = ProductionCostSettings;
