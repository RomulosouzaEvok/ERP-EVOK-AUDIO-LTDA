/**
 * Teste: RBAC de emissao/cancelamento de NF-e pelo modulo Vendas (UC-41,
 * Bloco 5 de `docs/governance/TODO.md`).
 *
 * `docs/governance/TODO.md` §5.1 ja confirma que
 * `authorizeModule('vendas', 'approve')` esta aplicado em
 * `POST /api/sales/:id/nfe` e `POST /api/sales/:id/nfe/cancel`
 * (`server/src/modules/sales/presentation/routes/sales.ts`) — este arquivo
 * NAO reescreve o middleware (ja funciona, coberto genericamente por
 * `tests/unit/access-profiles.test.ts`), apenas fecha os 3 testes
 * pendentes listados em §5.3, aplicados especificamente ao contexto do
 * modulo `vendas`/nivel `approve` de NF-e:
 *
 * 1) Operador de Vendas (nivel `operate`) tenta emitir NF-e -> 403
 *    `APPROVAL_LEVEL_REQUIRED` (checagem no limite do middleware, mesmo
 *    ponto de entrada usado pela rota real).
 * 2) Gestor de Vendas (nivel `approve`) emite NF-e -> a checagem de
 *    autorizacao libera a requisicao (`next()`) e o caso de uso de emissao
 *    completa com sucesso (`nfe_status: 'authorized'`,
 *    `status: 'confirmed' -> 'invoiced'`).
 * 3) Gestor de Vendas cancela a NF-e de uma venda ja `shipped` ->
 *    `nfe_status` muda para `'cancelled'`; `sale.status` permanece
 *    `'shipped'` (cancelamento de NF-e pos-embarque nao reverte o status
 *    da venda — nenhuma regra de negocio liga as duas coisas).
 *
 * @group unit
 * @ticket Bloco5-UC41
 */

