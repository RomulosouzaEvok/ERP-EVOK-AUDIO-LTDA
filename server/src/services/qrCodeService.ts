// eslint-disable-next-line @typescript-eslint/no-var-requires
const QRCode = require('qrcode');

interface QRCodeResult {
  qrDataUrl: string;
  qrCodeData: string;
}

interface QRCodeSvgResult {
  qrSvg: string;
  qrCodeData: string;
}

class QRCodeService {
  /**
   * Gera QR Code (PNG data URL) para uma entidade.
   * @param entityType - Tipo: 'asset', 'product', 'machine'
   * @param entityId - Id da entidade
   * @param data - Dados adicionais a codificar
   */
  static async generate(entityType: string, entityId: string | number, data: Record<string, unknown> = {}): Promise<QRCodeResult> {
    const qrCodeData = JSON.stringify({
      type: entityType,
      id: entityId,
      ...data,
      generatedAt: new Date().toISOString()
    });

    const qrDataUrl = await QRCode.toDataURL(qrCodeData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    return { qrDataUrl, qrCodeData };
  }

  /**
   * Gera QR Code em formato SVG (para impressão).
   */
  static async generateSvg(entityType: string, entityId: string | number, data: Record<string, unknown> = {}): Promise<QRCodeSvgResult> {
    const qrCodeData = JSON.stringify({
      type: entityType,
      id: entityId,
      ...data,
      generatedAt: new Date().toISOString()
    });

    const qrSvg = await QRCode.toString(qrCodeData, {
      errorCorrectionLevel: 'M',
      type: 'svg',
      width: 200,
      margin: 1
    });

    return { qrSvg, qrCodeData };
  }
}

export = QRCodeService;
