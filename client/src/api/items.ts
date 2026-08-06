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
  /**
   * Opt-in de conversão automática do MRP (roadmap pós-Go-Live item 3,
   * `docs/LEVANTAMENTO_ERP_2026-08-02.md` seção 3): quando `true`, ordens
   * planejadas geradas pelo MRP para este item são convertidas
   * automaticamente em requisição de compra, sem revisão humana. Default
   * `false`/`undefined` (conversão manual). Ver
   * `server/src/modules/mrp/application/use-cases/GenerateMrpPlanUseCase.ts`.
   */
  conversao_automatica?: boolean;
  /**
   * Fornecedor padrão do item (FK `suppliers.id`, INTEGER — corrigido de
   * `uuid` em 2026-08-06, ver `itemValidators.ts`). Usado pelo MRP para
   * sugerir o fornecedor na requisição de compra automática. `null`/ausente
   * = sem fornecedor padrão definido.
   */
  fornecedor_padrao_id?: number | null;
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

/** Payload parcial aceito por `PATCH /api/items/:id` (`.strict()` no backend). */
export interface UpdateItemInput {
  descricao?: string;
  unidade?: string;
  estoque_seguranca?: number;
  lote_minimo?: number;
  lead_time_dias?: number;
  custo_padrao?: number;
  conversao_automatica?: boolean;
  /** Fornecedor padrão do item (FK `suppliers.id`). `null` limpa a seleção. */
  fornecedor_padrao_id?: number | null;
}

/**
 * `PATCH /api/items/:id` — atualização parcial de um item mestre. Usado
 * hoje para o toggle de `conversao_automatica` (opt-in de compra sem
 * revisão humana no MRP) e para o fornecedor padrão (sugestão do MRP na
 * requisição automática).
 */
export async function updateItem(id: string, input: UpdateItemInput) {
  const { data } = await httpClient.patch<ItemResponse<Item>>(`/api/items/${id}`, input);
  return data.data;
}
