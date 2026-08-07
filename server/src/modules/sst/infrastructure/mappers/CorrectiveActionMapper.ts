/**
 * Mapper DTO PT-BR (banco) ↔ contrato de API do recurso Ações Corretivas
 * (polimórfico, multi-origem).
 *
 * Divergência: `origem_tipo` (banco) ↔ `origem` (contrato,
 * `BLOCO_1_SST_API.md` §9). `status: atrasada` é derivado por leitura
 * (comparação de `prazo` × data corrente), nunca setado manualmente — o
 * mapper aplica essa derivação na saída, sem mutar o banco.
 *
 * @module modules/sst/infrastructure/mappers/CorrectiveActionMapper
 */

function plain(row: any): any {
  return typeof row.get === 'function' ? row.get({ plain: true }) : row;
}

/** Converte uma instância Sequelize de `SstAcaoCorretiva` para o DTO de resposta da API. */
export function toCorrectiveActionDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  const hoje = new Date().toISOString().slice(0, 10);
  const statusDerivado = p.status !== 'concluida' && p.prazo && p.prazo < hoje ? 'atrasada' : p.status;
  return {
    id: p.id,
    origem: p.origem_tipo,
    origem_id: p.origem_id,
    descricao: p.descricao,
    responsavel_id: p.responsavel_id,
    prazo: p.prazo,
    status: statusDerivado,
    evidencia_conclusao_url: p.evidencia_conclusao_url,
    concluida_em: p.concluida_em,
    created_by: p.created_by
  };
}

/** Converte o payload de request de criação de ação corretiva para as colunas do banco. */
export function fromCorrectiveActionInput(body: Record<string, any>): Record<string, unknown> {
  return {
    origem_tipo: body.origem,
    origem_id: body.origem_id,
    descricao: body.descricao,
    responsavel_id: body.responsavel_id,
    prazo: body.prazo
  };
}

export default { toCorrectiveActionDTO, fromCorrectiveActionInput };
