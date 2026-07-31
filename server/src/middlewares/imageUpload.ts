/**
 * Middleware multer compartilhado para upload de foto (memoryStorage —
 * o buffer é validado por magic bytes e persistido via
 * `services/uploadService`, nunca gravado direto em disco pelo multer).
 *
 * @module middlewares/imageUpload
 */

const multer = require('multer');

const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB, mesmo limite padrão do uploadService

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_SIZE },
  fileFilter: (_req: unknown, file: { mimetype: string }, cb: (error: Error | null, accept?: boolean) => void) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(Object.assign(new Error('Apenas arquivos de imagem são permitidos.'), { statusCode: 400 }));
      return;
    }
    cb(null, true);
  },
});

module.exports = imageUpload;
