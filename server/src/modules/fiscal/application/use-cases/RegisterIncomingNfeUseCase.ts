/**
 * Registra manualmente a NF-e de entrada (nota do fornecedor) contra um
 * pedido de compra já recebido.
 *
 * NÃO consome a NF-e diretamente da SEFAZ (isso exigiria configurar
 * "Manifestação do Destinatário"/DFe com o certificado digital da empresa,
 * um fluxo assíncrono adicional) — o operador informa manualmente a chave
 * de acesso (validada com dígito verificador real) e, opcionalmente,
 * anexa o XML recebido do fornecedor por e-mail para guarda fiscal.
 *
 * @module modules/fiscal/application/use-cases/RegisterIncomingNfeUseCase
 */

const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../../../errors');
const { Purchase } = require('../../../../models/index');
const { isValidNfeAccessKey } = require('../../domain/services/NfeAccessKeyValidator');

class RegisterIncomingNfeUseCase extends UseCase {
  /**
   * @param {Object} input
   * @param {number} input.purchaseId
   * @param {string} input.nfeKey - Chave de acesso (44 dígitos).
   * @param {string} [input.invoiceNumber]
   * @param {string} [input.nfeSeries]
   * @param {string} [input.xmlPath] - Caminho do arquivo XML já salvo em disco (upload tratado na camada de apresentação).
   * @param {number} input.userId
   * @returns {Promise<Object>} O pedido de compra atualizado.
   */
  async execute({ purchaseId, nfeKey, invoiceNumber, nfeSeries, xmlPath, userId }) {
    if (!isValidNfeAccessKey(nfeKey)) {
      throw new ValidationError('Chave de acesso da NF-e inválida (44 dígitos com dígito verificador correto).');
    }

    const purchase = await Purchase.findByPk(purchaseId);
    if (!purchase) throw new NotFoundError('Pedido de compra não encontrado.');

    if (!['partial', 'received'].includes(purchase.status)) {
      throw new BusinessRuleError(`NF-e de entrada só pode ser registrada em pedidos recebidos (parcial ou total). Status atual: '${purchase.status}'.`);
    }

    purchase.nfe_key = nfeKey.replace(/\D/g, '');
    purchase.nfe_series = nfeSeries || purchase.nfe_series;
    purchase.invoice_number = invoiceNumber || purchase.invoice_number;
    purchase.invoice_date = purchase.invoice_date || new Date();
    purchase.nfe_xml_path = xmlPath || purchase.nfe_xml_path;
    purchase.nfe_registered_by = userId;
    purchase.nfe_registered_at = new Date();

    await purchase.save();
    return purchase;
  }
}

module.exports = RegisterIncomingNfeUseCase;
