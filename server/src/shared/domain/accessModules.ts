/**
 * 🔐 Catálogo fixo de módulos atribuíveis a um Perfil de Acesso (área/departamento).
 *
 * Fonte única de verdade (SSOT) da lista de 29 `module keys` válidos usada
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
 * `rh` foi adicionado em 2026-08-06 (BR-RH-020,
 * `docs/business/briefs/BRIEF_RH_2026-08-06.md`) para segregar o acesso a
 * dados sensíveis de funcionários (salário, CPF, dados bancários, endereço,
 * telefone pessoal) — LGPD arts. 5º/6º/46. Diferente dos demais módulos,
 * `rh` NÃO é usado com `authorizeModule` para bloquear rotas inteiras (a
 * listagem básica de `GET /api/employees` continua acessível a qualquer
 * autenticado, como já era usado por outras telas — ex.: seletor de
 * operador do apontamento e resolução de departamento do usuário logado);
 * ele é lido diretamente de `req.user.permissions.rh` dentro dos use cases
 * do módulo `employees` para decidir se os campos sensíveis do funcionário
 * devem ser incluídos na resposta (ver
 * `server/src/modules/employees/domain/services/employeeSensitiveFields.ts`).
 * `role === 'admin'` sempre vê os campos completos (mesmo padrão dos demais
 * módulos).
 * `sst` foi adicionado em 2026-08-06 (BLOCO 1 do módulo SST — Segurança e
 * Saúde do Trabalho, departamento 15,
 * `docs/business/BLOCO_1_SST_REQUISITOS.md` §5.3) para o mesmo domínio de
 * dados sensíveis de saúde (ASO, exames, restrições clínicas, acidentes,
 * CAT) — LGPD art. 5º, II (dado sensível) e art. 11. Diferente de `rh`,
 * `sst` é MAIS restritivo por decisão explícita do bloco: para a maioria
 * das entidades do módulo (ASO, Acidente, CAT), a leitura completa exige o
 * módulo `sst` via `authorizeModule` bloqueando a rota inteira (não basta
 * autenticação, como ocorre hoje em `GET /api/employees`); o RH consome
 * apenas um status derivado (apto/vencido/inapto), nunca o conteúdo
 * clínico — ver RF-SST-021/BR-SST-010/036 no bloco de requisitos.
 *
 * `ti` foi adicionado em 2026-08-07 (BLOCO 2 do módulo TI — Tecnologia da
 * Informação, departamento 13, `docs/business/BLOCO_2_TI_REQUISITOS.md`
 * §5.1/5.3) para o helpdesk, termo de responsabilidade de equipamento,
 * licenças e solicitações de acesso. `ti` é operado por 1-2 pessoas
 * (Analista de TI/suporte terceirizado, níveis `operate`/`approve`) e, para
 * a maior parte de suas rotas (gestão da fila, termos, licenças, execução
 * de acessos), segue o padrão restritivo de `authorizeModule('ti', ...)`
 * bloqueando a rota inteira, IGUAL a `sst`.
 *
 * `juridico` foi adicionado em 2026-08-07 (BLOCO 3 do módulo Jurídico,
 * departamento 16, `docs/business/BLOCO_3_JUR_REQUISITOS.md` §6.1) para
 * contratos, contencioso, prazos processuais, procurações, propriedade
 * intelectual e LGPD (RoPA, atendimento a titular, incidentes). Segue o
 * desenho MAIS RESTRITIVO do catálogo, igual a `sst`: mesmo usuário
 * autenticado sem o módulo `juridico` não deve enxergar contencioso,
 * prazos ou solicitações LGPD — `authorizeModule('juridico', ...)`
 * bloqueando a rota inteira é o padrão para praticamente todo o módulo.
 * Única exceção conhecida (BR-JUR-050): o perfil `financeiro` enxerga
 * **apenas** o relatório derivado de provisões/custos de contencioso
 * (RF-JUR-020) — nunca o conteúdo do processo em si —, mesmo padrão de
 * segregação de campo (não de rota inteira) já usado em `rh` para dados
 * sensíveis. Dado sensível reforçado (RNF-JUR-01): contencioso trabalhista
 * (processo movido por (ex-)empregado) e propriedade intelectual tipo
 * `trade_secret` (RF-JUR-033) — leitura completa exige módulo `juridico`,
 * nunca apenas autenticação.
 *
 * EXCEÇÃO EXPLÍCITA (BR-TI-001/RNF-TI-02, NÃO reproduzir por "consistência"
 * em retrofits futuros): a abertura e o acompanhamento do PRÓPRIO chamado
 * de TI (auto-serviço, ex.: `POST /api/it-tickets`,
 * `GET /api/it-tickets/mine`, comentar o próprio chamado) NÃO passam por
 * `authorizeModule('ti')` — qualquer usuário autenticado tem acesso, mesmo
 * sem nenhum módulo RBAC atribuído, com autorização por POSSE do registro
 * (`ticket.requester_id === req.user.id`), não por módulo. Esta chave `ti`
 * cobre apenas a GESTÃO da fila e os demais recursos do módulo — o desenho
 * exato do middleware de auto-serviço (rota fora do gate) é responsabilidade
 * do `ArquitetoSoftwareAPI`; este comentário só registra que `ti` não é, e
 * nunca deve ser, usado para bloquear a rota de auto-serviço.
 *
 * `facilities` foi adicionado em 2026-08-07 para o módulo Facilities
 * (Facilities/Serviços Gerais, departamento 17, sigla FAC —
 * `docs/administrativo/03-FACILITIES.md`), implementado do zero: frota de
 * veículos, abastecimento, programação de limpeza e áreas físicas. Módulo
 * essencialmente de cadastro/controle, sem fluxo de aprovação crítico —
 * todas as rotas usam `authorizeModule('facilities', 'operate')` para
 * escrita e `authorizeModule('facilities')` (nível `operate` implícito,
 * mesmo padrão de `centros_de_trabalho`/`sst`/`ti`) para leitura.
 *
 * `marketing` foi adicionado em 2026-08-07 para o módulo Marketing
 * (Marketing e Comunicação, departamento 14, sigla MKT —
 * `docs/comercial/02-MARKETING.md`), implementado do zero: campanhas, leads
 * (com funil dedicado) e materiais de divulgação (com upload de arquivo).
 * Mesmo padrão de `facilities`: sem nível `approve`, escrita usa
 * `authorizeModule('marketing', 'operate')`, leitura usa
 * `authorizeModule('marketing')` (nível `operate` implícito).
 *
 * `juridico` foi adicionado em 2026-08-07 para o módulo Jurídico
 * (departamento 16, sigla JUR — `docs/juridico/01-CONTRATOS.md` e
 * `docs/juridico/02-PROPRIEDADE_INTELECTUAL.md`), implementado do zero:
 * contratos (com aditivos, lembretes de prazo e upload de instrumento) e
 * propriedade intelectual. Mesmo padrão de `facilities`/`marketing`: sem
 * nível `approve`, escrita usa `authorizeModule('juridico', 'operate')`,
 * leitura usa `authorizeModule('juridico')` (nível `operate` implícito).
 *
 * `contabilidade` foi adicionado em 2026-08-07 para o módulo Contabilidade
 * (subárea CONT do departamento Financeiro, sem linha própria em
 * `departments` — `docs/financeiro/02-CONTABILIDADE.md`), implementado do
 * zero: Plano de Contas hierárquico, Lançamentos Contábeis em partida
 * dobrada (débito = crédito) e Balancete (relatório derivado). Diferente de
 * `facilities`/`marketing`/`juridico`, este módulo TEM nível `approve`:
 * `authorizeModule('contabilidade', 'approve')` protege as duas transições
 * de status mais sensíveis de um lançamento (`PATCH .../post`,
 * `PATCH .../reverse`, que fecham/desfazem a contabilização), enquanto
 * `authorizeModule('contabilidade', 'operate')` cobre o CRUD comum (contas,
 * criação/edição de lançamento em rascunho) e a leitura usa o nível padrão
 * (`authorizeModule('contabilidade')`, `operate` implícito).
 *
 * `tesouraria` foi adicionado em 2026-08-07 para o módulo Tesouraria
 * (subárea TES do departamento Financeiro, sem linha própria em
 * `departments` — `docs/financeiro/03-TESOURARIA.md`), implementado do
 * zero: Contas Bancárias (cadastro operacional, saldo mantido manualmente),
 * Operações Financeiras (empréstimos, aplicações, financiamentos, leasing)
 * e Posição de Caixa (relatório derivado). Conciliação bancária OFX/CNAB
 * NÃO faz parte deste módulo — permanece em `financeiro`
 * (`server/src/modules/financial/`), evitando duplicação de domínio. Mesmo
 * padrão de `contabilidade`: TEM nível `approve`, usado em
 * `authorizeModule('tesouraria', 'approve')` para as 2 transições de status
 * de uma operação financeira (`PATCH .../settle`, `PATCH .../cancel`, que
 * encerram um contrato financeiro), enquanto
 * `authorizeModule('tesouraria', 'operate')` cobre o CRUD comum (contas
 * bancárias, criação/edição de operação em `active`) e a leitura usa o
 * nível padrão (`authorizeModule('tesouraria')`, `operate` implícito).
 *
 * `controladoria` foi adicionado em 2026-08-07 para o módulo Controladoria
 * (subárea CTR do departamento Financeiro, sem linha própria em
 * `departments` — `docs/financeiro/00-README.md`, escopo "Custos
 * Industriais, Orçamento, DRE"). Diferente dos 5 módulos anteriores, este
 * NÃO tinha doc dedicado com tabelas SQL prontas: custeio industrial já
 * existia em `production`/`reports`, e Centros de Custo já existiam em
 * `financeiro` — o único pedaço novo é Orçamento (linhas de orçamento por
 * centro de custo + relatório orçado × realizado). Mesmo padrão de
 * `facilities`/`marketing`/`juridico`: sem nível `approve` (planejamento
 * orçamentário não tem transição de status sensível a proteger), escrita
 * usa `authorizeModule('controladoria', 'operate')`, leitura usa o nível
 * padrão (`authorizeModule('controladoria')`, `operate` implícito).
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
  | 'rh'
  | 'sst'
  | 'ti'
  | 'facilities'
  | 'marketing'
  | 'juridico'
  | 'contabilidade'
  | 'tesouraria'
  | 'controladoria'
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
  { key: 'rh', label: 'Recursos Humanos (dados sensíveis)' },
  { key: 'sst', label: 'Segurança e Saúde do Trabalho (dados sensíveis)' },
  { key: 'ti', label: 'Tecnologia da Informação (helpdesk, patrimônio de TI, acessos)' },
  { key: 'facilities', label: 'Facilities (frota, limpeza, manutenção predial)' },
  { key: 'marketing', label: 'Marketing (campanhas, leads, materiais)' },
  { key: 'juridico', label: 'Jurídico (contratos, propriedade intelectual)' },
  { key: 'contabilidade', label: 'Contabilidade (plano de contas, lançamentos, balancete)' },
  { key: 'tesouraria', label: 'Tesouraria (contas bancárias, operações financeiras)' },
  { key: 'controladoria', label: 'Controladoria (orçamento, custos industriais)' },
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
