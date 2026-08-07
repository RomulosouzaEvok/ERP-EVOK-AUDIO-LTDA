/**
 * Mapper DTO PT-BR (banco) ↔ contrato de API do cluster Treinamentos de
 * Segurança (NRs).
 *
 * Divergências: `periodicidade_reciclagem_meses` (banco) ↔
 * `periodicidade_meses` (contrato, alinhado ao mesmo nome de campo já
 * usado em `sst_planos_exames`/`exam-plans`); `data_realizacao` (banco) ↔
 * `data` (contrato, `BLOCO_1_SST_API.md` §7); `ativo` (banco) ↔ `active`.
 *
 * @module modules/sst/infrastructure/mappers/TrainingMapper
 */

function plain(row: any): any {
  return typeof row.get === 'function' ? row.get({ plain: true }) : row;
}

/** Converte uma instância Sequelize de `SstMatrizTreinamento` para o DTO de resposta da API. */
export function toMatrixDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  return {
    id: p.id,
    position: p.position,
    norma: p.norma,
    periodicidade_meses: p.periodicidade_reciclagem_meses,
    active: p.ativo
  };
}

/** Converte o payload de request da matriz de treinamento para as colunas do banco. */
export function fromMatrixInput(body: Record<string, any>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (body.position !== undefined) data.position = body.position;
  if (body.norma !== undefined) data.norma = body.norma;
  if (body.periodicidade_meses !== undefined) data.periodicidade_reciclagem_meses = body.periodicidade_meses;
  if (body.active !== undefined) data.ativo = body.active;
  return data;
}

/** Converte uma instância Sequelize de `SstTreinamento` para o DTO de resposta da API. */
export function toTrainingDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  return {
    id: p.id,
    employee_id: p.employee_id,
    norma: p.norma,
    curso_descricao: p.curso_descricao,
    data: p.data_realizacao,
    carga_horaria: p.carga_horaria,
    instrutor_entidade: p.instrutor_entidade,
    certificado_url: p.certificado_url,
    validade: p.validade,
    identificacao_operador: p.identificacao_operador,
    created_by: p.created_by
  };
}

/** Converte o payload de request de registro de treinamento para as colunas do banco. */
export function fromTrainingInput(body: Record<string, any>): Record<string, unknown> {
  const data: Record<string, unknown> = {
    employee_id: body.employee_id,
    norma: body.norma,
    data_realizacao: body.data,
    carga_horaria: body.carga_horaria
  };
  if (body.curso_descricao !== undefined) data.curso_descricao = body.curso_descricao;
  if (body.instrutor_entidade !== undefined) data.instrutor_entidade = body.instrutor_entidade;
  if (body.certificado_url !== undefined) data.certificado_url = body.certificado_url;
  if (body.identificacao_operador !== undefined) data.identificacao_operador = body.identificacao_operador;
  return data;
}

export default { toMatrixDTO, fromMatrixInput, toTrainingDTO, fromTrainingInput };