jest.mock('../../src/services/auditLogService', () => ({
  logAction: jest.fn(),
}));

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (callback?: any) => {
      const transaction = {
        id: 'tx-nfe-rbac-1',
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

const mockSaleFindByPk = jest.fn();
const mockSaleItemFindAll = jest.fn();
const mockClientFindByPk = jest.fn();
const mockCompanyFiscalConfigFindByPk = jest.fn();
const mockProductFindAll = jest.fn();

jest.mock('../../src/models/index', () => ({
  Sale: { findByPk: (...args: unknown[]) => mockSaleFindByPk(...args) },
  SaleItem: { findAll: (...args: unknown[]) => mockSaleItemFindAll(...args) },
  Client: { findByPk: (...args: unknown[]) => mockClientFindByPk(...args) },
  Product: { findAll: (...args: unknown[]) => mockProductFindAll(...args) },
  CompanyFiscalConfig: { findByPk: (...args: unknown[]) => mockCompanyFiscalConfigFindByPk(...args) },
}));

const mockProviderIssue = jest.fn();
const mockProviderCancel = jest.fn();
jest.mock('../../src/modules/fiscal/infrastructure/providers/NfeProviderFactory', () => {
  return jest.fn(() => ({
    issue: (...args: unknown[]) => mockProviderIssue(...args),
    cancel: (...args: unknown[]) => mockProviderCancel(...args),
  }));
});

import { authorizeModule } from '../../src/middlewares/auth';
import { logAction } from '../../src/services/auditLogService';

import IssueSaleNfeUseCase = require('../../src/modules/fiscal/application/use-cases/IssueSaleNfeUseCase');
import CancelSaleNfeUseCase = require('../../src/modules/fiscal/application/use-cases/CancelSaleNfeUseCase');

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function mockReq(user?: any) {
  return { user, email: undefined } as any;
}

describe('RBAC de NF-e no modulo Vendas (UC-41, Bloco 5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('operador de Vendas (nivel operate) tenta emitir NF-e -> 403 APPROVAL_LEVEL_REQUIRED', () => {
    const req = mockReq({
      role: 'operator',
      accessProfileId: 3,
      accessProfileName: 'Vendedor',
      permissions: { vendas: 'operate' },
      email: 'vendedor@evokaudio.com',
    });
    const res = mockRes();
    const next = jest.fn();

    // Mesma checagem aplicada pela rota real:
    // POST /api/sales/:id/nfe -> authorizeModule('vendas', 'approve').
    authorizeModule('vendas', 'approve')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'APPROVAL_LEVEL_REQUIRED',
        message: 'Esta ação exige nível gestor da área.',
      },
    });
    expect(logAction).toHaveBeenCalledWith(
      req,
      expect.objectContaining({ action: 'access_denied', success: false }),
    );
  });

  it('gestor de Vendas (nivel approve) emite NF-e -> autorizacao libera e emissao retorna sucesso', async () => {
    const req = mockReq({
      role: 'operator',
      accessProfileId: 4,
      accessProfileName: 'Gestor de Vendas',
      permissions: { vendas: 'approve' },
      email: 'gestor.vendas@evokaudio.com',
    });
    const res = mockRes();
    const next = jest.fn();

    // 1) Portao de autorizacao (mesmo middleware da rota real) libera.
    authorizeModule('vendas', 'approve')(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();

    // 2) Caso de uso de emissao (chamado pelo controller apos o middleware
    // liberar) completa com sucesso.
    const saleForReserve = {
      id: 55,
      status: 'confirmed',
      nfe_status: null,
      customer_id: 9,
      total_amount: '100.00',
      save: jest.fn(async function (this: any) {}),
    };
    const saleForResult = {
      id: 55,
      status: 'confirmed',
      nfe_status: 'processing',
      save: jest.fn(async function (this: any) {}),
    };
    mockSaleFindByPk.mockResolvedValueOnce(saleForReserve).mockResolvedValueOnce(saleForResult);
    mockSaleItemFindAll.mockResolvedValue([
      { product_id: 1, quantity: '2', unit_price: '50.00', total_price: '100.00', save: jest.fn(async function (this: any) {}) },
    ]);
    mockClientFindByPk.mockResolvedValue({ id: 9, state: 'SP', tax_regime: 'simples', ind_ie: 'contribuinte' });
    mockCompanyFiscalConfigFindByPk.mockResolvedValue({
      id: 1,
      state: 'SP',
      crt: '1',
      city_ibge_code: '3550308',
      cnpj: '12345678000199',
      nfe_next_number: 100,
      nfe_series: 1,
      nfe_environment: 'homologation',
      nfe_provider: 'mock',
      save: jest.fn(async function (this: any) {}),
    });
    mockProductFindAll.mockResolvedValue([{ id: 1, product_type: 'produto_acabado', ncm: '85182100', code: 'PROD-1', name: 'Produto Teste', unit: 'UN' }]);
    mockProviderIssue.mockResolvedValue({
      status: 'authorized',
      key: '1'.repeat(44),
      number: 100,
      series: 1,
      protocol: 'PROTO-1',
      xml_url: null,
      danfe_url: null,
      provider_ref: 'ref-1',
      error_message: null,
    });

    const useCase = new IssueSaleNfeUseCase();
    const result = await useCase.execute({ saleId: 55 });

    expect(mockProviderIssue).toHaveBeenCalledTimes(1);
    expect(result.nfe_status).toBe('authorized');
    expect(result.status).toBe('invoiced');
  });

  it('gestor de Vendas cancela NF-e de venda ja shipped -> nfe_status vira cancelled, sale.status permanece shipped', async () => {
    const req = mockReq({
      role: 'operator',
      accessProfileId: 4,
      accessProfileName: 'Gestor de Vendas',
      permissions: { vendas: 'approve' },
      email: 'gestor.vendas@evokaudio.com',
    });
    const res = mockRes();
    const next = jest.fn();

    // Mesma checagem aplicada pela rota real: POST /api/sales/:id/nfe/cancel
    // -> authorizeModule('vendas', 'approve').
    authorizeModule('vendas', 'approve')(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    const saleBeforeCancel = { id: 77, status: 'shipped', nfe_status: 'authorized', nfe_provider_ref: 'ref-77' };
    const saleLocked = {
      id: 77,
      status: 'shipped',
      nfe_status: 'authorized',
      nfe_error_message: null,
      save: jest.fn(async function (this: any) {}),
    };
    mockSaleFindByPk.mockResolvedValueOnce(saleBeforeCancel).mockResolvedValueOnce(saleLocked);
    mockCompanyFiscalConfigFindByPk.mockResolvedValue({ id: 1, nfe_provider: 'mock' });
    mockProviderCancel.mockResolvedValue({ status: 'cancelled' });

    const useCase = new CancelSaleNfeUseCase();
    const result = await useCase.execute({ saleId: 77, reason: 'Cancelamento solicitado pelo cliente apos embarque' });

    expect(mockProviderCancel).toHaveBeenCalledWith('ref-77', 'Cancelamento solicitado pelo cliente apos embarque');
    expect(result.nfe_status).toBe('cancelled');
    // sale.status nao e tocado pelo cancelamento de NF-e (permanece shipped).
    expect(saleLocked.status).toBe('shipped');
  });
});
