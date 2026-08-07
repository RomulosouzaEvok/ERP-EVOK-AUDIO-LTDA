/**
 * Mapper DTO PT-BR (banco) ↔ contrato de API do cluster PGR/GRO + GES (NR-1).
 *
 * Divergências reais: `intensidade_concentracao` (banco) ↔ `intensidade`
 * (contrato, `BLOCO_1_SST_API.md` §6); `proxima_revisao_prevista` (banco) ↔
 * `data_revisao_prevista` (contrato); `medidas_controle` — array no
 * contrato, `TEXT` serializado (`|`) no banco, mesmo padrão de
 * `tamanhos_variacoes` do `EpiMapper`.
 *
 * @module modules/sst/infrastructure/mappers/PgrMapper
 */

function plain(row: any): any {
  return typeof row.get === 'function' ? row.get({ plain: true }) : row;
}

function listToString(list?: string[] | null): string | null {
  if (!list || list.length === 0) return null;
  return list.join('|');
}

function stringToList(value?: string | null): string[] {
  if (!value) return [];
  return value.split('|').map((s) => s.trim()).filter(Boolean);
}

/** Converte uma instância Sequelize de `SstRiscoOcupacional` para o DTO de resposta da API. */
export function toRiskDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  return {
    id: p.id,
    department_id: p.department_id,
    ges_id: p.ges_id,
    categoria_agente: p.categoria_agente,
    agente: p.agente,
    fonte_geradora: p.fonte_geradora,
    intensidade: p.intensidade_concentracao,
    data_medicao: p.data_medicao,
    medido_por: p.medido_por,
    severidade: p.severidade,
    probabilidade: p.probabilidade,
    classificacao_resultante: p.classificacao_resultante,
    medidas_controle: stringToList(p.medidas_controle),
    ausencia_risco_identificado: p.ausencia_risco_identificado,
    data_revisao: p.data_revisao,
    data_revisao_prevista: p.proxima_revisao_prevista,
    created_by: p.created_by
  };
}

/** Converte o payload de request (criação/atualização) de risco ocupacional para as colunas do banco. */
export function fromRiskInput(body: Record<string, any>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (body.department_id !== undefined) data.department_id = body.department_id;
  if (body.ges_id !== undefined) data.ges_id = body.ges_id;
  if (body.categoria_agente !== undefined) data.categoria_agente = body.categoria_agente;
  if (body.agente !== undefined) data.agente = body.agente;
  if (body.fonte_geradora !== undefined) data.fonte_geradora = body.fonte_geradora;
  if (body.intensidade !== undefined) data.intensidade_concentracao = body.intensidade;
  if (body.data_medicao !== undefined) data.data_medicao = body.data_medicao;
  if (body.medido_por !== undefined) data.medido_por = body.medido_por;
  if (body.severidade !== undefined) data.severidade = body.severidade;
  if (body.probabilidade !== undefined) data.probabilidade = body.probabilidade;
  if (body.medidas_controle !== undefined) data.medidas_controle = listToString(body.medidas_controle);
  if (body.ausencia_risco_identificado !== undefined) data.ausencia_risco_identificado = body.ausencia_risco_identificado;
  if (body.data_revisao !== undefined) data.data_revisao = body.data_revisao;
  if (body.data_revisao_prevista !== undefined) data.proxima_revisao_prevista = body.data_revisao_prevista;
  return data;
}

/** Converte uma instância Sequelize de `SstGes` para o DTO de resposta da API. */
export function toGesDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  return { id: p.id, nome: p.nome, descricao: p.descricao };
}

/** Converte o payload de request de criação de GES para as colunas do banco. */
export function fromGesInput(body: Record<string, any>): Record<string, unknown> {
  return { nome: body.nome, descricao: body.descricao ?? null };
}

/** Converte uma instância Sequelize de `SstGesFuncionario` para o DTO de resposta. */
export function toGesMemberDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  return { id: p.id, ges_id: p.ges_id, employee_id: p.employee_id, inicio_exposicao: p.inicio_exposicao, fim_exposicao: p.fim_exposicao };
}

export default { toRiskDTO, fromRiskInput, toGesDTO, fromGesInput, toGesMemberDTO };
