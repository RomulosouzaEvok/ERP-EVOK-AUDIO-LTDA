import { DataTypes, Model, Sequelize } from 'sequelize';

import { sequelize } from '../config/database';

export class IdempotencyKey extends Model {
  declare key: string;
  declare requestHash: string;
  declare status: string;
  declare statusCode?: number | null;
  declare responseBody?: any;
  declare createdAt: Date;
  declare completedAt?: Date | null;
}

export function initIdempotencyModel(sequelizeInstance: Sequelize = sequelize) {
  IdempotencyKey.init(
    {
      key: {
        type: DataTypes.STRING(255),
        primaryKey: true,
      },
      requestHash: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('in_progress', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'in_progress',
      },
      statusCode: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      responseBody: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize: sequelizeInstance,
      tableName: 'idempotency_keys',
      timestamps: false,
    },
  );

  return IdempotencyKey;
}

initIdempotencyModel();

export default IdempotencyKey;
