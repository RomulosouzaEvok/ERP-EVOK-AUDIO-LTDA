/**
 * Emite a NF-e de uma venda confirmada.
 *
 * Fluxo (evita segurar lock de banco durante a chamada HTTP externa ao
 * provedor de NF-e):
 *   1. Transação curta: trava a venda, valida estado, reserva
 *      série/número sequencial em `CompanyFiscalConfig` (lock pessimista),
 *      calcula e persiste os tributos de cada item, marca
 *      `nfe_status = 'processing'`.
 *   2. Fora de transação: monta o payload e chama o provedor configurado.
 *   3. Transação curta: grava o resultado (autorizada/negada/processando)
 *      na venda; se autorizada, transiciona `status: confirmed -> invoiced`.
 *
 * @module modules/fiscal/application/use-cases/IssueSaleNfeUseCase
 */

import type { Transaction } from 'sequelize';

const UseCase = require('../../../../shared/application/UseCase');
const { sequelize } = require('../../../../config/database');
const { NotFoundError, BusinessRuleError, ConflictError } = require('../../../../errors');
const { Sale, SaleItem, Client, Product, CompanyFiscalConfig } = require('../../../../models/index');
const TaxCalculationService = require('../../domain/services/TaxCalculationService');
const createNfeProvider = require('../../infrastructure/providers/NfeProviderFactory');

interface IssueSaleNfeInput {
  saleId: number | string;
}

class IssueSaleNfeUseCase extends UseCase {
  /**
   * @param {Object} input
   * @param {number} input.saleId
   * @returns {Promise<Object>} A venda atualizada com o resultado da emissão.
   */
  async execute({ saleId }: IssueSaleNfeInput) {
    const reserved = await sequelize.transaction(async (transaction: Transaction) => {
      const sale = await Sale.findByPk(saleId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!sale) throw new NotFoundError('Venda não encontrada');

      if (sale.status !== 'confirmed') {
        throw new BusinessRuleError(`Apenas vendas 'confirmed' podem ser faturadas. Status atual: '${sale.status}'.`);
      }
      if (sale.nfe_status === 'processing') {
        throw new ConflictError('Já existe uma emissão de NF-e em andamento para esta venda.');
      }
      if (sale.nfe_status === 'authorized') {
        throw new ConflictError('Esta venda já possui uma NF-e autorizada.');
      }

      const items = await SaleItem.findAll({ where: { sale_id: saleId }, transaction, lock: transaction.LOCK.UPDATE });
      if (items.length === 0) throw new BusinessRuleError('Venda sem itens não pode ser faturada.');

      const client = await Client.findByPk(sale.customer_id, { transaction });
      if (!client) throw new NotFoundError('Cliente da venda não encontrado.');

      let config = await CompanyFiscalConfig.findByPk(1, { transaction, lock: transaction.LOCK.UPDATE });
      if (!config) {
        throw new BusinessRuleError('Configuração fiscal da empresa (CompanyFiscalConfig) não cadastrada. Cadastre os dados do emitente antes de emitir NF-e.');
      }
      if (!config.city_ibge_code || !config.cnpj) {
        throw new BusinessRuleError('Configuração fiscal da empresa incompleta (CNPJ/código IBGE do município são obrigatórios).');
      }

      const reservedNumber = config.nfe_next_number;
      config.nfe_next_number += 1;
      await config.save({ transaction });

      const productIds = items.map((item: any) => item.product_id);
      const products = await Product.findAll({ where: { id: productIds }, transaction });
      const productById = new Map<number, any>(products.map((p: any) => [p.id, p]));

      const itemsForProvider = [];
      for (const item of items) {
        const product = productById.get(item.product_id);
        if (!product) throw new NotFoundError(`Produto #${item.product_id} do item da venda não encontrado.`);

        const tax = TaxCalculationService.calculateItem(
          { state: config.state, crt: config.crt },
          { state: client.state, tax_regime: client.tax_regime, ind_ie: client.ind_ie },
          {
            product_type: product.product_type,
            ncm: product.ncm,
            quantity: parseFloat(item.quantity),
            unit_price: parseFloat(item.unit_price),
            total_price: parseFloat(item.total_price),
          }
        );

        Object.assign(item, tax);
        await item.save({ transaction });

        itemsForProvider.push({
          code: product.code,
          description: product.name,
          ncm: product.ncm,
          unit: product.unit,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          total_price: parseFloat(item.total_price),
          ...tax,
        });
      }

      const ref = `sale-${sale.id}-${config.nfe_series}-${reservedNumber}`;
      sale.nfe_status = 'processing';
      sale.nfe_series = config.nfe_series;
      sale.nfe_number = String(reservedNumber);
      sale.nfe_environment = config.nfe_environment;
      sale.nfe_provider_ref = ref;
      sale.nfe_error_message = null;
      await sale.save({ transaction });

      return {
        ref,
        series: config.nfe_series,
        number: reservedNumber,
        environment: config.nfe_environment,
        provider: config.nfe_provider,
        company: config,
        client,
        items: itemsForProvider,
        totalAmount: parseFloat(sale.total_amount),
      };
    });

    const provider = createNfeProvider(reserved.provider);
    let result;
    try {
      result = await provider.issue({
        ref: reserved.ref,
        environment: reserved.environment,
        company: {
          cnpj: reserved.company.cnpj,
          legal_name: reserved.company.legal_name,
          ie: reserved.company.ie,
          crt: reserved.company.crt,
          address: {
            cep: reserved.company.cep,
            street: reserved.company.street,
            number: reserved.company.number,
            complement: reserved.company.complement,
            neighborhood: reserved.company.neighborhood,
            city: reserved.company.city,
            city_ibge_code: reserved.company.city_ibge_code,
            state: reserved.company.state,
          },
        },
        client: {
          name: reserved.client.name,
          cpf_cnpj: reserved.client.cpf_cnpj,
          ie: reserved.client.ie,
          ind_ie: reserved.client.ind_ie,
          email: reserved.client.email,
          address: {
            cep: reserved.client.cep,
            street: reserved.client.street,
            number: reserved.client.number,
            complement: reserved.client.complement,
            neighborhood: reserved.client.neighborhood,
            city: reserved.client.city,
            city_ibge_code: reserved.client.city_ibge_code,
            state: reserved.client.state,
          },
        },
        series: reserved.series,
        number: reserved.number,
        items: reserved.items,
        total_amount: reserved.totalAmount,
      });
    } catch (error) {
      result = {
        status: 'denied',
        key: null, number: null, series: null, protocol: null,
        xml_url: null, danfe_url: null,
        provider_ref: reserved.ref,
        error_message: error instanceof Error ? error.message : 'Erro desconhecido ao comunicar com o provedor de NF-e.',
      };
    }

    return sequelize.transaction(async (transaction: Transaction) => {
      const sale = await Sale.findByPk(saleId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!sale) throw new NotFoundError('Venda não encontrada');

      sale.nfe_status = result.status;
      sale.nfe_key = result.key || sale.nfe_key;
      sale.nfe_protocol = result.protocol || sale.nfe_protocol;
      sale.nfe_xml_url = result.xml_url || sale.nfe_xml_url;
      sale.nfe_danfe_url = result.danfe_url || sale.nfe_danfe_url;
      sale.nfe_error_message = result.error_message;

      if (result.status === 'authorized') {
        sale.nfe_issued_at = new Date();
        if (sale.status === 'confirmed') {
          sale.status = 'invoiced';
        }
      }

      await sale.save({ transaction });
      return sale;
    });
  }
}

module.exports = IssueSaleNfeUseCase;
