import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/** Tipo de item de engenharia — nomenclatura alinhada ao módulo `Item` do backend. */
export type ItemType = 'MATERIA_PRIMA' | 'SUBCONJUNTO' | 'PRODUTO_ACABADO';

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
