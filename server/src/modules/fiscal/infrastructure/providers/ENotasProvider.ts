/**
 * Adapter para a API da eNotas (https://enotasgw.com.br).
 *
 * ⚠️ IMPORTANTE ANTES DE USAR EM PRODUÇÃO: assim como o adapter da Focus
 * NFe, o formato do payload abaixo segue o padrão REST publicamente
 * documentado da eNotas (autenticação HTTP Basic com a API key como
 * usuário, empresa identificada por `ENOTAS_EMPRESA_ID`), mas deve ser
 * validado contra a documentação atual (https://docs.enotasgw.com.br/)
 * em ambiente de homologação antes da primeira emissão real.
 *
 * @module modules/fiscal/infrastructure/providers/ENotasProvider
 */

import { NfeProviderPort } from '../../domain/ports/NfeProviderPort';

const BASE_URL = 'https://api.enotasgw.com.br/v1';

function mapENotasStatus(status: string): 'authorized' | 'processing' | 'denied' | 'cancelled' {
  switch (status) {
    case 'Emitida': return 'authorized';
    case 'Cancelada': return 'cancelled';
    case 'Erro':
    case 'NaoEmitida':
      return 'denied';
    default: return 'processing';
  }
}

class ENotasProvider extends NfeProviderPort {
  private apiKey: string;
  private empresaId: string;

  constructor() {
    super();
    const apiKey = process.env.ENOTAS_API_KEY;
    const empresaId = process.env.ENOTAS_EMPRESA_ID;
    if (!apiKey || !empresaId) {
      throw new Error('ENOTAS_API_KEY e ENOTAS_EMPRESA_ID são obrigatórios.');
    }
    this.apiKey = apiKey;
    this.empresaId = empresaId;
  }

  private authHeader(): string {
    return `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`;
  }

  async issue(payload: any) {
    const body = {
      idExterno: payload.ref,
      ambienteEmissao: payload.environment === 'producao' ? 'Producao' : 'Homologacao',
      cliente: {
        nome: payload.client.name,
        cpfCnpj: payload.client.cpf_cnpj.replace(/\D/g, ''),
        inscricaoEstadual: payload.client.ie || undefined,
        email: payload.client.email || undefined,
        endereco: {
          logradouro: payload.client.address.street,
          numero: payload.client.address.number,
          bairro: payload.client.address.neighborhood,
          cidade: payload.client.address.city,
          codigoCidadeIBGE: payload.client.address.city_ibge_code,
          uf: payload.client.address.state,
          cep: payload.client.address.cep,
        },
      },
      itens: payload.items.map((item: any) => ({
        codigo: item.code,
        descricao: item.description,
        ncm: item.ncm,
        cfop: item.cfop,
        unidade: item.unit,
        quantidade: item.quantity,
        valorUnitario: item.unit_price,
        valorTotal: item.total_price,
        icms: { situacaoTributaria: item.icms_cst, aliquota: item.icms_aliquot, baseCalculo: item.icms_base, valor: item.icms_value },
        pis: { situacaoTributaria: item.pis_cst, aliquota: item.pis_aliquot, valor: item.pis_value },
        cofins: { situacaoTributaria: item.cofins_cst, aliquota: item.cofins_aliquot, valor: item.cofins_value },
      })),
    };

    const response = await fetch(`${BASE_URL}/empresas/${this.empresaId}/nfes`, {
      method: 'POST',
      headers: { Authorization: this.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        status: 'denied' as const,
        key: null, number: null, series: null, protocol: null,
        xml_url: null, danfe_url: null,
        provider_ref: payload.ref,
        error_message: data?.mensagem || data?.message || `eNotas retornou HTTP ${response.status}`,
      };
    }

    return {
      status: mapENotasStatus(data.status),
      key: data.chaveAcesso || null,
      number: data.numero != null ? String(data.numero) : null,
      series: data.serie ?? null,
      protocol: data.protocolo || null,
      xml_url: data.linkDownloadXML || null,
      danfe_url: data.linkDownloadPDF || null,
      provider_ref: data.id || payload.ref,
      error_message: data.motivo || null,
    };
  }

  async queryStatus(providerRef: string) {
    const response = await fetch(`${BASE_URL}/empresas/${this.empresaId}/nfes/${encodeURIComponent(providerRef)}`, {
      headers: { Authorization: this.authHeader() },
    });
    const data: any = await response.json().catch(() => ({}));

    return {
      status: mapENotasStatus(data.status),
      key: data.chaveAcesso || null,
      number: data.numero != null ? String(data.numero) : null,
      series: data.serie ?? null,
      protocol: data.protocolo || null,
      xml_url: data.linkDownloadXML || null,
      danfe_url: data.linkDownloadPDF || null,
      provider_ref: providerRef,
      error_message: data.motivo || null,
    };
  }

  async cancel(providerRef: string, reason: string) {
    const response = await fetch(`${BASE_URL}/empresas/${this.empresaId}/nfes/${encodeURIComponent(providerRef)}/cancelamento`, {
      method: 'POST',
      headers: { Authorization: this.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ justificativa: reason }),
    });
    const data: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        status: 'denied' as const,
        key: null, number: null, series: null, protocol: null,
        xml_url: null, danfe_url: null,
        provider_ref: providerRef,
        error_message: data?.mensagem || data?.message || `eNotas retornou HTTP ${response.status} ao cancelar`,
      };
    }

    return {
      status: 'cancelled' as const,
      key: null, number: null, series: null,
      protocol: data.protocolo || null,
      xml_url: null, danfe_url: null,
      provider_ref: providerRef,
      error_message: null,
    };
  }
}

export = ENotasProvider;
