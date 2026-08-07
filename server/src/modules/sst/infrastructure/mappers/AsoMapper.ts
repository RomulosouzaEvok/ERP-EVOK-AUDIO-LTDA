/**
 * Mapper DTO do cluster ASO/PCMSO. Os nomes de coluna do banco já batem
 * quase 1:1 com o contrato de API (ambos em português para este cluster,
 * decisão do módulo SST) — a única divergência real é
 * `sst_planos_exames.risco_exigente` (banco) vs. `risco_exigido` (contrato
 * publicado em `BLOCO_1_SST_API.md` §2.1).
 *
 * @module modules/sst/infrastructure/mappers/AsoMapper
 */

/** Converte uma instância Sequelize de `SstPlanoExames` para o DTO de resposta da API. */
export function toExamPlanDTO(row: any): Record<string, unknown> {
  const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row;
  return {
    id: plain.id,
    position: plain.position,
    ges_id: plain.ges_id,
    tipo_exame: plain.tipo_exame,
    periodicidade_meses: plain.periodicidade_meses,
    risco_exigido: plain.risco_exigente,
    active: plain.ativo
  };
}

/** Converte o payload de request (API) de PlanoExames para as colunas do banco. */
export function fromExamPlanInput(body: Record<string, any>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (body.position !== undefined) data.position = body.position;
  if (body.ges_id !== undefined) data.ges_id = body.ges_id;
  if (body.tipo_exame !== undefined) data.tipo_exame = body.tipo_exame;
  if (body.periodicidade_meses !== undefined) data.periodicidade_meses = body.periodicidade_meses;
  if (body.risco_exigido !== undefined) data.risco_exigente = body.risco_exigido;
  return data;
}

/** Converte uma instância Sequelize de `SstAso` para o shape RESUMIDO da listagem (sem dado clínico). */
export function toAsoSummaryDTO(row: any): Record<string, unknown> {
  const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row;
  return {
    id: plain.id,
    employee_id: plain.employee_id,
    tipo: plain.tipo,
    data_realizacao: plain.data_realizacao,
    resultado: plain.resultado,
    data_vencimento: plain.data_vencimento,
    status_esocial_s2220: plain.status_esocial_s2220
  };
}

/** Converte uma instância Sequelize de `SstAso` para o DETALHE completo (dado clínico incluso). */
export function toAsoDetailDTO(row: any): Record<string, unknown> {
  const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row;
  return {
    ...toAsoSummaryDTO(row),
    restricoes: plain.restricoes,
    medico_examinador: plain.medico_examinador,
    medico_coordenador_pcmso: plain.medico_coordenador_pcmso,
    arquivo_url: plain.arquivo_url,
    recibo_esocial: plain.recibo_esocial,
    exames_complementares: (plain.exames_complementares ?? []).map((e: any) => ({
      id: e.id,
      tipo: e.tipo_exame,
      data: e.data_realizacao,
      resultado_url: e.resultado_laudo_url,
      alterado: e.alterado
    }))
  };
}

export default { toExamPlanDTO, fromExamPlanInput, toAsoSummaryDTO, toAsoDetailDTO };
