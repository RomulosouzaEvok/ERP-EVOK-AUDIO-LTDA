/**
 * Middleware multer para upload do arquivo `.ofx` da Conciliação Bancária
 * v1 (memoryStorage — o buffer é validado e parseado por `parseOfx`, nunca
 * gravado em disco: extrato bancário não deve virar arquivo residual no
 * servidor).
 *
 * Limite de 2MB: um extrato OFX mensal de uma conta corrente comum não
 * passa de algumas centenas de KB — 2MB já é generoso e evita abuso de
 * upload nesta rota.
 *
 * @module modules/financial/presentation/middlewares/ofxUpload
 */

const multer = require('multer');

const MAX_OFX_SIZE = 2 * 1024 * 1024; // 2MB

const ofxUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_OFX_SIZE },
  fileFilter: (_req: unknown, file: { originalname: string; mimetype: string }, cb: (error: Error | null, accept?: boolean) => void) => {
    // Navegadores/clientes HTTP não têm um mimetype padrão consistente
    // para OFX (varia entre 'application/x-ofx', 'text/plain',
    // 'application/octet-stream') — a extensão do nome do arquivo é o
    // sinal mais confiável; o conteúdo em si é validado por `parseOfx`
    // (que rejeita qualquer coisa sem a tag raiz <OFX>).
    if (!/\.ofx$/i.test(file.originalname)) {
      cb(Object.assign(new Error('Apenas arquivos .ofx são permitidos.'), { statusCode: 400 }));
      return;
    }
    cb(null, true);
  },
});

module.exports = ofxUpload;
