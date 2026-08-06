/**
 * 🧾 Model: SaleInvoice (Histórico de emissões de NF-e por venda)
 *
 * @module models/SaleInvoice
 *
 * Um registro por EMISSÃO de NF-e de uma venda (1 venda : N notas) —
 * substitui a limitação conhecida de `Sale.nfe_*` guardar apenas a NF-e
 * "atual" (única), que fazia emissões parciais sucessivas sobrescreverem
 * chave/protocolo/XML umas das outras (ver
 * `server/src/modules/fiscal/application/use-cases/IssueSaleNfeUseCase.ts`,
 * seção "FATURAMENTO PARCIAL", e `docs/governance/TODO.md`).
 *
 * PADRÃO EXPAND-CONTRACT (dual-write, decisão desta rodada 2026-08-06):
 * `Sale.nfe_*` NÃO foi removido — continua sendo atualizado com os dados da
 * emissão MAIS RECENTE a cada chamada de `IssueSaleNfeUseCase`/
 * `GetSaleNfeStatusUseCase`/`CancelSaleNfeUseCase`, exatamente como antes,
 * para não quebrar telas/relatórios existentes que leem esses campos
 * diretamente de `Sale`. `sale_invoices` é a fonte de verdade para o
 * HISTÓRICO completo (todas as emissões); `Sale.nfe_*` é só um atalho de
 * leitura para "qual é a nota mais recente desta venda" — uma futura rodada
 * de "contract" pode aposentar `Sale.nfe_*` depois que todo consumidor
 * migrar para `GET /api/sales/:id/invoices`, mas isso está fora do escopo
 * desta entrega.
 *
 * `items` (JSONB): snapshot das quantidades/tributos exatamente como
 * calculados NESTA emissão (não a linha `SaleItem` inteira, que é
 * cumulativa/mutável entre emissões) — cada elemento é
 * `{ sale_item_id, product_id, quantity, unit_price, total_price, cfop,
 * icms_cst, icms_aliquot, icms_base, icms_value, ipi_cst, ipi_aliquot,
 * ipi_value, pis_cst, pis_aliquot, pis_value, cofins_cst, cofins_aliquot,
 * cofins_value }`. Essencial para a reconciliação assíncrona
 * (`GetSaleNfeStatusUseCase`) saber, quando o provedor real confirma a
 * autorização depois, EXATAMENTE quais itens/quantidades entram nesta nota
 * — informação que não existe em nenhum outro lugar depois que a emissão
 * sai da memória do processo que a iniciou.
 *
 * `nfe_status` desta tabela é o status POR EMISSÃO (nunca regride depois de
 * `authorized`/`denied`/`cancelled` — estados terminais), diferente de
 * `Sale.nfe_status`, que reflete só a emissão mais recente.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface SaleInvoiceAttributes {
  id: number;
  sale_id: number;
  items: Array<Record<string, unknown>>;
  total_amount: number;
  nfe_number: string | null;
  nfe_series: number | null;
  nfe_environment: 'homologacao' | 'producao' | null;
  nfe_provider: 'mock' | 'focus_nfe' | 'enotas';
  nfe_status: 'processing' | 'authorized' | 'denied' | 'cancelled';
  nfe_key: string | null;
  nfe_protocol: string | null;
  nfe_provider_ref: string;
  nfe_xml_url: string | null;
  nfe_danfe_url: string | null;
  nfe_error_message: string | null;
  nfe_issued_at: Date | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SaleInvoice = sequelize.define('SaleInvoice', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  sale_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → sales.id' },
  items: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Snapshot dos itens/quantidades/tributos desta emissão especifica (nao a linha SaleItem cumulativa)'
  },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Valor total desta emissão (pode ser parcial)' },
  nfe_number: DataTypes.STRING(50),
  nfe_series: DataTypes.INTEGER,
  nfe_environment: DataTypes.ENUM('homologacao', 'producao'),
  nfe_provider: { type: DataTypes.ENUM('mock', 'focus_nfe', 'enotas'), allowNull: false },
  nfe_status: { type: DataTypes.ENUM('processing', 'authorized', 'denied', 'cancelled'), allowNull: false, defaultValue: 'processing' },
  nfe_key: DataTypes.STRING(50),
  nfe_protocol: DataTypes.STRING(50),
  nfe_provider_ref: { type: DataTypes.STRING(100), allowNull: false, comment: 'Referencia unica desta emissão, formato sale-{saleId}-{series}-{number}' },
  nfe_xml_url: DataTypes.STRING(500),
  nfe_danfe_url: DataTypes.STRING(500),
  nfe_error_message: DataTypes.TEXT,
  nfe_issued_at: DataTypes.DATE
}, {
  tableName: 'sale_invoices',
  underscored: true,
  timestamps: true
});

export = SaleInvoice;
