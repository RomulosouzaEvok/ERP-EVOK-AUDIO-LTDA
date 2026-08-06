/**
 * Test: SaleInvoiceAccumulator — lógica pura de acúmulo de
 * `invoiced_quantity`/transição de status compartilhada entre
 * `IssueSaleNfeUseCase` (síncrono) e `GetSaleNfeStatusUseCase` (assíncrono).
 *
 * @group unit
 */

import SaleInvoiceAccumulator = require('../../src/modules/fiscal/domain/services/SaleInvoiceAccumulator');

describe('SaleInvoiceAccumulator', () => {
  describe('applyInvoicedQuantities', () => {
    it('incrementa apenas os itens presentes no mapa desta emissão', () => {
      const items = [
        { id: 1, quantity: 10, invoiced_quantity: 0 },
        { id: 2, quantity: 5, invoiced_quantity: 5 },
      ];
      const qtyToInvoiceByItemId = new Map([[1, 4]]);

      const { updates, anyRemaining } = SaleInvoiceAccumulator.applyInvoicedQuantities(items, qtyToInvoiceByItemId);

      expect(updates).toHaveLength(1);
      expect(updates[0].newInvoicedQuantity).toBe(4);
      expect(anyRemaining).toBe(true); // item 1 ainda tem saldo (10 - 4 = 6)
    });

    it('anyRemaining false quando todos os itens ficam totalmente faturados', () => {
      const items = [
        { id: 1, quantity: 10, invoiced_quantity: 4 },
      ];
      const qtyToInvoiceByItemId = new Map([[1, 6]]);

      const { updates, anyRemaining } = SaleInvoiceAccumulator.applyInvoicedQuantities(items, qtyToInvoiceByItemId);

      expect(updates[0].newInvoicedQuantity).toBe(10);
      expect(anyRemaining).toBe(false);
    });

    it('itens fora do mapa nao geram update mas contam para anyRemaining', () => {
      const items = [
        { id: 1, quantity: 10, invoiced_quantity: 10 },
        { id: 2, quantity: 5, invoiced_quantity: 2 },
      ];
      const qtyToInvoiceByItemId = new Map<number, number>();

      const { updates, anyRemaining } = SaleInvoiceAccumulator.applyInvoicedQuantities(items, qtyToInvoiceByItemId);

      expect(updates).toHaveLength(0);
      expect(anyRemaining).toBe(true); // item 2 tem saldo pendente (5 - 2 = 3)
    });
  });

  describe('resolveSaleStatus', () => {
    it('confirmed -> invoiced quando nao ha saldo restante', () => {
      expect(SaleInvoiceAccumulator.resolveSaleStatus('confirmed', false)).toBe('invoiced');
    });

    it('confirmed -> partially_invoiced quando ha saldo restante', () => {
      expect(SaleInvoiceAccumulator.resolveSaleStatus('confirmed', true)).toBe('partially_invoiced');
    });

    it('partially_invoiced -> invoiced quando saldo se esgota', () => {
      expect(SaleInvoiceAccumulator.resolveSaleStatus('partially_invoiced', false)).toBe('invoiced');
    });

    it('nao altera status fora de confirmed/partially_invoiced', () => {
      expect(SaleInvoiceAccumulator.resolveSaleStatus('shipped', false)).toBe('shipped');
      expect(SaleInvoiceAccumulator.resolveSaleStatus('quote', true)).toBe('quote');
    });
  });
});
