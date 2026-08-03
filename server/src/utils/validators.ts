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
 *
 * Primeiro arquivo migrado para TypeScript (Fase 7 do docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md) — mantém a
 * mesma API pública (`module.exports = Validators`) para não quebrar os
 * dezenas de `require('../utils/validators')` já existentes em código JS.
 */

type DocumentType = 'cpf' | 'cnpj';

interface DocumentValidationResult {
  valid: boolean;
  type: DocumentType | null;
  formatted: string | null;
  error: string | null;
}

interface FileMagicValidationResult {
  valid: boolean;
  mime: string | null;
}

class Validators {
  // ======================================================================
  // VALIDAÇÃO DE DOCUMENTOS BRASILEIROS
  // ======================================================================

  /**
   * Valida CPF (11 dígitos) com cálculo dos dígitos verificadores.
   *
   * @example
   * Validators.isValidCPF('529.982.247-25') // true
   * Validators.isValidCPF('111.111.111-11') // false (sequência)
   */
  static isValidCPF(cpf?: string | null): boolean {
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
   * @example
   * Validators.isValidCNPJ('11.444.777/0001-61') // true
   */
  static isValidCNPJ(cnpj?: string | null): boolean {
    if (!cnpj) return false;
    const cleaned = cnpj.replace(/[^\d]/g, '');
    if (cleaned.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cleaned)) return false;

    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(cleaned.charAt(i)) * w1[i];
    let rem = sum % 11;
    const d1 = rem < 2 ? 0 : 11 - rem;
    if (d1 !== parseInt(cleaned.charAt(12))) return false;

    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    sum = 0;
    for (let i = 0; i < 13; i++) sum += parseInt(cleaned.charAt(i)) * w2[i];
    rem = sum % 11;
    const d2 = rem < 2 ? 0 : 11 - rem;
    if (d2 !== parseInt(cleaned.charAt(13))) return false;

    return true;
  }

  /**
   * Valida CPF ou CNPJ automaticamente baseado no tamanho.
   */
  static validateDocument(document?: string | null): DocumentValidationResult {
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

  static isValidEmail(email?: string | null): boolean {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static isValidCEP(cep?: string | null): boolean {
    if (!cep) return false;
    return cep.replace(/[^\d]/g, '').length === 8;
  }

  static isValidPhone(phone?: string | null): boolean {
    if (!phone) return false;
    const cleaned = phone.replace(/[^\d]/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
  }

  // ======================================================================
  // FORMATAÇÃO PARA EXIBIÇÃO
  // ======================================================================

  static formatCPF(cpf: string): string {
    const cleaned = cpf.replace(/[^\d]/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  static formatCNPJ(cnpj: string): string {
    const cleaned = cnpj.replace(/[^\d]/g, '');
    if (cleaned.length !== 14) return cnpj;
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  // ======================================================================
  // SEGURANÇA - SANITIZAÇÃO
  // ======================================================================

  /**
   * Sanitiza string para busca segura (evita injection via Op.like).
   *
   * @example
   * sanitizeSearch('%admin_') // '\\%admin\\_'
   */
  static sanitizeSearch(str?: string | null): string {
    if (!str) return '';
    return String(str).replace(/[%_]/g, '\\$&');
  }

  /**
   * Sanitiza erro para não vazar detalhes internos do sistema.
   * Em produção, retorna mensagem genérica. Em dev, retorna detalhes.
   */
  static sanitizeError(error: Error | { message?: string }, productionMessage = 'Erro interno do servidor'): string {
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
  static FILE_MAGIC_BYTES: Record<string, string> = {
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
   * @example
   * validateFileMagic(buffer, ['image/jpeg', 'image/png'])
   * // { valid: true, mime: 'image/jpeg' }
   */
  static validateFileMagic(buffer?: Buffer | null, allowedMimes: string[] = []): FileMagicValidationResult {
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

export = Validators;
