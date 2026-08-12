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
 * Rótulo humano de cada tipo — mora aqui (e não numa página) porque é usado
 * pelo Item Mestre, pelo detalhe do item e pelo `ItemSearchSelect` de
 * requisição/MRP: quem requisita precisa VER que está pedindo um imobilizado
 * ou MRO, que seguem alçada diferente de insumo produtivo.
 */
export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  MATERIA_PRIMA: 'Matéria-prima',
  SUBCONJUNTO: 'Subconjunto',
  PRODUTO_ACABADO: 'Produto acabado',
  USO_E_CONSUMO: 'Uso e consumo (MRO)',
  ATIVO_IMOBILIZADO: 'Ativo imobilizado',
};

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
  /** `DECIMAL(18,6)` como string — reservado por OP/venda/lote (ver `CLAUDE.md` §4). */
  estoque_reservado?: string | number;
  /** `DECIMAL(18,6)` como string — gatilho de reposição (MRP/estoque baixo). */
  estoque_seguranca?: string | number;
  /** `DECIMAL(18,6)` como string — lote mínimo de compra/produção. */
  lote_minimo?: string | number;
  lead_time_dias?: number;
  /** `DECIMAL(18,6)` como string — custo padrão usado no MRP/custeio. */
  custo_padrao?: string | number;
  /**
   * Opt-in de conversão automática do MRP (roadmap pós-Go-Live item 3,
   * `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` seção 3): quando `true`, ordens
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

/**
 * Não existe `GET /api/items/:id` no backend (só `GET /api/items` — lista
 * paginada — está exposto, ver `server/src/modules/items/presentation/routes/items.ts`
 * e `docs/arquitetura/API.md` §31). Telas que precisam do "detalhe" de um item resolvem
 * pelo `codigo` (único), com `listItems({ search: codigo })` seguido de um
 * match exato de `item.codigo === codigo` — mesmo padrão já usado em
 * `ProductsPage.tsx` (`ProductSuppliersDialog`) e replicado em
 * `ItemMasterDetailPage.tsx`. Não inventar um `getItem(id)` aqui: a rota não
 * existe de verdade.
 */

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
 * com `Item`, ver `docs/governance/HANDOFF_CODEX.md`).
 */
export async function createItem(input: CreateItemInput) {
  const { data } = await httpClient.post<ItemResponse<Item>>('/api/items', input);
  return data.data;
}

/**
 * Payload parcial aceito por `PATCH /api/items/:id` (`.strict()` no
 * backend, `itemValidators.ts`). `codigo`/`tipo`/`unidade` **não** são
 * editáveis por este endpoint — não incluir aqui (o backend rejeitaria com
 * 400, campo desconhecido do `.strict()`).
 */
export interface UpdateItemInput {
  descricao?: string;
  status?: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
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
 * revisão humana no MRP), fornecedor padrão (sugestão do MRP na requisição
 * automática) e, na tela de detalhe do Item Mestre (`ItemMasterDetailPage`),
 * os demais campos editáveis do cadastro.
 */
export async function updateItem(id: string, input: UpdateItemInput) {
  const { data } = await httpClient.patch<ItemResponse<Item>>(`/api/items/${id}`, input);
  return data.data;
}

/**
 * `PATCH /api/items/:id/inactivate` — inativa (soft delete, `status →
 * INATIVO`) um item. Retorna 422 (`BusinessRuleError`, `details` com o(s)
 * vínculo(s) encontrado(s)) se houver BOM/OP/movimento/lote/MRP ativo
 * vinculado.
 */
export async function deactivateItem(id: string) {
  const { data } = await httpClient.patch<ItemResponse<Item>>(`/api/items/${id}/inactivate`);
  return data.data;
}

/** Ligação de estrutura (BOM do item mestre — `POST /api/items/:id/estrutura`). */
export interface CreateItemStructureInput {
  item_componente_id: string;
  quantidade: number;
  perda_percentual?: number;
  nivel?: number;
}

/** `POST /api/items/:id/estrutura` — cria uma ligação de estrutura (componente do item pai `id`). */
export async function createItemStructure(itemPaiId: string, input: CreateItemStructureInput) {
  const { data } = await httpClient.post<ItemResponse<unknown>>(`/api/items/${itemPaiId}/estrutura`, input);
  return data.data;
}

/** Linha da explosão de estrutura (`GET /api/items/:id/estrutura/explode`). */
export interface ExplodedStructureEntry {
  item_id: string;
  codigo: string | null;
  descricao: string | null;
  quantidade_bruta: number;
  nivel: number;
  data_necessidade: string;
}

/**
 * `GET /api/items/:id/estrutura/explode?quantity=&due_date=` — explode a
 * estrutura ativa do item para a quantidade informada (agregada por nível).
 * Não existe um `GET` de listagem "rasa" (1 nível) da estrutura — este é o
 * único jeito real de "ver" a BOM cadastrada de um item, além de cadastrar
 * uma ligação nova via `createItemStructure`.
 */
export async function explodeItemStructure(itemId: string, params: { quantity: number; due_date?: string }) {
  const { data } = await httpClient.get<ItemResponse<ExplodedStructureEntry[]>>(
    `/api/items/${itemId}/estrutura/explode`,
    { params },
  );
  return data.data;
}
