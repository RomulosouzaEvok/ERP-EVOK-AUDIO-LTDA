jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (callback?: any) => {
      const transaction = {
        id: 'tx-int-1',
        LOCK: { UPDATE: 'UPDATE' },
        commit: jest.fn(),
        rollback: jest.fn(),
      };

      if (callback) {
        return callback(transaction);
      }

      return transaction;
    }),
  },
}));

jest.mock('../../src/services/inventoryService', () => ({
  receive: jest.fn(async () => ({ product: { id: 10, quantity: 15 } })),
}));

jest.mock('../../src/services/costingService', () => ({
  registerWeightedAverageCost: jest.fn(async () => ({})),
}));

jest.mock('../../src/models/index', () => ({
  LotControl: {
    findOne: jest.fn(async () => null),
    create: jest.fn(async () => ({ id: 1 })),
  },
  PurchaseReceipt: {
    create: jest.fn(async () => ({ id: 1 })),
  },
}));

import ChangeSaleStatusUseCase = require('../../src/modules/sales/application/use-cases/ChangeSaleStatusUseCase');
import ReceivePaymentUseCase = require('../../src/modules/financial/application/use-cases/ReceivePaymentUseCase');
import PayPayableUseCase = require('../../src/modules/financial/application/use-cases/PayPayableUseCase');
import ChangePurchaseStatusUseCase = require('../../src/modules/purchases/application/use-cases/ChangePurchaseStatusUseCase');
import UpdatePurchaseUseCase = require('../../src/modules/purchases/application/use-cases/UpdatePurchaseUseCase');
import ReceivePurchaseItemsUseCase = require('../../src/modules/purchases/application/use-cases/ReceivePurchaseItemsUseCase');
import { ValidationError, BusinessRuleError } from '../../src/errors';

const { sequelize } = require('../../src/config/database');
const InventoryService = require('../../src/services/inventoryService');
const CostingService = require('../../src/services/costingService');
const { LotControl } = require('../../src/models/index');

