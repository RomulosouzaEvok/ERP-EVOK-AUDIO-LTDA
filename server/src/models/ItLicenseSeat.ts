/**
 * 💻 Model: ItLicenseSeat (Alocação de Assento de Licença)
 *
 * @module models/ItLicenseSeat
 *
 * Tabela `it_license_seats` (migration `20260807-000153`). Alocação n:n
 * leve funcionário × licença (RF-TI-025). Bloqueio de assento excedente
 * (`seats` contratado, RF-TI-026) é regra de aplicação — contagem de
 * linhas com `revoked_at IS NULL` no momento da alocação.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface ItLicenseSeatAttributes {
  id: number;
  license_detail_id: number;
  employee_id: number;
  assigned_at: Date;
  revoked_at: Date | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const ItLicenseSeat = sequelize.define<any, ItLicenseSeatAttributes>('ItLicenseSeat', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  license_detail_id: { type: DataTypes.INTEGER, allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  assigned_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  revoked_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'it_license_seats',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['license_detail_id'] },
    { fields: ['employee_id'] },
  ],
});

export = ItLicenseSeat;
