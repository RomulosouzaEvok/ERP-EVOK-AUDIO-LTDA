/**
 * Monta o conteúdo de um arquivo de REMESSA CNAB 240 (cobrança registrada,
 * layout simplificado FEBRABAN v1 — ver decisão em `./layouts240.ts`) a
 * partir dos dados bancários da empresa e da lista de títulos
 * (`AccountReceivable`) selecionados.
 *
 * @module modules/financial/infrastructure/cnab/buildRemittanceFile
 */

const { BusinessRuleError } = require('../../../../errors');
const {
  headerArquivoLayout, headerLoteLayout, segmentoPLayout, segmentoQLayout,
  trailerLoteLayout, trailerArquivoLayout, CNAB_SERVICE_TYPE_COBRANCA,
} = require('./layouts240');
const { onlyDigits, formatCnabDate, toCentavos } = require('./cnabFieldUtils');

/** Dados bancários/cadastrais da empresa (cedente), usados no header do arquivo/lote. */
export interface RemittanceCompanyInfo {
  bankCode: string;
  bankName: string;
  agency: string;
  agencyDv?: string | null;
  account: string;
  accountDv?: string | null;
  agencyAccountDv?: string | null;
  covenantCode: string;
  walletCode: string;
  companyDocument: string;
  companyLegalName: string;
}

/** Um título (`AccountReceivable`) a incluir na remessa. */
export interface RemittanceTitleInput {
  /** Número sequencial (1-based) do título dentro do lote — vira `record_sequence` dos segmentos P/Q. */
  sequenceInLot: number;
  /** Nosso número já reservado para este título (`CnabRemittanceItem.nosso_numero`). */
  nossoNumero: string;
  /** Identificação do título na empresa (referência interna — usa o id do `AccountReceivable`). */
  documentNumber: string;
  dueDate: string;
  amount: number;
  issueDate: string;
  payerDocument: string;
  payerName: string;
  payerAddress: string | null;
  payerNeighborhood: string | null;
  payerZip: string | null;
  payerCity: string | null;
  payerState: string | null;
}

export interface BuildRemittanceInput {
  company: RemittanceCompanyInfo;
  titles: RemittanceTitleInput[];
  /** Número sequencial do arquivo de remessa (contador incremental por empresa — `CompanyBankingConfig.next_remittance_number` antes do incremento). */
  fileSequence: number;
  generatedAt: Date;
}

export interface BuildRemittanceResult {
  /** Conteúdo completo do arquivo (linhas de 240 posições separadas por `\r\n`, sem linha final vazia). */
  content: string;
  /** Nome de arquivo sugerido (`REMESSA_<sequencia>_<AAAAMMDD>.REM`). */
  suggestedFilename: string;
  totalRecords: number;
}

/**
 * Monta o arquivo de remessa completo (Header Arquivo, Header Lote,
 * Segmentos P+Q por título, Trailer Lote, Trailer Arquivo).
 *
 * @throws {BusinessRuleError} Se `titles` estiver vazio.
 */
