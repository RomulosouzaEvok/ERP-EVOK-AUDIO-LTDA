/**
 * Contrato (porta) que qualquer provedor de emissão de NF-e deve
 * implementar. A camada de aplicação (use cases) depende apenas desta
 * interface, nunca de um provedor concreto — permite trocar de provedor
 * (mock/Focus NFe/eNotas) via configuração, sem alterar a lógica de
 * negócio.
 *
 * @module modules/fiscal/domain/ports/NfeProviderPort
 */

export interface NfeIssuePayload {
  ref: string; // Referencia unica gerada pelo ERP (idempotencia da emissao)
  environment: 'homologacao' | 'producao';
  company: {
    cnpj: string;
    legal_name: string;
    ie: string | null;
    crt: '1' | '2' | '3';
    address: {
      cep: string | null;
      street: string | null;
      number: string | null;
      complement: string | null;
      neighborhood: string | null;
      city: string | null;
      city_ibge_code: string | null;
      state: string | null;
    };
  };
  client: {
    name: string;
    cpf_cnpj: string;
    ie: string | null;
    ind_ie: string | null;
    email: string | null;
    address: {
      cep: string | null;
      street: string | null;
      number: string | null;
      complement: string | null;
      neighborhood: string | null;
      city: string | null;
      city_ibge_code: string | null;
      state: string | null;
    };
  };
  series: number;
  number: number;
  items: Array<{
    code: string;
    description: string;
    ncm: string;
    cfop: string;
    unit: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    icms_cst: string;
    icms_aliquot: number;
    icms_base: number;
    icms_value: number;
    ipi_cst: string;
    ipi_aliquot: number;
    ipi_value: number;
    pis_cst: string;
    pis_aliquot: number;
    pis_value: number;
    cofins_cst: string;
    cofins_aliquot: number;
    cofins_value: number;
  }>;
  total_amount: number;
}

export interface NfeProviderResult {
  status: 'authorized' | 'processing' | 'denied' | 'cancelled';
  key: string | null;
  number: string | null;
  series: number | null;
  protocol: string | null;
  xml_url: string | null;
  danfe_url: string | null;
  provider_ref: string;
  error_message: string | null;
}

/**
 * @abstract
 */
export class NfeProviderPort {
  /**
   * Emite uma NF-e. Pode retornar `processing` (assíncrono — status final
   * chega depois via webhook/polling) ou já retornar `authorized`/`denied`
   * de forma síncrona, dependendo do provedor.
   *
   * @abstract
   */
  async issue(_payload: NfeIssuePayload): Promise<NfeProviderResult> {
    throw new Error('NfeProviderPort.issue não implementado.');
  }

  /**
   * Consulta o status atual de uma NF-e já emitida (usado para polling e
   * para reconciliar webhooks, sem confiar cegamente no payload recebido).
   *
   * @abstract
   */
  async queryStatus(_providerRef: string): Promise<NfeProviderResult> {
    throw new Error('NfeProviderPort.queryStatus não implementado.');
  }

  /**
   * Cancela uma NF-e já autorizada.
   *
   * @abstract
   */
  async cancel(_providerRef: string, _reason: string): Promise<NfeProviderResult> {
    throw new Error('NfeProviderPort.cancel não implementado.');
  }
}

export default NfeProviderPort;
module.exports = NfeProviderPort;
module.exports.NfeProviderPort = NfeProviderPort;
module.exports.default = NfeProviderPort;
