import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

import { translateApiError } from './translateApiError';

describe('translateApiError', () => {
  it('lista TODAS as pendências quando details é um array direto (Regra 3, nunca só a primeira)', () => {
    const error = buildAxiosError({
      success: false,
      error: {
        code: 'BUSINESS_RULE_VIOLATION',
        message: 'Requisição possui itens sem fornecedor resolvível.',
        details: ['MP-IMA-120', 'MP-BOB-08', 'MP-CAB-15'],
      },
    });

    const result = translateApiError(error, 'Não é possível converter a Requisição #78', 'convert-requisition');

    expect(result.title).toBe('Não é possível converter a Requisição #78');
    expect(result.reasons).toEqual(['MP-IMA-120', 'MP-BOB-08', 'MP-CAB-15']);
    expect(result.reasons).toHaveLength(3);
  });

  it('lista TODAS as pendências quando details é um objeto com arrays por chave', () => {
    const error = buildAxiosError({
      success: false,
      error: {
        code: 'BUSINESS_RULE_VIOLATION',
        message: 'Itens sem fornecedor.',
        details: { item_ids_without_supplier: [12, 34, 56] },
      },
    });

    const result = translateApiError(error, 'Não é possível converter a Requisição #78', 'convert-requisition');

    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]).toContain('12, 34, 56');
  });

  it('usa message quando não há details (fluxo alternativo, backend legado)', () => {
    const error = buildAxiosError({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Informe o número da NF-e do fornecedor.' },
    });

    const result = translateApiError(error, 'Não é possível confirmar o recebimento do Pedido PO-2026-0034', 'receive-purchase');

    expect(result.reasons).toEqual(['Informe o número da NF-e do fornecedor.']);
  });

  it('resolve a ação (O QUE FAZER) a partir do mapa de contexto', () => {
    const error = buildAxiosError({
      success: false,
      error: { code: 'BUSINESS_RULE_VIOLATION', message: 'NF-e não autorizada.' },
    });

    const result = translateApiError(error, 'Não é possível marcar a Venda #451 como embarcada', 'ship-sale');

    expect(result.action).toEqual({ label: 'Emitir a NF-e em Vendas', to: '/sales' });
  });

  it('sem contexto, ainda assim preenche uma ação de fallback genérica (nunca botão sem orientação)', () => {
    const error = buildAxiosError({
      success: false,
      error: { code: 'BUSINESS_RULE_VIOLATION', message: 'Falha ao processar.' },
    });

    const result = translateApiError(error, 'Não é possível executar a ação');

    expect(result.action).toBeDefined();
    expect(result.action?.label).toBeTruthy();
  });

  it('trata error no formato string legado sem quebrar', () => {
    const error = buildAxiosError({ success: false, error: 'Email ou senha incorretos' });

    const result = translateApiError(error, 'Não é possível fazer login');

    expect(result.reasons).toEqual(['Email ou senha incorretos']);
  });

  it('usa fallback quando não é um AxiosError', () => {
    const result = translateApiError(new Error('erro genérico de rede'), 'Não é possível concluir a operação');
    expect(result.reasons).toEqual(['erro genérico de rede']);
  });

  it('usa fallbackReason customizado quando o erro não é reconhecível', () => {
    const result = translateApiError('não é um Error', 'Não é possível concluir a operação', undefined, 'Fallback customizado');
    expect(result.reasons).toEqual(['Fallback customizado']);
  });
});

function buildAxiosError(data: unknown): AxiosError {
  const error = new AxiosError('Request failed', undefined, undefined, undefined, {
    data,
    status: 422,
    statusText: 'Unprocessable Entity',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() } as never,
  });
  Object.defineProperty(error, 'isAxiosError', { value: true });
  return error;
}
