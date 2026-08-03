/**
 * Adapter para a API da Focus NFe (https://focusnfe.com.br).
 *
 * ⚠️ IMPORTANTE ANTES DE USAR EM PRODUÇÃO: o formato exato do payload JSON
 * abaixo foi montado com base na documentação pública conhecida da Focus
 * NFe (autenticação HTTP Basic com o token como usuário, endpoint
 * `/v2/nfe`), mas a Focus NFe pode ter alterado nomes de campos desde
 * então. Antes da primeira emissão real, valide o payload contra a
 * documentação atual em https://focusnfe.com.br/doc/ usando o ambiente de
 * homologação (`FOCUS_NFE_ENVIRONMENT=homologacao`), que não gera NF-e com
 * valor fiscal.
 *
 * Autenticação: HTTP Basic, `FOCUS_NFE_TOKEN` como usuário, senha vazia.
 * Certificado digital A1: é cadastrado diretamente no painel da Focus NFe
 * (upload do .pfx + senha), o ERP nunca manipula o certificado diretamente.
 *
 * @module modules/fiscal/infrastructure/providers/FocusNfeProvider
 */

import { NfeProviderPort } from '../../domain/ports/NfeProviderPort';

const BASE_URLS = {
  homologacao: 'https://homologacao.focusnfe.com.br',
  producao: 'https://api.focusnfe.com.br',
};

function mapFocusStatus(focusStatus: string): 'authorized' | 'processing' | 'denied' | 'cancelled' {
  switch (focusStatus) {
    case 'autorizado': return 'authorized';
    case 'cancelado': return 'cancelled';
    case 'erro_autorizacao':
    case 'denegado':
      return 'denied';
    default: return 'processing';
  }
}

class FocusNfeProvider extends NfeProviderPort {
  private token: string;
  private baseUrl: string;

  constructor() {
    super();
    const token = process.env.FOCUS_NFE_TOKEN;
    if (!token) {
      throw new Error('FOCUS_NFE_TOKEN não configurado.');
    }
    this.token = token;
    this.baseUrl = BASE_URLS[(process.env.FOCUS_NFE_ENVIRONMENT as 'homologacao' | 'producao') || 'homologacao'];
  }

  private authHeader(): string {
    return `Basic ${Buffer.from(`${this.token}:`).toString('base64')}`;
  }

  async issue(payload: any) {
    const body = {
      natureza_operacao: 'Venda de mercadoria',
      data_emissao: new Date().toISOString(),
      tipo_documento: 1,
      finalidade_emissao: 1,
      cnpj_emitente: payload.company.cnpj.replace(/\D/g, ''),
      serie: payload.series,
      numero: payload.number,
      nome_destinatario: payload.client.name,
      cpf_cnpj_destinatario: payload.client.cpf_cnpj.replace(/\D/g, ''),
      inscricao_estadual_destinatario: payload.client.ie || undefined,
      email_destinatario: payload.client.email || undefined,
      logradouro_destinatario: payload.client.address.street,
      numero_destinatario: payload.client.address.number,
      bairro_destinatario: payload.client.address.neighborhood,
      municipio_destinatario: payload.client.address.city,
      codigo_municipio_destinatario: payload.client.address.city_ibge_code,
      uf_destinatario: payload.client.address.state,
      cep_destinatario: payload.client.address.cep,
      items: payload.items.map((item: any, index: number) => ({
        numero_item: index + 1,
        codigo_produto: item.code,
        descricao: item.description,
        ncm: item.ncm,
        cfop: item.cfop,
        unidade_comercial: item.unit,
        quantidade_comercial: item.quantity,
        valor_unitario_comercial: item.unit_price,
        valor_bruto: item.total_price,
        icms_origem: '0',
        icms_situacao_tributaria: item.icms_cst,
        icms_aliquota: item.icms_aliquot,
        icms_base_calculo: item.icms_base,
        icms_valor: item.icms_value,
        pis_situacao_tributaria: item.pis_cst,
        pis_aliquota_porcentual: item.pis_aliquot,
        pis_valor: item.pis_value,
        cofins_situacao_tributaria: item.cofins_cst,
        cofins_aliquota_porcentual: item.cofins_aliquot,
        cofins_valor: item.cofins_value,
      })),
    };

    const response = await fetch(`${this.baseUrl}/v2/nfe?ref=${encodeURIComponent(payload.ref)}`, {
      method: 'POST',
      headers: { Authorization: this.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data: any = await response.json().catch(() => ({}));

    if (!response.ok && response.status !== 202) {
      return {
        status: 'denied' as const,
        key: null, number: null, series: null, protocol: null,
        xml_url: null, danfe_url: null,
        provider_ref: payload.ref,
        error_message: data?.mensagem || `Focus NFe retornou HTTP ${response.status}`,
      };
    }

    return {
      status: mapFocusStatus(data.status),
      key: data.chave_nfe || null,
      number: data.numero != null ? String(data.numero) : null,
      series: data.serie ?? null,
      protocol: data.protocolo || null,
      xml_url: data.caminho_xml_nota_fiscal || null,
      danfe_url: data.caminho_danfe || null,
      provider_ref: payload.ref,
      error_message: data.mensagem_sefaz || data.mensagem || null,
    };
  }

  async queryStatus(providerRef: string) {
    const response = await fetch(`${this.baseUrl}/v2/nfe/${encodeURIComponent(providerRef)}`, {
      headers: { Authorization: this.authHeader() },
    });
    const data: any = await response.json().catch(() => ({}));

    return {
      status: mapFocusStatus(data.status),
      key: data.chave_nfe || null,
      number: data.numero != null ? String(data.numero) : null,
      series: data.serie ?? null,
      protocol: data.protocolo || null,
      xml_url: data.caminho_xml_nota_fiscal || null,
      danfe_url: data.caminho_danfe || null,
      provider_ref: providerRef,
      error_message: data.mensagem_sefaz || data.mensagem || null,
    };
  }

  async cancel(providerRef: string, reason: string) {
    const response = await fetch(`${this.baseUrl}/v2/nfe/${encodeURIComponent(providerRef)}`, {
      method: 'DELETE',
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
        error_message: data?.mensagem || `Focus NFe retornou HTTP ${response.status} ao cancelar`,
      };
    }

    return {
      status: 'cancelled' as const,
      key: data.chave_nfe || null,
      number: null,
      series: null,
      protocol: data.protocolo || null,
      xml_url: null,
      danfe_url: null,
      provider_ref: providerRef,
      error_message: null,
    };
  }
}

export = FocusNfeProvider;
