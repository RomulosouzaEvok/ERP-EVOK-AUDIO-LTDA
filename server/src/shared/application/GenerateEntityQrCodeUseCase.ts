/**
 * Use case genérico de geração de QR Code para qualquer entidade
 * identificável por id (Product, Asset, etc.), reaproveitando
 * `services/qrCodeService`.
 *
 * @module shared/application/GenerateEntityQrCodeUseCase
 */

const QRCodeService = require('../../services/qrCodeService');
const { NotFoundError } = require('../../errors');

interface GenerateEntityQrCodeInput {
  repository: { findById: (id: number | string) => Promise<any> };
  id: number | string;
  entityType: string;
  entityLabel: string;
  buildData: (entity: any) => Record<string, unknown>;
  format?: 'png' | 'svg';
}

class GenerateEntityQrCodeUseCase {
  async execute({ repository, id, entityType, entityLabel, buildData, format = 'png' }: GenerateEntityQrCodeInput) {
    const entity = await repository.findById(id);
    if (!entity) {
      throw new NotFoundError(`${entityLabel} não encontrado(a).`);
    }

    const data = buildData(entity);

    if (format === 'svg') {
      const { qrSvg, qrCodeData } = await QRCodeService.generateSvg(entityType, id, data);
      return { format: 'svg', qrSvg, qrCodeData };
    }

    const { qrDataUrl, qrCodeData } = await QRCodeService.generate(entityType, id, data);
    return { format: 'png', qrDataUrl, qrCodeData };
  }
}

module.exports = GenerateEntityQrCodeUseCase;
