/**
 * 📤 UploadService — Serviço de upload de arquivos seguro.
 *
 * Gerencia validação de tipo (magic bytes), sanitização de nome,
 * tamanho máximo e armazenamento de arquivos enviados via multer.
 * Previne path traversal e execução de arquivos maliciosos.
 *
 * @module services/uploadService
 */

import path from 'path';
import fs from 'fs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Validators = require('../utils/validators');

/**
 * Extensões de arquivo permitidas por categoria.
 */
const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  documents: ['.pdf', '.xml', '.json'],
  all: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.xml', '.json']
};

/**
 * Tamanho máximo padrão: 10MB.
 */
const DEFAULT_MAX_SIZE: number = 10 * 1024 * 1024;

/**
 * Interface para a configuração de upload.
 */
interface UploadConfig {
  /** Tipos MIME permitidos (ex.: ['image/jpeg', 'image/png']) */
  allowedMimes?: string[];
  /** Extensões permitidas (ex.: ['.jpg', '.png']) */
  allowedExtensions?: string[];
  /** Tamanho máximo em bytes */
  maxSize?: number;
  /** Subpasta dentro de `uploads/` (ex.: 'products') */
  subfolder?: string;
}

/**
 * Interface do resultado de upload.
 */
interface UploadResult {
  success: boolean;
  filename: string;
  path: string;
  size: number;
  mime: string;
  error?: string;
}

/**
 * Interface do arquivo enviado via multer (definida localmente para
 * evitar dependência estrita de @types/multer).
 */
interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  path?: string;
}

/**
 * Sanitiza o nome do arquivo: remove caracteres especiais,
 * substitui espaços por underscores, converte para minúsculas
 * e adiciona timestamp para evitar colisão.
 *
 * @param originalName - Nome original do arquivo.
 * @returns Nome sanitizado único.
 */
function sanitizeFileName(originalName: string): string {
  const timestamp: number = Date.now();
  const random: string = Math.random().toString(36).substring(2, 8);
  const ext: string = path.extname(originalName).toLowerCase();
  const baseName: string = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
    .substring(0, 50);

  return `${timestamp}-${random}-${baseName}${ext}`;
}

/**
 * Processa e salva um arquivo com validações de segurança.
 * Valida magic bytes, extensão, sanitiza nome, e salva em subpasta.
 *
 * @param file - Objeto de arquivo do multer (com buffer, originalname, size).
 * @param config - Configurações opcionais de validação.
 * @returns Resultado com caminho do arquivo salvo.
 * @throws {Error} Se o arquivo for inválido (tipo não permitido, muito grande).
 */
async function uploadFile(
  file: MulterFile,
  config: UploadConfig = {}
): Promise<UploadResult> {
  const {
    allowedMimes = [],
    allowedExtensions = ALLOWED_EXTENSIONS.all,
    maxSize = DEFAULT_MAX_SIZE,
    subfolder = 'general'
  } = config;

  // Valida tamanho
  if (file.size > maxSize) {
    throw Object.assign(
      new Error(`Arquivo muito grande. Máximo: ${Math.round(maxSize / 1024 / 1024)}MB`),
      { statusCode: 400 }
    );
  }

  // Valida extensão
  const ext: string = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    throw Object.assign(
      new Error(`Extensão "${ext}" não permitida. Permitidas: ${allowedExtensions.join(', ')}`),
      { statusCode: 400 }
    );
  }

  // Valida magic bytes (assinatura real do arquivo)
  if (file.buffer) {
    const magicResult = Validators.validateFileMagic(file.buffer, allowedMimes);
    if (!magicResult.valid) {
      throw Object.assign(
        new Error(`Tipo de arquivo não permitido. Detectado: ${magicResult.mime || 'desconhecido'}`),
        { statusCode: 400 }
      );
    }
  }

  // Sanitiza nome
  const safeFilename: string = sanitizeFileName(file.originalname);

  // Define caminho
  const relativeDir: string = `uploads/${subfolder}`;
  const absoluteDir: string = path.resolve(process.cwd(), relativeDir);

  // Garante que o diretório existe
  if (!fs.existsSync(absoluteDir)) {
    fs.mkdirSync(absoluteDir, { recursive: true });
  }

  // Salva o arquivo
  const absolutePath: string = path.join(absoluteDir, safeFilename);
  if (file.buffer) {
    fs.writeFileSync(absolutePath, file.buffer);
  } else if (file.path) {
    const sourcePath: string = path.resolve(file.path);
    if (sourcePath !== absolutePath) {
      fs.renameSync(sourcePath, absolutePath);
    }
  } else {
    throw Object.assign(new Error('Nenhum dado de arquivo disponível para salvar'), {
      statusCode: 400
    });
  }

  return {
    success: true,
    filename: safeFilename,
    path: `${relativeDir}/${safeFilename}`,
    size: file.size,
    mime: file.mimetype
  };
}

/**
 * Remove um arquivo enviado anteriormente pelo caminho relativo.
 *
 * @param relativePath - Caminho relativo do arquivo (ex.: 'uploads/products/abc.jpg').
 * @returns `true` se removido com sucesso, `false` se não existir.
 */
function deleteFile(relativePath: string): boolean {
  const absolutePath: string = path.resolve(process.cwd(), relativePath);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
    return true;
  }
  return false;
}

export { uploadFile, deleteFile, sanitizeFileName, UploadConfig, UploadResult };
export default { uploadFile, deleteFile, sanitizeFileName };
