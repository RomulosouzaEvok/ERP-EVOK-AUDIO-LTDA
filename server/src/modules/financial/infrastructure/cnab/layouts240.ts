/**
 * Definição dos registros do CNAB 240 — Cobrança (layout simplificado
 * FEBRABAN v1, ver decisão arquitetural em `../ofx/parseOfx.ts` §análoga e
 * na nota abaixo).
 *
 * DECISÃO ARQUITETURAL (layout simplificado, não parser de terceiros):
 * optou-se por implementar o layout manualmente (sem lib npm) pelo mesmo
 * raciocínio do parser OFX — CNAB 240 é um formato de posição fixa bem
 * documentado publicamente pela FEBRABAN, as libs npm disponíveis cobrem
 * sobretudo boleto/emissão (fora do escopo desta v1, que é só
 * remessa/retorno de cobrança registrada) e frequentemente têm
 * particularidades por banco que não se aplicam aqui. A superfície
 * realmente necessária (Header Arquivo, Header Lote, Segmentos P/Q na
 * remessa, Segmentos T/U no retorno, Trailers) é estável e mapeada 1:1 pelo
 * motor genérico de `./fixedWidthLayout.ts`.
 *
 * RISCO RESIDUAL EXPLÍCITO: os campos "administrativos" (fillers, mensagens,
 * uso exclusivo FEBRABAN/banco) foram consolidados em blocos únicos em vez
 * de replicar byte-a-byte cada subcampo do manual oficial de cada banco —
 * os campos de NEGÓCIO usados por esta v1 (nosso número, valor, vencimento,
 * dados do sacado, código de ocorrência no retorno) seguem as posições
 * padronizadas pela FEBRABAN. Este layout NÃO foi validado byte-a-byte
 * contra um arquivo de retorno real emitido por um banco — antes de usar em
 * produção, validar com um arquivo de teste/homologação do banco
 * efetivamente contratado (registrado em `docs/governance/TODO.md`).
 *
 * @module modules/financial/infrastructure/cnab/layouts240
 */

const { defineLayout } = require('./fixedWidthLayout');

/** Código do serviço "Cobrança" no Header de Lote (posição `service_type`). */
export const CNAB_SERVICE_TYPE_COBRANCA = '01';

/** Header de Arquivo (registro tipo `0`) — um por arquivo, remessa ou retorno. */
export const headerArquivoLayout = defineLayout('headerArquivo', [
  { name: 'bank_code', length: 3, type: 'N' },
  { name: 'lot_number', length: 4, type: 'N' },
  { name: 'record_type', length: 1, type: 'N' },
  { name: 'filler1', length: 9, type: 'X' },
  { name: 'inscription_type', length: 1, type: 'N' },
  { name: 'company_document', length: 14, type: 'N' },
  { name: 'covenant_code', length: 20, type: 'X' },
  { name: 'agency', length: 5, type: 'N' },
  { name: 'agency_dv', length: 1, type: 'X' },
  { name: 'account', length: 12, type: 'N' },
  { name: 'account_dv', length: 1, type: 'X' },
  { name: 'agency_account_dv', length: 1, type: 'X' },
  { name: 'company_name', length: 30, type: 'X' },
  { name: 'bank_name', length: 30, type: 'X' },
  { name: 'filler2', length: 10, type: 'X' },
  { name: 'file_type', length: 1, type: 'N' },
  { name: 'generation_date', length: 8, type: 'N' },
  { name: 'generation_time', length: 6, type: 'N' },
  { name: 'file_sequence', length: 6, type: 'N' },
  { name: 'layout_version', length: 3, type: 'N' },
  { name: 'density', length: 5, type: 'N' },
  { name: 'filler3', length: 69, type: 'X' },
]);

/** Header de Lote (registro tipo `1`) — um lote de cobrança por arquivo em v1. */
export const headerLoteLayout = defineLayout('headerLote', [
  { name: 'bank_code', length: 3, type: 'N' },
  { name: 'lot_number', length: 4, type: 'N' },
  { name: 'record_type', length: 1, type: 'N' },
  { name: 'operation_type', length: 1, type: 'X' },
  { name: 'service_type', length: 2, type: 'N' },
  { name: 'layout_version_lot', length: 2, type: 'N' },
  { name: 'filler1', length: 1, type: 'X' },
  { name: 'inscription_type', length: 1, type: 'N' },
  { name: 'company_document', length: 14, type: 'N' },
  { name: 'covenant_code', length: 20, type: 'X' },
  { name: 'agency', length: 5, type: 'N' },
  { name: 'agency_dv', length: 1, type: 'X' },
  { name: 'account', length: 12, type: 'N' },
  { name: 'account_dv', length: 1, type: 'X' },
  { name: 'agency_account_dv', length: 1, type: 'X' },
  { name: 'company_name', length: 30, type: 'X' },
  { name: 'message1', length: 40, type: 'X' },
  { name: 'message2', length: 40, type: 'X' },
  { name: 'remittance_number', length: 8, type: 'N' },
  { name: 'recording_date', length: 8, type: 'N' },
  { name: 'credit_date', length: 8, type: 'N' },
  { name: 'filler2', length: 37, type: 'X' },
]);

