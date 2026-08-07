/**
 * Mapper DTO PT-BR (banco) ↔ contrato de API do cluster CIPA (NR-5, CF/88).
 *
 * A maioria dos campos já bate 1:1 (nomes em português no banco e no
 * contrato, decisão do módulo SST) — as divergências reais tratadas aqui:
 * `sst_membros_cipa.estabilidade_inicio` (banco) ↔ `inicio_candidatura`
 * (contrato, `BLOCO_1_SST_API.md` §5); `estabilidade_fim` (banco) ↔
 * `fim_estabilidade` (contrato, resposta de `take-office`/`stability`);
 * `mandato_id` (banco) ↔ `mandate_id` (contrato de `POST /cipa/meetings`).
 *
 * @module modules/sst/infrastructure/mappers/CipaMapper
 */

function plain(row: any): any {
  return typeof row.get === 'function' ? row.get({ plain: true }) : row;
}

/** Converte uma instância Sequelize de `SstMandatoCipa` para o DTO de resposta da API. */
export function toMandateDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  return {
    id: p.id,
    data_inicio: p.data_inicio,
    data_fim: p.data_fim,
    titulares_empregador: p.titulares_empregador,
    titulares_empregados: p.titulares_empregados,
    suplentes_empregador: p.suplentes_empregador,
    suplentes_empregados: p.suplentes_empregados,
    status: p.status,
    membros: Array.isArray(p.membros) ? p.membros.map(toMemberDTO) : undefined
  };
}

/** Converte o payload de request de criação de mandato para as colunas do banco. */
export function fromMandateInput(body: Record<string, any>): Record<string, unknown> {
  return {
    data_inicio: body.data_inicio,
    data_fim: body.data_fim,
    titulares_empregador: body.titulares_empregador,
    titulares_empregados: body.titulares_empregados,
    suplentes_empregador: body.suplentes_empregador,
    suplentes_empregados: body.suplentes_empregados,
    status: body.status ?? 'eleicao_em_curso'
  };
}

/** Converte uma instância Sequelize de `SstMembroCipa` para o DTO de resposta da API. */
export function toMemberDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  return {
    id: p.id,
    mandato_id: p.mandato_id,
    employee_id: p.employee_id,
    origem: p.origem,
    papel: p.papel,
    votos_recebidos: p.votos_recebidos,
    inicio_candidatura: p.estabilidade_inicio,
    fim_estabilidade: p.estabilidade_fim,
    treinamento_cipa_id: p.treinamento_cipa_id,
    posse_confirmada_em: p.posse_confirmada_em
  };
}

/** Converte o payload de request de adição de membro para as colunas do banco. */
export function fromMemberInput(body: Record<string, any>): Record<string, unknown> {
  const data: Record<string, unknown> = {
    employee_id: body.employee_id,
    origem: body.origem,
    papel: body.papel
  };
  if (body.votos_recebidos !== undefined) data.votos_recebidos = body.votos_recebidos;
  if (body.inicio_candidatura !== undefined) data.estabilidade_inicio = body.inicio_candidatura;
  return data;
}

/** Converte uma instância Sequelize de `SstProcessoEleitoralCipa` para o DTO de resposta. */
export function toElectoralProcessDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  return {
    id: p.id,
    mandato_id: p.mandato_id,
    data_edital: p.data_edital,
    data_inicio_inscricoes: p.data_inicio_inscricoes,
    data_fim_inscricoes: p.data_fim_inscricoes,
    data_votacao: p.data_votacao,
    total_votantes: p.total_votantes,
    atas_urls: p.atas_urls ? p.atas_urls.split('|').map((s: string) => s.trim()).filter(Boolean) : [],
    candidatos: Array.isArray(p.candidatos) ? p.candidatos.map(toCandidateDTO) : undefined
  };
}

/** Converte o payload de request de abertura do processo eleitoral para as colunas do banco. */
export function fromElectoralProcessInput(body: Record<string, any>): Record<string, unknown> {
  return {
    mandato_id: body.mandato_id,
    data_edital: body.data_edital ?? null,
    data_inicio_inscricoes: body.data_inicio_inscricoes ?? null,
    data_fim_inscricoes: body.data_fim_inscricoes ?? null,
    data_votacao: body.data_votacao ?? null
  };
}

/** Converte uma instância Sequelize de `SstCandidatoCipa` para o DTO de resposta. */
export function toCandidateDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  return { id: p.id, processo_eleitoral_id: p.processo_eleitoral_id, employee_id: p.employee_id, votos: p.votos, eleito: p.eleito };
}

/** Converte uma instância Sequelize de `SstReuniaoCipa` para o DTO de resposta. */
export function toMeetingDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  return {
    id: p.id,
    mandate_id: p.mandato_id,
    data: p.data,
    tipo: p.tipo,
    pauta: p.pauta,
    ata_texto: p.ata_texto,
    ata_arquivo_url: p.ata_arquivo_url,
    created_by: p.created_by
  };
}

/** Converte o payload de request de registro de reunião para as colunas do banco. */
export function fromMeetingInput(body: Record<string, any>): Record<string, unknown> {
  return {
    mandato_id: body.mandate_id ?? body.mandato_id,
    data: body.data,
    tipo: body.tipo,
    pauta: body.pauta ?? null,
    ata_texto: body.ata_texto ?? null,
    ata_arquivo_url: body.ata_arquivo_url ?? null
  };
}

/** Monta o DTO de resposta de `GET /cipa/stability/:employeeId` (RF-SST-031). */
export function toStabilityDTO(employeeId: number, membro: any | null): Record<string, unknown> {
  if (!membro) {
    return { employee_id: employeeId, estavel: false, fim_estabilidade: null, papel: null, mandato_id: null };
  }
  const p = plain(membro);
  const hoje = new Date().toISOString().slice(0, 10);
  return {
    employee_id: employeeId,
    estavel: !!p.estabilidade_fim && p.estabilidade_fim >= hoje,
    fim_estabilidade: p.estabilidade_fim,
    papel: p.papel,
    mandato_id: p.mandato_id
  };
}

export default {
  toMandateDTO, fromMandateInput,
  toMemberDTO, fromMemberInput,
  toElectoralProcessDTO, fromElectoralProcessInput, toCandidateDTO,
  toMeetingDTO, fromMeetingInput,
  toStabilityDTO
};
