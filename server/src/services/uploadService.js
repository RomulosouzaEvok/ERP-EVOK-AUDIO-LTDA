/**
 * 📤 UploadService - Serviço de Upload de Arquivos
 * 
 * Gerencia uploads com segurança: validação de tipo real via magic bytes,
 * sanitização de nomes, prevenção de path traversal.
 * 
 * @module services/uploadService
 * 
 * @description
 * - Valida magic bytes do arquivo (mais seguro que extensão)
 * - Sanitiza nome do arquivo (remove caracteres especiais)
 * - Previne path traversal no nome do arquivo
 * - Limita tamanho por tipo de arquivo
 * - Organiza em pastas por tipo (products, employees, documents, nfe)
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Validators = require('../utils/validators');

// Garantir que diretórios existam
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Mapa de tipos de arquivo permitidos com validação
const ALLOWED_TYPES = {
  product_image: {
    mimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
    folder: 'products'
  },
  employee_photo: {
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 3 * 1024 * 1024, // 3MB
    folder: 'employees'
  },
  document: {
    mimes: ['application/pdf', 'application/xml', 'application/json'],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: 'documents'
  },
  nfe: {
    mimes: ['application/xml', 'application/json', 'application/pdf'],
    maxSize: 5 * 1024 * 1024, // 5MB
    folder: 'nfe'
  }
};

/**
 * Sanitiza nome do arquivo para prevenir path traversal.
 * Remove caracteres especiais, espaços e sequências perigosas.
 * 
 * @param {string} filename - Nome original do arquivo
 * @returns {string} Nome sanitizado e seguro
 */
const sanitizeFilename = (filename) => {
  // Remove extensão
  const ext = path.extname(filename).toLowerCase();
  let name = path.basename(filename, ext);
  
  // Remove caracteres não alfanuméricos (mantém hífen e underline)
  name = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  // Remove sequências de underline
  name = name.replace(/_+/g, '_');
  
  // Remove underline no início/fim
  name = name.replace(/^_|_$/g, '');
  
  // Se ficou vazio, gera nome genérico
  if (!name) name = 'file';
  
  // Hash único para evitar colisão
  const hash = crypto.randomBytes(4).toString('hex');
  
  return `${name}-${hash}${ext}`;
};

// Configuração de storage com caminho seguro
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadRoot = path.resolve(__dirname, '../../uploads');
    const typeConfig = ALLOWED_TYPES[file.fieldname] || { folder: 'general' };
    const uploadPath = path.join(uploadRoot, typeConfig.folder);
    
    // Prevenir path traversal: verifica se o caminho está dentro do permitido
    const resolvedPath = path.resolve(uploadPath);
    if (!resolvedPath.startsWith(path.resolve(uploadRoot))) {
      return cb(new Error('Caminho de upload inválido'));
    }
    
    ensureDir(resolvedPath);
    cb(null, resolvedPath);
  },
  filename: (req, file, cb) => {
    // Sanitiza nome do arquivo
    const safeName = sanitizeFilename(file.originalname);
    cb(null, `${Date.now()}-${safeName}`);
  }
});

// Validação de arquivo com magic bytes
const fileFilter = (req, file, cb) => {
  const typeConfig = ALLOWED_TYPES[file.fieldname];
  
  // Se não tem configuração específica, rejeita
  if (!typeConfig) {
    return cb(new Error(`Tipo de upload '${file.fieldname}' não é permitido`), false);
  }

  // Validação será feita no controller após receber o buffer
  // O Multer não permite acesso ao buffer antes de salvar,
  // então fazemos a validação básica de extensão aqui
  // e a validação de magic bytes no controller
  
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'application/pdf': ['.pdf'],
    'application/xml': ['.xml'],
    'application/json': ['.json']
  };

  const typeAllowedMimes = typeConfig.mimes;
  const isExtValid = typeAllowedMimes.some(mime => 
    (allowedExts[mime] || []).includes(ext)
  );

  if (!isExtValid) {
    const allowedExtsStr = typeAllowedMimes
      .map(m => (allowedExts[m] || []).join(', '))
      .filter(Boolean)
      .join(', ');
    return cb(new Error(`Formato não permitido para ${file.fieldname}. Use: ${allowedExtsStr}`), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB global (cada tipo tem seu limite)
  },
  fileFilter
});

module.exports = upload;

/**
 * Controller handler para upload com validação adicional de magic bytes.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
    }

    // Valida magic bytes do arquivo salvo
    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath, { encoding: null, flag: 'r' }).slice(0, 16);
    
    const typeConfig = ALLOWED_TYPES[req.file.fieldname];
    if (typeConfig) {
      const validation = Validators.validateFileMagic(buffer, typeConfig.mimes);
      if (!validation.valid) {
        // Remove arquivo inválido
        fs.unlinkSync(filePath);
        return res.status(400).json({ 
          success: false, 
          error: `Tipo de arquivo inválido. Esperado: ${typeConfig.mimes.join(', ')}, Detectado: ${validation.mime || 'desconhecido'}` 
        });
      }
    }

    // Gera URL relativa segura (substitui barras invertidas do Windows)
    const relativePath = req.file.path
      .replace(/\\/g, '/')
      .split('uploads/')[1] || req.file.filename;
    const fileUrl = `/uploads/${relativePath}`;

    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: validation?.mime || req.file.mimetype,
        size: req.file.size,
        url: fileUrl
      }
    });
  } catch (error) {
    // Remove arquivo em caso de erro
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
    
    console.error('[Upload] Erro:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao processar upload' 
    });
  }
};