/** Segmento P (registro tipo `3`, segmento `P`) — dados do título, na remessa. */
export const segmentoPLayout = defineLayout('segmentoP', [
  { name: 'bank_code', length: 3, type: 'N' },
  { name: 'lot_number', length: 4, type: 'N' },
  { name: 'record_type', length: 1, type: 'N' },
  { name: 'record_sequence', length: 5, type: 'N' },
  { name: 'segment_code', length: 1, type: 'X' },
  { name: 'filler1', length: 1, type: 'X' },
  { name: 'movement_code', length: 2, type: 'N' },
  { name: 'filler_agency', length: 6, type: 'X' },
  { name: 'account', length: 12, type: 'N' },
  { name: 'account_dv', length: 1, type: 'X' },
  { name: 'agency_account_dv', length: 1, type: 'X' },
  { name: 'nosso_numero', length: 20, type: 'X' },
  { name: 'wallet_code', length: 1, type: 'X' },
  { name: 'registration_form', length: 1, type: 'N' },
  { name: 'document_type', length: 1, type: 'N' },
  { name: 'issuance_id', length: 1, type: 'N' },
  { name: 'distribution_id', length: 1, type: 'N' },
  { name: 'document_number', length: 15, type: 'X' },
  { name: 'due_date', length: 8, type: 'N' },
  { name: 'nominal_value', length: 15, type: 'N' },
  { name: 'filler_agency2', length: 6, type: 'X' },
  { name: 'species', length: 2, type: 'N' },
  { name: 'accepted', length: 1, type: 'X' },
  { name: 'issue_date', length: 8, type: 'N' },
  { name: 'filler_interest', length: 22, type: 'X' },
  { name: 'filler_discount', length: 22, type: 'X' },
  { name: 'iof_value', length: 15, type: 'N' },
  { name: 'abatement_value', length: 15, type: 'N' },
  { name: 'own_identification', length: 25, type: 'X' },
  { name: 'protest_code', length: 1, type: 'N' },
  { name: 'protest_days', length: 2, type: 'N' },
  { name: 'write_off_code', length: 1, type: 'N' },
  { name: 'write_off_days', length: 2, type: 'N' },
  { name: 'currency_code', length: 2, type: 'N' },
  { name: 'contract_number', length: 5, type: 'N' },
  { name: 'filler_end', length: 11, type: 'X' },
]);

/** Segmento Q (registro tipo `3`, segmento `Q`) — dados do sacado (pagador), na remessa. */
export const segmentoQLayout = defineLayout('segmentoQ', [
  { name: 'bank_code', length: 3, type: 'N' },
  { name: 'lot_number', length: 4, type: 'N' },
  { name: 'record_type', length: 1, type: 'N' },
  { name: 'record_sequence', length: 5, type: 'N' },
  { name: 'segment_code', length: 1, type: 'X' },
  { name: 'filler1', length: 1, type: 'X' },
  { name: 'movement_code', length: 2, type: 'N' },
  { name: 'payer_document_type', length: 1, type: 'N' },
  { name: 'payer_document', length: 15, type: 'N' },
  { name: 'payer_name', length: 40, type: 'X' },
  { name: 'payer_address', length: 40, type: 'X' },
  { name: 'payer_neighborhood', length: 15, type: 'X' },
  { name: 'payer_zip', length: 5, type: 'N' },
  { name: 'payer_zip_suffix', length: 3, type: 'N' },
  { name: 'payer_city', length: 15, type: 'X' },
  { name: 'payer_state', length: 2, type: 'X' },
  { name: 'guarantor_document_type', length: 1, type: 'N' },
  { name: 'guarantor_document', length: 15, type: 'N' },
  { name: 'guarantor_name', length: 40, type: 'X' },
  { name: 'correspondent_bank_code', length: 3, type: 'N' },
  { name: 'correspondent_our_number', length: 15, type: 'X' },
  { name: 'filler_end', length: 13, type: 'X' },
]);

/** Trailer de Lote (registro tipo `5`) — um por lote (um lote por arquivo em v1). */
export const trailerLoteLayout = defineLayout('trailerLote', [
  { name: 'bank_code', length: 3, type: 'N' },
  { name: 'lot_number', length: 4, type: 'N' },
  { name: 'record_type', length: 1, type: 'N' },
  { name: 'filler1', length: 9, type: 'X' },
  { name: 'record_count', length: 6, type: 'N' },
  { name: 'filler2', length: 217, type: 'X' },
]);

