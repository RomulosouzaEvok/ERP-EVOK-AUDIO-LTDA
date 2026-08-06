/**
 * Middleware multer para upload do arquivo de RETORNO CNAB 240
 * (memoryStorage — mesmo raciocínio de `ofxUpload.ts`: o buffer é validado
 * e parseado por `parseReturnFile`, nunca gravado em disco).
 *
 * Aceita extensão `.ret` (mais comum) ou `.txt` (alguns bancos exportam o
 * retorno como texto puro sem extensão dedicada) — o conteúdo em si é
 * validado por `parseReturnFile` (que rejeita qualquer coisa sem um
 * Header de Arquivo/registro tipo `0` reconhecível).
 *
 * Limite de 5MB: um arquivo de retorno de cobrança com milhares de títulos
 * ainda fica na casa de poucas centenas de KB (240 bytes/linha) — 5MB é
 * generoso e evita abuso de upload nesta rota.
 *
 * @module modules/financial/presentation/middlewares/cnabReturnUpload
 */

const multer = require('multer');

const MAX_RETURN_SIZE = 5 * 1024 * 1024; // 5MB

const cnabReturnUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RETURN_SIZE },
  fileFilter: (_req: unknown, file: { originalname: string; mimetype: string }, cb: (error: Error | null, accept?: boolean) => void) => {
    if (!/\.(ret|txt)$/i.test(file.originalname)) {
      cb(Object.assign(new Error('Apenas arquivos .ret ou .txt são permitidos.'), { statusCode: 400 }));
      return;
    }
    cb(null, true);
  },
});

module.exports = cnabReturnUpload;
