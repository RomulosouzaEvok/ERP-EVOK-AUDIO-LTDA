import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * Tipo de item de engenharia — nomenclatura alinhada ao módulo `Item` do
 * backend. `USO_E_CONSUMO` (MRO — material de uso e consumo, ex.: luva de
 * proteção, item de limpeza) e `ATIVO_IMOBILIZADO` foram adicionados no
 * Bloco A (`docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md`) para
 * diferenciar o destino do item desde o cadastro, evitando poluir BOM/MRP
 * com itens que não são matéria-prima produtiva.
 */
export type ItemType = 'MATERIA_PRIMA' | 'SUBCONJUNTO' | 'PRODUTO_ACABADO' | 'USO_E_CONSUMO' | 'ATIVO_IMOBILIZADO';

/**
 * Item mestre (núcleo `Item` do backend) — matéria-prima, subconjunto ou
 * produto acabado. Campos mínimos usados nas telas de compras/produção
 * (busca, seleção em formulários, exibição de estoque atual).
 */
export interface Item {
  id: string;
  codigo: string;
  descricao: string;
  tipo: ItemType;
  unidade: string;
  estoque_atual: string | number;
  status: string;
}

export interface ItemListParams {
  page?: number;
  limit?: number;
  search?: string;
}

/** `GET /api/items` — busca/listagem paginada de itens mestres. */
export async function listItems(params: ItemListParams = {}) {
  const { data } = await httpClient.get<ListResponse<Item>>('/api/items', { params });
  return data;
}

/** `GET /api/items/:id` — obtém um item mestre pelo id. */
export async function getItem(id: string) {
  const { data } = await httpClient.get<ItemResponse<Item>>(`/api/items/${id}`);
  return data.data;
}

export interface CreateItemInput {
  codigo: string;
  descricao: string;
  tipo: ItemType;
  unidade: string;
  estoque_atual?: number;
  estoque_seguranca?: number;
  lote_minimo?: number;
  lead_time_dias?: number;
  custo_padrao?: number;
}

/**
 * `POST /api/items` — cria um item mestre. Usado pelo cadastro de "uso e
 * consumo"/"ativo imobilizado" em `ProductsPage` (Bloco E) — itens
 * produtivos (`MATERIA_PRIMA`/`SUBCONJUNTO`/`PRODUTO_ACABADO`) continuam
 * sendo cadastrados via `POST /api/products` (modelo `Product`, dual-read
 * com `Item`, ver `docs/HANDOFF_CODEX.md`).
 */
export async function createItem(input: CreateItemInput) {
  const { data } = await httpClient.post<ItemResponse<Item>>('/api/items', input);
  return data.data;
}
