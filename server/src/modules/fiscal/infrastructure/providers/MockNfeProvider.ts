/**
 * Provedor de NF-e "mock" — não fala com nenhum SEFAZ nem serviço externo.
 * Simula autorização imediata com uma chave de acesso sinteticamente
 * gerada (44 dígitos, formato válido mas NÃO uma chave real), usada como
 * padrão de fábrica (`NFE_PROVIDER` não configurado) para permitir testar
 * o fluxo completo de emissão em ambiente local/CI sem depender de
 * credenciais reais.
 *
 * NUNCA deve ser usado com `nfe_environment = 'producao'` — a NF-e
 * "autorizada" por este provedor não tem validade fiscal alguma.
 *
 * @module modules/fiscal/infrastructure/providers/MockNfeProvider
 */

import crypto from 'crypto';
import { NfeProviderPort } from '../../domain/ports/NfeProviderPort';

class MockNfeProvider extends NfeProviderPort {
  async issue(payload: any) {
    const key = Array.from({ length: 44 }, () => crypto.randomInt(0, 10)).join('');
    return {
      status: 'authorized' as const,
      key,
      number: String(payload.number),
      series: payload.series,
      protocol: `MOCK-${Date.now()}`,
      xml_url: null,
      danfe_url: null,
      provider_ref: payload.ref,
      error_message: null,
    };
  }

  async queryStatus(providerRef: string) {
    return {
      status: 'authorized' as const,
      key: null,
      number: null,
      series: null,
      protocol: `MOCK-${Date.now()}`,
      xml_url: null,
      danfe_url: null,
      provider_ref: providerRef,
      error_message: null,
    };
  }

  async cancel(providerRef: string, _reason: string) {
    return {
      status: 'cancelled' as const,
      key: null,
      number: null,
      series: null,
      protocol: `MOCK-CANCEL-${Date.now()}`,
      xml_url: null,
      danfe_url: null,
      provider_ref: providerRef,
      error_message: null,
    };
  }
}

export = MockNfeProvider;