export function buildRemittanceFile({ company, titles, fileSequence, generatedAt }: BuildRemittanceInput): BuildRemittanceResult {
  if (!titles || titles.length === 0) {
    throw new BusinessRuleError('Nenhum título informado para gerar a remessa.');
  }

  const bankCode = onlyDigits(company.bankCode).padStart(3, '0').slice(-3);
  const lines: string[] = [];

  lines.push(headerArquivoLayout.build({
    bank_code: bankCode,
    lot_number: '0000',
    record_type: '0',
    inscription_type: onlyDigits(company.companyDocument).length > 11 ? '2' : '1',
    company_document: company.companyDocument,
    covenant_code: company.covenantCode,
    agency: company.agency,
    agency_dv: company.agencyDv || '',
    account: company.account,
    account_dv: company.accountDv || '',
    agency_account_dv: company.agencyAccountDv || '',
    company_name: company.companyLegalName,
    bank_name: company.bankName,
    file_type: '1', // 1 = Remessa
    generation_date: formatCnabDate(generatedAt),
    generation_time: `${String(generatedAt.getHours()).padStart(2, '0')}${String(generatedAt.getMinutes()).padStart(2, '0')}${String(generatedAt.getSeconds()).padStart(2, '0')}`,
    file_sequence: fileSequence,
    layout_version: '103',
    density: '01600',
  }));

  lines.push(headerLoteLayout.build({
    bank_code: bankCode,
    lot_number: '0001',
    record_type: '1',
    operation_type: 'R', // R = Remessa
    service_type: CNAB_SERVICE_TYPE_COBRANCA,
    layout_version_lot: '03',
    inscription_type: onlyDigits(company.companyDocument).length > 11 ? '2' : '1',
    company_document: company.companyDocument,
    covenant_code: company.covenantCode,
    agency: company.agency,
    agency_dv: company.agencyDv || '',
    account: company.account,
    account_dv: company.accountDv || '',
    agency_account_dv: company.agencyAccountDv || '',
    company_name: company.companyLegalName,
    remittance_number: fileSequence,
    recording_date: formatCnabDate(generatedAt),
  }));

  let recordSequence = 1; // primeiro registro do lote é o Header de Lote (registro nº 1)

  for (const title of titles) {
    recordSequence += 1;
    lines.push(segmentoPLayout.build({
      bank_code: bankCode,
      lot_number: '0001',
      record_type: '3',
      record_sequence: recordSequence,
      segment_code: 'P',
      movement_code: '01', // 01 = Entrada de título
      account: company.account,
      account_dv: company.accountDv || '',
      agency_account_dv: company.agencyAccountDv || '',
      nosso_numero: title.nossoNumero,
      wallet_code: company.walletCode,
      registration_form: '1', // 1 = Registrada
      document_type: '2', // 2 = Nota promissória/duplicata mercantil (uso genérico)
      issuance_id: '2', // 2 = Banco emite o boleto
      distribution_id: '1', // 1 = Banco distribui (via internet banking)
      document_number: title.documentNumber,
      due_date: formatCnabDate(title.dueDate),
      nominal_value: toCentavos(title.amount),
      species: '02', // 02 = DM (Duplicata Mercantil)
      accepted: 'N',
      issue_date: formatCnabDate(title.issueDate),
      iof_value: 0,
      abatement_value: 0,
      own_identification: title.documentNumber,
      protest_code: '3', // 3 = Não protestar
      currency_code: '09', // 09 = Real
    }));

    recordSequence += 1;
    const payerDocumentDigits = onlyDigits(title.payerDocument);
    lines.push(segmentoQLayout.build({
      bank_code: bankCode,
      lot_number: '0001',
      record_type: '3',
      record_sequence: recordSequence,
      segment_code: 'Q',
      movement_code: '01',
      payer_document_type: payerDocumentDigits.length > 11 ? '2' : '1',
      payer_document: payerDocumentDigits,
      payer_name: title.payerName,
      payer_address: title.payerAddress || '',
      payer_neighborhood: title.payerNeighborhood || '',
      payer_zip: (title.payerZip || '').slice(0, 5),
      payer_zip_suffix: (title.payerZip || '').slice(5, 8),
      payer_city: title.payerCity || '',
      payer_state: title.payerState || '',
    }));
  }

  recordSequence += 1; // Trailer de Lote conta como registro do lote
  lines.push(trailerLoteLayout.build({
    bank_code: bankCode,
    lot_number: '0001',
    record_type: '5',
    record_count: recordSequence,
  }));

  lines.push(trailerArquivoLayout.build({
    bank_code: bankCode,
    lot_number: '9999',
    record_type: '9',
    lot_count: 1,
    record_count: lines.length + 1, // + o próprio trailer de arquivo
  }));

  const suggestedFilename = `REMESSA_${String(fileSequence).padStart(6, '0')}_${formatCnabDate(generatedAt)}.REM`;

  return {
    content: lines.join('\r\n'),
    suggestedFilename,
    totalRecords: lines.length,
  };
}
