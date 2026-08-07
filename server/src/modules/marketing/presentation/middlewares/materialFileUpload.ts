/**
 * Middleware multer dedicado para upload de arquivo de material de
 * divulgação (`memoryStorage` — o buffer é validado e persistido via
 * `services/uploadService`, mesmo padrão de `middlewares/imageUpload.ts`,
 * porém sem restringir a mimetype `image/*`: materiais de marketing também
 * podem ser PDF, vídeo ou apresentação — ver
 * `UploadMaterialFileUseCase` para a lista completa de extensões aceitas.
 *
 * @module modules/marketing/presentation/middlewares/materialFileUpload
 */

const multer = require('multer');

const MAX_MATERIAL_FILE_SIZE = 50 * 1024 * 1024; // 50MB — cobre vídeos curtos de divulgação

const materialFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MATERIAL_FILE_SIZE },
});

module.exports = materialFileUpload;
