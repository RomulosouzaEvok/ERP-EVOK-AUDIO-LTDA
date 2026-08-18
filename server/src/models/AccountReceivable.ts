/**
 * 💰 Model: AccountReceivable (Contas a Receber)
 *
 * @module models/AccountReceivable
 *
 * Gerencia parcelas de contas a receber geradas a partir de vendas.
 * Suporta controle de cobrança (collection_status) e juros/multa.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface AccountReceivableAttributes {
  id: number;
  sale_id: number | null;
  customer_id: number;
  installment: number;
  amount: number;
  amount_paid: number;
  due_date: string;
  payment_date: string | null;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'canceled';
  payment_method: string | null;
  invoice_number: string | null;
  barcode: string | null;
  pix_key: string | null;
  interest: number;
  fine: number;
  discount: number;
  collection_status: 'normal' | 'warning' | 'overdue_30' | 'overdue_60' | 'overdue_90' | 'protested';
  protest_date: string | null;
  negativation_date: string | null;
  notes: string | null;
  cost_center_id: number | null;
  approved_by: number | null;
  approval_date: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const AccountReceivable = sequelize.define('AccountReceivable', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  // NULL só pela semântica da FK `fk_accounts_receivable_sale_id`, que é
  // ON DELETE SET NULL e era autocontraditória com o NOT NULL que existia no
  // banco (achado P1-06, resolvido na migration 20260810-000028). Nenhum
  // caminho de código cria conta a receber sem venda: os 4 pontos de INSERT
  // estão todos no módulo `sales`.
  sale_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → sales.id (venda de origem)' },
  customer_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → clients.id' },
  installment: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, comment: 'Nº da parcela' },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Valor TOTAL da parcela (nunca sobrescrito por pagamentos parciais)' },
  amount_paid: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, comment: 'Soma de todos os valores ja recebidos' },
  due_date: { type: DataTypes.DATEONLY, allowNull: false, comment: 'Data de vencimento' },
  // A parcela nasce `pending`: tudo que só existe na baixa/cobrança é
  // nullable. O NOT NULL sem default que existia no banco impedia confirmar
  // qualquer venda — removido na migration 20260810-000028 (BUG-04).
  payment_date: { type: DataTypes.DATEONLY, allowNull: true, comment: 'Data do pagamento; NULL enquanto a parcela não é baixada' },
  status: { type: DataTypes.ENUM('pending', 'partial', 'paid', 'overdue', 'canceled'), allowNull: false, defaultValue: 'pending' },
  payment_method: { type: DataTypes.STRING(30), allowNull: true, comment: 'Forma de pagamento; só é conhecida na baixa' },
  invoice_number: { type: DataTypes.STRING(50), allowNull: true, comment: 'Nº da fatura/NF; opcional' },
  barcode: { type: DataTypes.STRING(50), allowNull: true, comment: 'Código de barras do boleto; opcional' },
  pix_key: { type: DataTypes.STRING(100), allowNull: true, comment: 'Chave PIX; opcional' },
  interest: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, comment: 'Juros' },
  fine: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, comment: 'Multa' },
  discount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, comment: 'Desconto' },
  collection_status: { type: DataTypes.ENUM('normal', 'warning', 'overdue_30', 'overdue_60', 'overdue_90', 'protested'), allowNull: false, defaultValue: 'normal' },
  protest_date: { type: DataTypes.DATEONLY, allowNull: true, comment: 'Data do protesto; NULL se não houve protesto' },
  negativation_date: { type: DataTypes.DATEONLY, allowNull: true, comment: 'Data da negativação; NULL se não houve' },
  notes: { type: DataTypes.TEXT, allowNull: true, comment: 'Observações livres (opcional)' },
  cost_center_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → cost_centers.id (opcional; NULL = "Sem centro de custo" nos relatórios)' },
  approved_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK → users.id de quem registrou o recebimento' },
  approval_date: { type: DataTypes.DATEONLY, allowNull: true, comment: 'Data em que o recebimento foi registrado' }
}, {
  tableName: 'accounts_receivable',
  underscored: true,
  timestamps: true
});

export = AccountReceivable;
