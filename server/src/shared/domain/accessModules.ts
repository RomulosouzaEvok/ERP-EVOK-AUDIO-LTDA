/**
 * 🔐 Catálogo fixo de módulos atribuíveis a um Perfil de Acesso (área/departamento).
 *
 * Fonte única de verdade (SSOT) da lista de 28 `module keys` válidos usada
 * por:
 * - `server/src/middlewares/auth.ts` (`authorizeModule`), para resolver e
 *   validar o módulo dono de uma ação;
 * - `server/src/modules/accessProfiles` (CRUD de perfis), para validar as
 *   chaves de módulo recebidas em `permissions[].module` e para o endpoint
 *   `GET /api/access-profiles/modules`.
 *
 * Mapeada a partir da matriz módulo × permissão de
 * `docs/business/BUSINESS_RULES.md` §1 (26 módulos originais, atribuíveis a
 * perfis de área — `usuarios` e `audit_logs` são exclusivos do papel
 * `admin` global e propositalmente NÃO fazem parte deste catálogo, ver nota
 * em §1). `manutencao` e `garantia` foram adicionados em 2026-08-05 (Bloco A
 * de `docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md`) para cobrir os
 * dois departamentos novos do menu (Manutenção interna de máquina e
 * Ativos & Garantia/Assistência Técnica), desbloqueando o retrofit RBAC do
 * Bloco D sobre `maintenance.ts`/`serviceOrders.ts`. `comex` foi adicionado
 * em 2026-08-06 (UC-19) para o módulo de Importação/COMEX
 * (`Suprimentos > Importação`), com o Analista de Comex como ator dedicado.
 *
 * @module shared/domain/accessModules
 */

/** Chave estável de módulo (usada em `AccessProfilePermission.module` e nas rotas). */
export type AccessModuleKey =
  | 'dashboard'
  | 'produtos'
  | 'contagens'
  | 'vendas'
  | 'clientes'
  | 'compras'
  | 'requisicoes'
  | 'fornecedores'
  | 'comex'
  | 'producao'
  | 'bom'
  | 'mrp'
  | 'chao_de_fabrica'
  | 'centros_de_trabalho'
  | 'qualidade'
  | 'laboratorio'
  | 'engenharia'
  | 'estoque'
  | 'recebimento'
  | 'expedicao'
  | 'patrimonio'
  | 'manutencao'
  | 'garantia'
  | 'rastreabilidade'
  | 'financeiro'
  | 'relatorios.producao'
  | 'relatorios.compras'
  | 'relatorios.custos'
  | 'relatorios.financeiro';

/** Nível de permissão de um perfil sobre um módulo (ver `AccessProfilePermission.level`). */
export type AccessModuleLevel = 'operate' | 'approve';

/** Descritor de um módulo atribuível (chave + rótulo pt-BR para telas administrativas). */
export interface AccessModuleDescriptor {
  key: AccessModuleKey;
  label: string;
}

/**
 * Lista ordenada (mesma ordem da matriz de `BUSINESS_RULES.md` §1) dos 26
 * módulos atribuíveis a um Perfil de Acesso, com rótulo pt-BR para uso em
 * telas administrativas (`GET /api/access-profiles/modules`).
 */
export const ACCESS_MODULES: readonly AccessModuleDescriptor[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'produtos', label: 'Produtos' },
  { key: 'contagens', label: 'Contagens de Inventário' },
  { key: 'vendas', label: 'Vendas' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'compras', label: 'Compras' },
  { key: 'requisicoes', label: 'Requisições de Compra' },
  { key: 'fornecedores', label: 'Fornecedores' },
  { key: 'comex', label: 'Importação (Comex)' },
  { key: 'producao', label: 'Produção' },
  { key: 'bom', label: 'Estrutura de Produtos (BOM)' },
  { key: 'mrp', label: 'MRP' },
  { key: 'chao_de_fabrica', label: 'Chão de Fábrica' },
  { key: 'centros_de_trabalho', label: 'Centros de Trabalho' },
  { key: 'qualidade', label: 'Qualidade' },
  { key: 'laboratorio', label: 'Laboratório' },
  { key: 'engenharia', label: 'Engenharia' },
  { key: 'estoque', label: 'Estoque' },
  { key: 'recebimento', label: 'Recebimento' },
  { key: 'expedicao', label: 'Expedição' },
  { key: 'patrimonio', label: 'Patrimônio' },
  { key: 'manutencao', label: 'Manutenção' },
  { key: 'garantia', label: 'Garantia/Assistência Técnica' },
  { key: 'rastreabilidade', label: 'Rastreabilidade' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'relatorios.producao', label: 'Relatórios de Produção' },
  { key: 'relatorios.compras', label: 'Relatórios de Compras' },
  { key: 'relatorios.custos', label: 'Relatórios de Custos' },
  { key: 'relatorios.financeiro', label: 'Relatórios Financeiros' },
];

/** Set de chaves válidas, para validação O(1) (`ACCESS_MODULE_KEYS.has(module)`). */
export const ACCESS_MODULE_KEYS: ReadonlySet<string> = new Set(ACCESS_MODULES.map((m) => m.key));

/**
 * Valida se uma string é uma `AccessModuleKey` conhecida.
 *
 * @param value - Valor candidato (tipicamente vindo de `req.body`/rota).
 * @returns `true` se `value` corresponde a uma chave da matriz fixa.
 */
export function isValidAccessModuleKey(value: string): value is AccessModuleKey {
  return ACCESS_MODULE_KEYS.has(value);
}

export default ACCESS_MODULES;

// Compatibilidade com imports CommonJS legados (`require(...)`) usados no projeto.
module.exports = ACCESS_MODULES;
module.exports.ACCESS_MODULES = ACCESS_MODULES;
module.exports.ACCESS_MODULE_KEYS = ACCESS_MODULE_KEYS;
module.exports.isValidAccessModuleKey = isValidAccessModuleKey;
module.exports.default = ACCESS_MODULES;
