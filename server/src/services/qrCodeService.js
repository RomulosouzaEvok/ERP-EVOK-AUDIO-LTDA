const QRCode = require('qrcode');

class QRCodeService {
  /**
   * Generate QR Code for a given entity
   * @param {string} entityType - Type: 'asset', 'product', 'machine'
   * @param {string} entityId - MongoDB ObjectId
   * @param {object} data - Additional data to encode
   * @returns {Promise<{ qrDataUrl: string, qrCodeData: string }>}
   */
  static async generate(entityType, entityId, data = {}) {
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
   * Generate QR Code in SVG format (for printing)
   */
  static async generateSvg(entityType, entityId, data = {}) {
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

module.exports = QRCodeService;

