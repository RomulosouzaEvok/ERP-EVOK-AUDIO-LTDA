/**
 * Mapper DTO do cluster Acidente/CAT. Os nomes de coluna do banco já batem
 * quase 1:1 com o contrato de API publicado — a única divergência real é
 * `sst_acidentes.setor_local` (banco) vs. `local_setor` (contrato,
 * `BLOCO_1_SST_API.md` §3) e `parte_corpo_atingida` (banco) vs.
 * `parte_corpo` (contrato).
 *
 * @module modules/sst/infrastructure/mappers/AccidentMapper
 */

/** Converte uma instância Sequelize de `SstAcidente` (+ includes) para o DTO de resposta da API. */
export function toAccidentDTO(row: any): Record<string, unknown> {
  const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row;
  return {
    id: plain.id,
    employee_id: plain.employee_id,
    data_hora: plain.data_hora,
    tipo: plain.tipo,
    local_setor: plain.setor_local,
    descricao: plain.descricao,
    parte_corpo: plain.parte_corpo_atingida,
    agente_causador: plain.agente_causador,
    gravidade: plain.gravidade,
    dias_perdidos: plain.dias_perdidos,
    houve_cat: plain.houve_cat,
    justificativa_sem_cat: plain.justificativa_sem_cat,
    testemunhas: (plain.testemunhas ?? []).map((w: any) => w.employee_id),
    investigacao: plain.investigacao ?? null,
    complementos: plain.complementos ?? [],
    cats: (plain.cats ?? []).map(toCatDTO)
  };
}

/** Converte o payload de request (API) de Acidente para as colunas do banco. */
export function fromAccidentInput(body: Record<string, any>): Record<string, unknown> {
  return {
    employee_id: body.employee_id,
    data_hora: body.data_hora,
    tipo: body.tipo,
    setor_local: body.local_setor,
    descricao: body.descricao,
    parte_corpo_atingida: body.parte_corpo ?? null,
    agente_causador: body.agente_causador ?? null,
    gravidade: body.gravidade,
    dias_perdidos: body.dias_perdidos ?? 0,
    justificativa_sem_cat: body.justificativa_sem_cat ?? null
  };
}

/** Converte uma instância Sequelize de `SstCat` para o DTO de resposta da API. */
export function toCatDTO(row: any): Record<string, unknown> {
  const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row;
  return {
    id: plain.id,
    acidente_id: plain.acidente_id,
    numero_cat: plain.numero_cat,
    tipo: plain.tipo,
    data_emissao: plain.data_emissao,
    prazo_limite: plain.prazo_limite,
    status_esocial_s2210: plain.status_esocial_s2210,
    recibo_esocial: plain.recibo_esocial
  };
}

export default { toAccidentDTO, fromAccidentInput, toCatDTO };
