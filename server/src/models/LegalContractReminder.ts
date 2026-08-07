/**
 * ⏰ Model: LegalContractReminder (Lembrete de Prazo Contratual — Jurídico)
 *
 * @module models/LegalContractReminder
 *
 * Lembrete de prazo (renovação, expiração, aviso prévio, pagamento) de um
 * {@link LegalContract}, módulo Jurídico (departamento 16, sigla JUR — ver
 * `docs/juridico/01-CONTRATOS.md`). É o caso de uso central do spec de
 * Contratos: gestão de prazos contratuais.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type LegalContractReminderType = 'renewal' | 'expiration' | 'notice' | 'payment';

interface LegalContractReminderAttributes {
  id: number;
  contract_id: number;
  reminder_type: LegalContractReminderType;
  reminder_date: string;
  days_before: number;
  notified: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const LegalContractReminder = sequelize.define('LegalContractReminder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  contract_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'legal_contracts', key: 'id' },
  },
  reminder_type: {
    type: DataTypes.ENUM('renewal', 'expiration', 'notice', 'payment'),
    allowNull: false,
  },
  reminder_date: { type: DataTypes.DATEONLY, allowNull: false },
  days_before: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
  notified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  tableName: 'legal_contract_reminders',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['contract_id'], name: 'idx_legal_contract_reminders_contract_id' },
    { fields: ['reminder_date'], name: 'idx_legal_contract_reminders_reminder_date' },
  ],
});

export = LegalContractReminder;
