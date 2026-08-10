/**
 * 🏢 Model: Department (Departamentos)
 *
 * @module models/Department
 *
 * Gerencia os departamentos da fábrica com código único e gestor responsável.
 *
 * `cost_center_id` (opcional, NOVO): de-para simples departamento → centro
 * de custo financeiro, usada para preencher automaticamente
 * `AccountPayable.cost_center_id` quando uma conta a pagar nasce
 * automaticamente a partir de um pedido de compra rastreável até um
 * departamento (requisição → pedido → recebimento/aprovação — ver
 * `ChangePurchaseStatusUseCase._createPurchasePayable`). Não é 1:1
 * obrigatório: vários departamentos podem apontar para o mesmo centro de
 * custo, e um departamento pode não ter nenhum (`NULL` = a AP nasce sem
 * centro de custo, sem erro). Coluna simples em vez de tabela de-para
 * separada — é a opção mais simples para um mapeamento 1 campo por
 * departamento (ver migration `20260806-000115-add-cost-center-id-to-departments.cjs`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface DepartmentAttributes {
  id: number;
  code: string;
  name: string;
  sigla: string;
  description: string | null;
  manager_id: number | null;
  active: boolean;
  cost_center_id: number | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const Department = sequelize.define('Department', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING(10), allowNull: false, comment: 'Código único do departamento' },
  name: { type: DataTypes.STRING(100), allowNull: false, comment: 'Nome do departamento' },
  sigla: { type: DataTypes.STRING(10), allowNull: false, comment: 'Sigla (DIR, RH, ENG, etc.)' },
  description: { type: DataTypes.TEXT, allowNull: true },
  manager_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → employees.id (gestor)' },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
  cost_center_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → cost_centers.id (opcional; NULL = departamento sem centro de custo mapeado)' }
}, {
  tableName: 'departments',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['code'] },
    { unique: true, fields: ['sigla'] }
  ]
});

export = Department;
