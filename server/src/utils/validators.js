/**
 * 🛡️ Validators - Utilitários de Validação ERP EVOK ÁUDIO
 * 
 * Funções de validação para documentos brasileiros (CPF, CNPJ),
 * validações de negócio e segurança de dados.
 * 
 * @module utils/validators
 * 
 * @description
 * Centraliza todas as validações de dados da aplicação:
 * - Documentos fiscais (CPF, CNPJ)
 * - Contato (email, telefone, CEP)
 * - Formatação para exibição
 * - Validação de arquivos (magic bytes)
 * - Sanitização de strings para busca segura
 */

class Validators {
  // ======================================================================
  // VALIDAÇÃO DE DOCUMENTOS BRASILEIROS
  // ======================================================================

  /**
   * Valida CPF (11 dígitos) com cálculo dos dígitos verificadores.
   * 
   * @param {string} cpf - CPF com ou sem formatação (pontos, traços)
   * @returns {boolean} Verdadeiro se CPF for válido
   * 
   * @example
   * Validators.isValidCPF('529.982.247-25') // true
   * Validators.isValidCPF('111.111.111-11') // false (sequência)
   */
  static isValidCPF(cpf) {
    if (!cpf) return false;
    const cleaned = cpf.replace(/[^\d]/g, '');
    if (cleaned.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleaned)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cleaned.charAt(i)) * (10 - i);
    let remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== parseInt(cleaned.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cleaned.charAt(i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== parseInt(cleaned.charAt(10))) return false;

    return true;
  }

  /**
   * Valida CNPJ (14 dígitos) com cálculo dos dígitos verificadores.
   * 
   * @param {string} cnpj - CNPJ com ou sem formatação
   * @returns {boolean} Verdadeiro se CNPJ for válido
   * 
   * @example
   * Validators.isValidCNPJ('11.444.777/0001-61') // true
   */
  static isValidCNPJ(cnpj) {
    if (!cnpj) return false;
    const cleaned = cnpj.replace(/[^\d]/g, '');
    if (cleaned.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cleaned)) return false;

    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(cleaned.charAt(i)) * w1[i];
    let rem = sum % 11;
    let d1 = rem < 2 ? 0 : 11 - rem;
    if (d1 !== parseInt(cleaned.charAt(12))) return false;

    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    sum = 0;
    for (let i = 0; i < 13; i++) sum += parseInt(cleaned.charAt(i)) * w2[i];
    rem = sum % 11;
    let d2 = rem < 2 ? 0 : 11 - rem;
    if (d2 !== parseInt(cleaned.charAt(13))) return false;

    return true;
  }

  /**
   * Valida CPF ou CNPJ automaticamente baseado no tamanho.
   * @param {string} document - CPF (11 dígitos) ou CNPJ (14 dígitos)
   * @returns {{ valid: boolean, type: 'cpf'|'cnpj'|null, formatted: string|null, error: string|null }}
   */
  static validateDocument(document) {
    if (!document) {
      return { valid: false, type: null, formatted: null, error: 'Documento não informado' };
    }
    const cleaned = document.replace(/[^\d]/g, '');
    if (cleaned.length === 11) {
      const valid = this.isValidCPF(cleaned);
      return { valid, type: 'cpf', formatted: valid ? this.formatCPF(cleaned) : null, error: valid ? null : 'CPF inválido' };
    }
    if (cleaned.length === 14) {
      const valid = this.isValidCNPJ(cleaned);
      return { valid, type: 'cnpj', formatted: valid ? this.formatCNPJ(cleaned) : null, error: valid ? null : 'CNPJ inválido' };
    }
    return { valid: false, type: null, formatted: null, error: `Documento com ${cleaned.length} dígitos. CPF=11, CNPJ=14` };
  }

  // ======================================================================
  // VALIDAÇÕES DE CONTATO
  // ======================================================================

  static isValidEmail(email) {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static isValidCEP(cep) {
    if (!cep) return false;
    return cep.replace(/[^\d]/g, '').length === 8;
  }

  static isValidPhone(phone) {
    if (!phone) return false;
    const cleaned = phone.replace(/[^\d]/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
  }

  // ======================================================================
  // FORMATAÇÃO PARA EXIBIÇÃO
  // ======================================================================

  static formatCPF(cpf) {
    const cleaned = cpf.replace(/[^\d]/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  static formatCNPJ(cnpj) {
    const cleaned = cnpj.replace(/[^\d]/g, '');
    if (cleaned.length !== 14) return cnpj;
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  // ======================================================================
  // SEGURANÇA - SANITIZAÇÃO
  // ======================================================================

  /**
   * Sanitiza string para busca segura (evita injection via Op.like).
   * Remove/preveni caracteres especiais usados em LIKE injection.
   * 
   * @param {string} str - String a ser sanitizada
   * @returns {string} String segura para busca
   * 
   * @example
   * sanitizeSearch('%admin_') // '\\%admin\\_'
   */
  static sanitizeSearch(str) {
    if (!str) return '';
    return String(str).replace(/[%_]/g, '\\$&');
  }

  /**
   * Sanitiza erro para não vazar detalhes internos do sistema.
   * Em produção, retorna mensagem genérica. Em dev, retorna detalhes.
   * 
   * @param {Error} error - Objeto de erro
   * @param {string} [productionMessage='Erro interno do servidor'] - Mensagem para produção
   * @returns {string} Mensagem sanitizada
   */
  static sanitizeError(error, productionMessage = 'Erro interno do servidor') {
    if (process.env.NODE_ENV === 'production') {
      return productionMessage;
    }
    return error.message || productionMessage;
  }

  // ======================================================================
  // VALIDAÇÃO DE ARQUIVOS (MAGIC BYTES)
  // ======================================================================

  /**
   * Mapa de magic bytes para validação real de tipo de arquivo.
   * Mais seguro que validar apenas extensão.
   */
  static FILE_MAGIC_BYTES = {
    '89504E47': 'image/png',
    'FFD8FF': 'image/jpeg',
    '47494638': 'image/gif',
    '504446': 'application/pdf',
    '25504446': 'application/pdf',
    '52494646': 'image/webp',
    '3C3F786D': 'application/xml',
    '3C78736C': 'application/xml',
    '7B': 'application/json',
    '5B': 'application/json'
  };

  /**
   * Valida se o buffer do arquivo corresponde a um tipo MIME esperado.
   * 
   * @param {Buffer} buffer - Buffer com os primeiros bytes do arquivo
   * @param {string[]} allowedMimes - Array de MIME types permitidos (ex: ['image/jpeg', 'image/png'])
   * @returns {{ valid: boolean, mime: string|null }} Resultado da validação
   * 
   * @example
   * validateFileMagic(buffer, ['image/jpeg', 'image/png'])
   * // { valid: true, mime: 'image/jpeg' }
   */
  static validateFileMagic(buffer, allowedMimes = []) {
    if (!buffer || buffer.length < 4) {
      return { valid: false, mime: null };
    }

    const hex = buffer.toString('hex').toUpperCase();
    
    for (const [magic, mime] of Object.entries(this.FILE_MAGIC_BYTES)) {
      if (hex.startsWith(magic)) {
        const allowed = allowedMimes.length === 0 || allowedMimes.includes(mime);
        return { valid: allowed, mime };
      }
    }

    return { valid: allowedMimes.length === 0, mime: null };
  }
}

module.exports = Validators;
