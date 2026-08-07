/**
 * Mapper DTO PT-BR (banco) ↔ contrato de API do cluster Rotina Preventiva
 * (Inspeções, PT, Brigada, DDS) — RF-SST-048 a 053.
 *
 * Divergência principal: `sst_inspecao_itens.item_verificado` (banco) ↔
 * `item` (contrato, `BLOCO_1_SST_API.md` §8). `risco_grave_iminente` não
 * tem coluna dedicada (documentado no modelo de dados §9) — é repassado
 * apenas na resposta a partir do próprio payload de entrada, não persistido.
 *
 * @module modules/sst/infrastructure/mappers/SafetyRoutineMapper
 */

function plain(row: any): any {
  return typeof row.get === 'function' ? row.get({ plain: true }) : row;
}

/** Converte uma instância Sequelize de `SstInspecaoSeguranca` para o DTO de resposta da API. */
export function toInspectionDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  return {
    id: p.id,
    department_id: p.department_id,
    data: p.data,
    checklist_modelo: p.checklist_modelo,
    inspetor_id: p.inspetor_id,
    itens: Array.isArray(p.itens) ? p.itens.map(toInspectionItemDTO) : undefined
  };
}

/** Converte uma instância Sequelize de `SstInspecaoItem` para o DTO de resposta da API. */
export function toInspectionItemDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  return {
    id: p.id,
    item: p.item_verificado,
    conforme: p.conforme,
    observacao: p.observacao,
    acao_corretiva_id: p.acao_corretiva_id
  };
}

/** Converte uma instância Sequelize de `SstPermissaoTrabalho` para o DTO de resposta da API. */
export function toWorkPermitDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  return {
    id: p.id,
    atividade: p.atividade,
    tipo_risco: p.tipo_risco,
    department_id: p.department_id,
    requisitos_verificados: p.requisitos_verificados,
    autorizante_id: p.autorizante_id,
    inicio_validade: p.inicio_validade,
    fim_validade: p.fim_validade,
    status: p.status,
    executantes: Array.isArray(p.executantes) ? p.executantes.map((e: any) => plain(e).employee_id) : undefined
  };
}

/** Converte uma instância Sequelize de `SstBrigadista` para o DTO de resposta da API. */
export function toBrigadeMemberDTO(row: any, efetivoAtivo?: number, minimoConfigurado?: number): Record<string, unknown> {
  const p = plain(row);
  return {
    id: p.id,
    employee_id: p.employee_id,
    data_formacao: p.data_formacao,
    validade_reciclagem: p.validade_reciclagem,
    active: p.ativo,
    ...(efetivoAtivo !== undefined ? { efetivo_ativo: efetivoAtivo, minimo_configurado: minimoConfigurado } : {})
  };
}

/** Converte uma instância Sequelize de `SstRegistroDds` para o DTO de resposta da API. */
export function toDdsDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  return {
    id: p.id,
    data: p.data,
    department_id: p.department_id,
    turno: p.turno,
    tema: p.tema,
    condutor_id: p.condutor_id,
    presentes: Array.isArray(p.presencas) ? p.presencas.map((e: any) => plain(e).employee_id) : undefined
  };
}

export default { toInspectionDTO, toInspectionItemDTO, toWorkPermitDTO, toBrigadeMemberDTO, toDdsDTO };
