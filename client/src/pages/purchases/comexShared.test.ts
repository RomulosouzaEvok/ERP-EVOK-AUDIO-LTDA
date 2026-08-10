import { describe, it, expect } from 'vitest';

import { translateComexError } from './comexShared';

/**
 * O gate G11-COMEX responde 422 com `details = { rule: 'G11-COMEX', ... }`.
 * O tradutor genérico (`translateApiError`) transformaria isso em linhas
 * cruas do tipo "missing_roles: diretor" na tela do operador — este teste
 * fixa a tradução em linguagem de fábrica e garante que nenhum nome de campo
 * técnico vaze.
 */
function axiosErrorWith(details: unknown, message = 'Erro de regra de negocio.') {
  return {
    isAxiosError: true,
    message: 'Request failed with status code 422',
    response: { status: 422, data: { success: false, error: { code: 'BUSINESS_RULE_VIOLATION', message, details } } },
  };
}

describe('translateComexError — gate de aprovação da diretoria (G11-COMEX)', () => {
  it('explica a aprovação pendente sem expor nomes técnicos de campo', () => {
    const result = translateComexError(
      axiosErrorWith({ rule: 'G11-COMEX', required_roles: ['diretor'], missing_roles: ['diretor'] }),
      'Não foi possível registrar o embarque.',
    );

    expect(result.title).toBe('Não foi possível registrar o embarque.');
    expect(result.reasons.join(' ')).toContain('Diretoria');
    expect(result.reasons.join(' ')).not.toContain('missing_roles');
    expect(result.reasons.join(' ')).not.toContain('G11-COMEX');
    expect(result.action?.label).toContain('Diretoria');
  });

  it('explica o congelamento de valores no embarque', () => {
    const result = translateComexError(
      axiosErrorWith({ rule: 'G11-COMEX', frozen_fields: ['exchange_rate', 'freight_value'] }),
      'Não foi possível registrar o embarque.',
    );

    const text = result.reasons.join(' ');
    expect(text).toContain('câmbio');
    expect(text).toContain('frete');
    expect(text).not.toContain('exchange_rate');
    expect(result.action?.label).toContain('cancele e recrie');
  });

  it('explica que aprovação retroativa não existe quando o processo saiu de rascunho', () => {
    const result = translateComexError(
      axiosErrorWith({ rule: 'G11-COMEX', current_status: 'shipped' }),
      'Não foi possível aprovar.',
    );

    const text = result.reasons.join(' ');
    expect(text).toContain('Embarcado');
    expect(text).toContain('Rascunho');
  });

  it('delega para o tradutor genérico quando o erro não é do gate', () => {
    const result = translateComexError(
      axiosErrorWith({ current_status: 'draft', expected_event: 'shipped' }, 'Sequência de acompanhamento inválida.'),
      'Não foi possível registrar a chegada.',
    );

    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons.join(' ')).toContain('draft');
  });
});
