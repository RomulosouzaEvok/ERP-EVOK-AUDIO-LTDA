/**
 * Mapper DTO PT-BR (banco) ↔ inglês (contrato REST) do cluster EPI.
 *
 * Primeiro mapper explícito do projeto entre nomes de coluna do banco
 * (`ca`, `ativo`, `tamanhos_variacoes`) e nomes de campo da API
 * (`ca_numero`, `active`, `tamanhos`) — ver
 * `docs/business/BLOCO_1_SST_MODELO_DADOS.md` §0/§14. Vive na camada de
 * infraestrutura (não no model Sequelize, não no domínio) para que o
 * banco continue 100% em português e a API continue 100% em inglês, sem
 * vazar nenhuma das duas convenções para a outra camada.
 *
 * @module modules/sst/infrastructure/mappers/EpiMapper
 */

/** Serializa um array de tamanhos em string livre (`P/M/G`) para a coluna `tamanhos_variacoes`. */
function tamanhosToString(tamanhos?: string[] | null): string | null {
  if (!tamanhos || tamanhos.length === 0) return null;
  return tamanhos.join('/');
}

/** Deserializa a coluna `tamanhos_variacoes` (string livre) em array para a API. */
function tamanhosToArray(tamanhosVariacoes?: string | null): string[] {
  if (!tamanhosVariacoes) return [];
  return tamanhosVariacoes.split('/').map((s) => s.trim()).filter(Boolean);
}

/** Converte uma instância Sequelize de `SstTipoEpi` para o DTO de resposta da API. */
export function toTipoEpiDTO(row: any): Record<string, unknown> {
  const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row;
  return {
    id: plain.id,
    nome: plain.nome,
    descricao: plain.descricao,
    ca_numero: plain.ca,
    ca_validade: plain.ca_validade,
    fabricante: plain.fabricante,
    vida_util_dias: plain.vida_util_dias,
    tamanhos: tamanhosToArray(plain.tamanhos_variacoes),
    foto_url: plain.foto_url,
    active: plain.ativo,
    item_id: plain.item_id,
    created_by: plain.created_by,
    created_at: plain.createdAt ?? plain.created_at,
    updated_at: plain.updatedAt ?? plain.updated_at
  };
}

/** Converte o payload de request (inglês) de TipoEPI para as colunas do banco (português). */
export function fromTipoEpiInput(body: Record<string, any>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (body.nome !== undefined) data.nome = body.nome;
  if (body.descricao !== undefined) data.descricao = body.descricao;
  if (body.ca_numero !== undefined) data.ca = body.ca_numero;
  if (body.ca_validade !== undefined) data.ca_validade = body.ca_validade;
  if (body.fabricante !== undefined) data.fabricante = body.fabricante;
  if (body.vida_util_dias !== undefined) data.vida_util_dias = body.vida_util_dias;
  if (body.tamanhos !== undefined) data.tamanhos_variacoes = tamanhosToString(body.tamanhos);
  if (body.foto_url !== undefined) data.foto_url = body.foto_url;
  if (body.active !== undefined) data.ativo = body.active;
  if (body.item_id !== undefined) data.item_id = body.item_id;
  return data;
}

/** Converte uma instância Sequelize de `SstMatrizEpi` para o DTO de resposta da API. */
export function toMatrizDTO(row: any): Record<string, unknown> {
  const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row;
  return {
    id: plain.id,
    department_id: plain.department_id,
    position: plain.position,
    epi_type_id: plain.tipo_epi_id,
    quantidade_padrao: Number(plain.quantidade_padrao),
    observacao: plain.observacao,
    active: plain.ativo,
    epi_type: plain.tipoEpi ? toTipoEpiDTO(plain.tipoEpi) : undefined
  };
}

/** Converte o payload de request (inglês) de MatrizEPI para as colunas do banco (português). */
export function fromMatrizInput(body: Record<string, any>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (body.department_id !== undefined) data.department_id = body.department_id;
  if (body.position !== undefined) data.position = body.position;
  if (body.epi_type_id !== undefined) data.tipo_epi_id = body.epi_type_id;
  if (body.quantidade_padrao !== undefined) data.quantidade_padrao = body.quantidade_padrao;
  if (body.observacao !== undefined) data.observacao = body.observacao;
  if (body.active !== undefined) data.ativo = body.active;
  return data;
}

/** Converte uma instância Sequelize de `SstEntregaEpi` (+ devoluções) para o DTO de resposta da API. */
export function toEntregaDTO(row: any): Record<string, unknown> {
  const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row;
  const devolucoes = plain.devolucoes ?? [];
  const devolucao = devolucoes.length > 0 ? devolucoes[devolucoes.length - 1] : null;
  return {
    id: plain.id,
    employee_id: plain.employee_id,
    epi_type_id: plain.tipo_epi_id,
    epi_type: plain.tipoEpi ? toTipoEpiDTO(plain.tipoEpi) : undefined,
    quantidade: Number(plain.quantidade),
    motivo: plain.motivo,
    data_entrega: plain.data_entrega,
    data_prevista_troca: plain.data_prevista_troca,
    status: plain.confirmada ? 'confirmada' : 'rascunho',
    confirmado_em: plain.confirmada_em,
    evidencia: plain.evidencia_tipo
      ? { tipo: plain.evidencia_tipo, arquivo_url: plain.evidencia_arquivo_url }
      : null,
    devolucao: devolucao
      ? { data_devolucao: devolucao.data_devolucao, condicao: devolucao.condicao }
      : null
  };
}

export default {
  tamanhosToArray,
  tamanhosToString,
  toTipoEpiDTO,
  fromTipoEpiInput,
  toMatrizDTO,
  fromMatrizInput,
  toEntregaDTO
};