describe('Integrity transaction guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cancela venda usando leitura com lock e restaura estoque uma vez', async () => {
    const save = jest.fn(async () => ({}));
    const saleRepository = {
      findSaleWithItemsForUpdate: jest.fn(async () => ({
        id: 99,
        status: 'confirmed',
        items: [{ product_id: 10, quantity: 2 }],
        save,
      })),
      cancelPendingReceivables: jest.fn(async () => ({})),
    };

    const useCase = new ChangeSaleStatusUseCase(saleRepository);
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };

    const result = await useCase.execute({
      id: 99,
      status: 'canceled',
      userId: 7,
      transaction,
    });

    expect(saleRepository.findSaleWithItemsForUpdate).toHaveBeenCalledWith(99, transaction);
    expect(InventoryService.receive).toHaveBeenCalledTimes(1);
    expect(saleRepository.cancelPendingReceivables).toHaveBeenCalledWith(99, transaction);
    expect(save).toHaveBeenCalledWith({ transaction });
    expect(result.previousStatus).toBe('confirmed');
  });

  it('impede reprocessar cancelamento de venda ja cancelada', async () => {
    const saleRepository = {
      findSaleWithItemsForUpdate: jest.fn(async () => ({
        id: 100,
        status: 'canceled',
        items: [],
        save: jest.fn(),
      })),
      cancelPendingReceivables: jest.fn(),
    };

    const useCase = new ChangeSaleStatusUseCase(saleRepository);

    await expect(
      useCase.execute({
        id: 100,
        status: 'canceled',
        userId: 1,
        transaction: { LOCK: { UPDATE: 'UPDATE' } },
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(InventoryService.receive).not.toHaveBeenCalled();
  });

  it('recebe conta com transacao e lock pessimista', async () => {
    const save = jest.fn(async () => ({}));
    const financialRepository = {
      findReceivableByIdForUpdate: jest.fn(async () => ({
        id: 1,
        status: 'pending',
        amount: 120,
        payment_method: null,
        save,
      })),
    };

    const useCase = new ReceivePaymentUseCase(financialRepository);
    const result = await useCase.execute({
      id: 1,
      amount: 100,
      payment_method: 'pix',
    });

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(financialRepository.findReceivableByIdForUpdate).toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      transaction: expect.objectContaining({ id: 'tx-int-1' }),
    }));
    // Pagamento de 100 de uma conta de 120: fica 'partial', nao 'paid' —
    // amount (total) nunca e sobrescrito por um valor parcial.
    expect(result.account.status).toBe('partial');
    expect(result.account.amount).toBe(120);
    expect(result.account.amount_paid).toBe(100);
  });

  it('bloqueia recebimento de conta ja paga antes de novo save', async () => {
    const save = jest.fn(async () => ({}));
    const financialRepository = {
      findReceivableByIdForUpdate: jest.fn(async () => ({
        id: 2,
        status: 'paid',
        amount: 50,
        save,
      })),
    };

    const useCase = new ReceivePaymentUseCase(financialRepository);

    await expect(useCase.execute({ id: 2 })).rejects.toBeInstanceOf(ValidationError);
    expect(save).not.toHaveBeenCalled();
  });

  it('paga conta com transacao e lock pessimista', async () => {
    const save = jest.fn(async () => ({}));
    const financialRepository = {
      findPayableByIdForUpdate: jest.fn(async () => ({
        id: 10,
        status: 'pending',
        amount: 300,
        payment_method: null,
        save,
      })),
    };

    const useCase = new PayPayableUseCase(financialRepository);
    const result = await useCase.execute({
      id: 10,
      amount: 250,
      payment_method: 'ted',
    });

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(financialRepository.findPayableByIdForUpdate).toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      transaction: expect.objectContaining({ id: 'tx-int-1' }),
    }));
    // Pagamento de 250 de uma conta de 300: fica 'partial', nao 'paid'.
    expect(result.account.status).toBe('partial');
    expect(result.account.amount).toBe(300);
    expect(result.account.amount_paid).toBe(250);
  });

  it('aprova pedido usando lock no registro principal', async () => {
    const save = jest.fn(async () => ({}));
    const purchaseRepository = {
      findPurchaseByIdRawForUpdate: jest.fn(async () => ({
        id: 5,
        status: 'pending',
        supplier_id: 3,
        total_amount: 500,
        order_number: 'PO-500',
        expected_date: '2026-08-30',
        save,
      })),
      findAccountPayableByPurchaseId: jest.fn(async () => null),
      createAccountPayable: jest.fn(async () => ({})),
    };

    const useCase = new ChangePurchaseStatusUseCase(purchaseRepository);
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };

    await useCase.execute({
      id: 5,
      status: 'approved',
      userId: 9,
      transaction,
    });

    expect(purchaseRepository.findPurchaseByIdRawForUpdate).toHaveBeenCalledWith(5, transaction);
    expect(save).toHaveBeenCalledWith({ transaction });
    expect(purchaseRepository.createAccountPayable).toHaveBeenCalledTimes(1);
  });

  it('recebe itens de compra usando lock no pedido e nos itens finais', async () => {
    const save = jest.fn(async () => ({}));
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    const purchase = {
      id: 8,
      status: 'sent',
      order_number: 'PO-008',
      supplier_id: 2,
      invoice_date: new Date('2026-07-20'),
      items: [
        {
          id: 81,
          product_id: 10,
          quantity: 5,
          received_quantity: 1,
          unit_price: 12.5,
        },
      ],
      save,
    };

    const purchaseRepository = {
      findPurchaseWithItemsForUpdate: jest.fn(async () => purchase),
      updatePurchaseItem: jest.fn(async () => ({})),
      findPurchaseItemsForUpdate: jest.fn(async () => ([
        { id: 81, status: 'partial' },
      ])),
    };

    const useCase = new ReceivePurchaseItemsUseCase(purchaseRepository);

    const result = await useCase.execute({
      id: 8,
      items: [{ item_id: 81, quantity: 2 }],
      invoiceNumber: 'NF-UNIT-001',
      userId: 4,
      transaction,
    });

    expect(purchaseRepository.findPurchaseWithItemsForUpdate).toHaveBeenCalledWith(8, transaction);
    expect(purchaseRepository.findPurchaseItemsForUpdate).toHaveBeenCalledWith(8, transaction);
    expect(InventoryService.receive).toHaveBeenCalledTimes(1);
    expect(LotControl.create).toHaveBeenCalledTimes(1);
    // Item 8 do levantamento (qualidade fecha o loop): lotes de recebimento
    // de compra nascem em 'quarantine' (nao mais 'available'), bloqueando o
    // CONSUMO por lote ate a inspecao liberar via POST /lots/:id/release. O
    // estoque fisico (products.quantity) continua entrando normalmente via
    // InventoryService.receive, ja verificado acima.
    expect(LotControl.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'quarantine' }),
      expect.anything()
    );
    expect(CostingService.registerWeightedAverageCost).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ transaction });
    expect(result.purchase.status).toBe('partial');
  });

  it('atualiza pedido de compra usando lock pessimista (achado de auditoria: race condition)', async () => {
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    const purchase = { id: 6, status: 'pending', expected_date: '2026-01-01', notes: 'old' };

    const purchaseRepository = {
      findPurchaseByIdRawForUpdate: jest.fn(async () => purchase),
      updatePurchaseFields: jest.fn(async () => {}),
      findPurchaseById: jest.fn(async () => ({ id: 6, status: 'pending', notes: 'new' })),
    };

    const useCase = new UpdatePurchaseUseCase(purchaseRepository);

    await useCase.execute({ id: 6, body: { notes: 'new' }, transaction });

    expect(purchaseRepository.findPurchaseByIdRawForUpdate).toHaveBeenCalledWith(6, transaction);
    expect(purchaseRepository.updatePurchaseFields).toHaveBeenCalledWith(6, { notes: 'new' }, transaction);
  });

  it('bloqueia edicao de pedido de compra que nao esta pending/approved', async () => {
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    const purchaseRepository = {
      findPurchaseByIdRawForUpdate: jest.fn(async () => ({ id: 6, status: 'received' })),
      updatePurchaseFields: jest.fn(),
    };

    const useCase = new UpdatePurchaseUseCase(purchaseRepository);

    await expect(
      useCase.execute({ id: 6, body: { notes: 'new' }, transaction })
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(purchaseRepository.updatePurchaseFields).not.toHaveBeenCalled();
  });
});