/** Trailer de Arquivo (registro tipo `9`) — um por arquivo. */
export const trailerArquivoLayout = defineLayout('trailerArquivo', [
  { name: 'bank_code', length: 3, type: 'N' },
  { name: 'lot_number', length: 4, type: 'N' },
  { name: 'record_type', length: 1, type: 'N' },
  { name: 'filler1', length: 9, type: 'X' },
  { name: 'lot_count', length: 6, type: 'N' },
  { name: 'record_count', length: 6, type: 'N' },
  { name: 'filler2', length: 211, type: 'X' },
]);

/** Segmento T (registro tipo `3`, segmento `T`) — dados do título e ocorrência, no retorno. */
export const segmentoTLayout = defineLayout('segmentoT', [
  { name: 'bank_code', length: 3, type: 'N' },
  { name: 'lot_number', length: 4, type: 'N' },
  { name: 'record_type', length: 1, type: 'N' },
  { name: 'record_sequence', length: 5, type: 'N' },
  { name: 'segment_code', length: 1, type: 'X' },
  { name: 'filler1', length: 1, type: 'X' },
  { name: 'movement_code', length: 2, type: 'N' },
  { name: 'filler_agency', length: 6, type: 'X' },
  { name: 'account', length: 12, type: 'N' },
  { name: 'account_dv', length: 1, type: 'X' },
  { name: 'agency_account_dv', length: 1, type: 'X' },
  { name: 'nosso_numero', length: 20, type: 'X' },
  { name: 'wallet_code', length: 1, type: 'X' },
  { name: 'document_number', length: 15, type: 'X' },
  { name: 'due_date', length: 8, type: 'N' },
  { name: 'nominal_value', length: 15, type: 'N' },
  { name: 'bank_code2', length: 3, type: 'N' },
  { name: 'collecting_agency', length: 5, type: 'N' },
  { name: 'species', length: 2, type: 'N' },
  { name: 'write_off_reason', length: 2, type: 'N' },
  { name: 'payer_document_type', length: 1, type: 'N' },
  { name: 'payer_document', length: 15, type: 'N' },
  { name: 'payer_name', length: 40, type: 'X' },
  { name: 'filler_end', length: 76, type: 'X' },
]);

/** Segmento U (registro tipo `3`, segmento `U`) — valores da liquidação, no retorno. */
export const segmentoULayout = defineLayout('segmentoU', [
  { name: 'bank_code', length: 3, type: 'N' },
  { name: 'lot_number', length: 4, type: 'N' },
  { name: 'record_type', length: 1, type: 'N' },
  { name: 'record_sequence', length: 5, type: 'N' },
  { name: 'segment_code', length: 1, type: 'X' },
  { name: 'filler1', length: 1, type: 'X' },
  { name: 'movement_code', length: 2, type: 'N' },
  { name: 'abatement_value', length: 15, type: 'N' },
  { name: 'discount_value', length: 15, type: 'N' },
  { name: 'principal_value', length: 15, type: 'N' },
  { name: 'fine_value', length: 15, type: 'N' },
  { name: 'interest_value', length: 15, type: 'N' },
  { name: 'amount_paid', length: 15, type: 'N' },
  { name: 'net_value', length: 15, type: 'N' },
  { name: 'other_expenses', length: 15, type: 'N' },
  { name: 'other_credits', length: 15, type: 'N' },
  { name: 'occurrence_date', length: 8, type: 'N' },
  { name: 'credit_date', length: 8, type: 'N' },
  { name: 'filler_end', length: 72, type: 'X' },
]);

/**
 * Códigos de movimento (ocorrência) do retorno interpretados por esta v1 —
 * ver `ProcessReturnFileUseCase`. Qualquer código fora destas listas é
 * registrado como ocorrência "informativa" (não altera a conta a receber).
 */
export const SETTLEMENT_MOVEMENT_CODES = ['06', '09', '15', '17'];
export const REJECTION_MOVEMENT_CODES = ['03', '30', '38'];

/** Descrições amigáveis dos códigos de ocorrência mais comuns (uso em log/auditoria). */
export const MOVEMENT_CODE_DESCRIPTIONS: Record<string, string> = {
  '02': 'Confirmação de entrada de título',
  '03': 'Entrada rejeitada',
  '06': 'Liquidação normal',
  '09': 'Baixado automaticamente',
  '15': 'Liquidação em cartório',
  '17': 'Liquidação após baixa/título não registrado',
  '30': 'Alteração de dados rejeitada',
  '38': 'Confirmação de instrução de protesto',
};
