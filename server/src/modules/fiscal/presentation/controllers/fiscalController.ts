import type { Request, Response, NextFunction } from 'express';

const { logAction } = require('../../../../services/auditLogService');
const SequelizeFiscalRepository = require('../../infrastructure/sequelize/SequelizeFiscalRepository');
const IssueSaleNfeUseCase = require('../../application/use-cases/IssueSaleNfeUseCase');
const GetSaleNfeStatusUseCase = require('../../application/use-cases/GetSaleNfeStatusUseCase');
const CancelSaleNfeUseCase = require('../../application/use-cases/CancelSaleNfeUseCase');
const RegisterIncomingNfeUseCase = require('../../application/use-cases/RegisterIncomingNfeUseCase');
const GetCompanyFiscalConfigUseCase = require('../../application/use-cases/GetCompanyFiscalConfigUseCase');
const UpsertCompanyFiscalConfigUseCase = require('../../application/use-cases/UpsertCompanyFiscalConfigUseCase');
const { cancelNfeSchema, issueSaleNfeSchema, registerIncomingNfeSchema, upsertCompanyFiscalConfigSchema, handleZodError } = require('../validators/fiscalValidators');

/**
 * Controller do módulo `fiscal`. Endpoints de NF-e ficam expostos sob os
 * prefixos já existentes `/api/sales/:id/nfe*` e `/api/purchases/:id/nfe`
 * (não introduz um novo prefixo top-level), já que semanticamente
 * pertencem ao ciclo de vida de venda/compra.
 */
const fiscalRepository = new SequelizeFiscalRepository();

/**
 * `POST /api/sales/:id/nfe` — emite a NF-e da venda (total ou parcial).
 *
 * Faturamento parcial (gap 3/3 do módulo `sales`): aceita payload opcional
 * `{ items: [{ sale_item_id, quantity }] }`; omitido/vazio preserva o
 * comportamento anterior (fatura o saldo pendente inteiro).
 */
exports.issueSaleNfe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = issueSaleNfeSchema.safeParse(req.body ?? {});
    if (!parsed.success) return handleZodError(parsed.error);

    const useCase = new IssueSaleNfeUseCase(fiscalRepository);
    const sale = await useCase.execute({ saleId: req.params.id, items: parsed.data.items });

    logAction(req, {
      action: 'status_change',
      entityType: 'Sale',
      entityId: sale.id,
      entityDescription: `Venda #${sale.id}`,
      newValues: { nfe_status: sale.nfe_status, nfe_key: sale.nfe_key },
      description: `NF-e da venda #${sale.id}: ${sale.nfe_status}`
    });

    res.status(202).json({ success: true, data: sale });
  } catch (error) { next(error); }
};

/** `GET /api/sales/:id/nfe` — consulta/reconcilia o status da NF-e da venda. */
exports.getSaleNfeStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetSaleNfeStatusUseCase(fiscalRepository);
    const sale = await useCase.execute({ saleId: req.params.id });
    res.json({ success: true, data: sale });
  } catch (error) { next(error); }
};

/** `POST /api/sales/:id/nfe/cancel` — cancela a NF-e autorizada da venda. */
exports.cancelSaleNfe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = cancelNfeSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CancelSaleNfeUseCase(fiscalRepository);
    const sale = await useCase.execute({ saleId: req.params.id, reason: parsed.data.reason });

    logAction(req, {
      action: 'status_change',
      entityType: 'Sale',
      entityId: sale.id,
      entityDescription: `Venda #${sale.id}`,
      newValues: { nfe_status: sale.nfe_status },
      description: `NF-e da venda #${sale.id} cancelada: ${parsed.data.reason}`
    });

    res.json({ success: true, data: sale });
  } catch (error) { next(error); }
};

/** `POST /api/purchases/:id/nfe` — registra manualmente a NF-e de entrada. */
exports.registerIncomingNfe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = registerIncomingNfeSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new RegisterIncomingNfeUseCase(fiscalRepository);
    const purchase = await useCase.execute({
      purchaseId: req.params.id,
      nfeKey: parsed.data.nfe_key,
      invoiceNumber: parsed.data.invoice_number,
      nfeSeries: parsed.data.nfe_series,
      xmlPath: parsed.data.xml_path,
      userId: (req as any).user.id,
    });

    logAction(req, {
      action: 'update',
      entityType: 'Purchase',
      entityId: purchase.id,
      entityDescription: `Pedido de compra #${purchase.id}`,
      newValues: { nfe_key: purchase.nfe_key, invoice_number: purchase.invoice_number },
      description: `NF-e de entrada registrada no pedido #${purchase.id}`
    });

    res.json({ success: true, data: purchase });
  } catch (error) { next(error); }
};

/** `GET /api/fiscal/config` — retorna a configuração fiscal da empresa. */
exports.getCompanyFiscalConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetCompanyFiscalConfigUseCase(fiscalRepository);
    const config = await useCase.execute();
    res.json({ success: true, data: config });
  } catch (error) { next(error); }
};

/** `PUT /api/fiscal/config` — cria/atualiza a configuração fiscal da empresa. */
exports.upsertCompanyFiscalConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = upsertCompanyFiscalConfigSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpsertCompanyFiscalConfigUseCase(fiscalRepository);
    const config = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'update',
      entityType: 'CompanyFiscalConfig',
      entityId: config.id,
      entityDescription: 'Configuração fiscal da empresa',
      newValues: parsed.data,
      description: 'Configuração fiscal da empresa atualizada'
    });

    res.json({ success: true, data: config });
  } catch (error) { next(error); }
};
