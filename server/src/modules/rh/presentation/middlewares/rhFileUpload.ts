/**
 * Middleware Multer (`memoryStorage`) para os anexos do módulo RH —
 * documentos do funcionário (`hr_employee_documents`, RF-RH-027) e TRCT
 * (`hr_termination_processes.trct_file_path`, RF-RH-021).
 *
 * Mesmo padrão de `modules/marketing/presentation/middlewares/
 * materialFileUpload.ts`: o buffer é validado (magic bytes) e persistido
 * por `services/uploadService`, nunca gravado direto por este middleware.
 *
 * Limite menor que o de marketing (10MB, não 50MB) porque aqui só entram
 * documentos digitalizados (PDF/imagem) — nunca vídeo/apresentação.
 *
 * @module modules/rh/presentation/middlewares/rhFileUpload
 */

const multer = require('multer');

const MAX_RH_FILE_SIZE = 10 * 1024 * 1024; // 10MB — documento digitalizado

const rhFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RH_FILE_SIZE },
});

module.exports = rhFileUpload;
