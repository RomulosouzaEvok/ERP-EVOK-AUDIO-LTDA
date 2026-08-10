/**
 * Middleware multer da importação de cadastro por planilha.
 *
 * `memoryStorage`: a planilha é validada e transformada em cadastro na mesma
 * requisição, então não há motivo para deixar arquivo residual no disco do
 * servidor (mesmo desenho do upload de OFX da conciliação bancária).
 *
 * Limite de 5MB por arquivo: um CSV com 20 mil linhas de cadastro não passa
 * de ~3MB, e o cadastro inteiro da fábrica é uma ordem de grandeza menor.
 *
 * @module modules/spreadsheetImport/presentation/middlewares/spreadsheetUpload
 */

const multer = require('multer');

const { CAMPO_ARQUIVO_ESTRUTURA, CAMPO_ARQUIVO_PRODUTOS } = require('../../domain/catalogSpreadsheetSchema');

/** Tamanho máximo aceito por arquivo. */
const TAMANHO_MAXIMO = 5 * 1024 * 1024;

const spreadsheetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO, files: 2 },
  fileFilter: (
    _req: unknown,
    file: { originalname: string; mimetype: string },
    cb: (error: Error | null, accept?: boolean) => void,
  ) => {
    // O mimetype de CSV varia demais entre navegador, Excel e cliente HTTP
    // ('text/csv', 'application/vnd.ms-excel', 'application/octet-stream') —
    // a extensão é o sinal confiável, e o conteúdo é validado logo depois.
    if (!/\.(csv|txt)$/i.test(file.originalname)) {
      cb(Object.assign(
        new Error(
          `O arquivo "${file.originalname}" não é um CSV. No Excel use Arquivo → Salvar como → "CSV UTF-8 (delimitado por vírgulas)".`,
        ),
        { statusCode: 400 },
      ));
      return;
    }
    cb(null, true);
  },
}).fields([
  { name: CAMPO_ARQUIVO_PRODUTOS, maxCount: 1 },
  { name: CAMPO_ARQUIVO_ESTRUTURA, maxCount: 1 },
]);

module.exports = spreadsheetUpload;
