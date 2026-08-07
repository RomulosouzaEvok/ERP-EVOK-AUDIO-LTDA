/**
 * Middleware multer dedicado para upload de arquivo de contrato/aditivo
 * (`memoryStorage` — o buffer é validado e persistido via
 * `services/uploadService`), mesmo padrão de
 * `modules/marketing/presentation/middlewares/materialFileUpload.ts`,
 * restrito a PDF/DOC/DOCX (instrumento jurídico assinado/digitalizado) —
 * ver `UploadContractFileUseCase`/`UploadAddendumFileUseCase` para a lista
 * completa de extensões aceitas.
 *
 * @module modules/legal/presentation/middlewares/contractFileUpload
 */

const multer = require('multer');

const MAX_CONTRACT_FILE_SIZE = 20 * 1024 * 1024; // 20MB — cobre instrumentos digitalizados extensos

const contractFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CONTRACT_FILE_SIZE },
});

module.exports = contractFileUpload;
