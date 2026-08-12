import * as React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Factory,
  Wallet,
  Search,
  Users,
  KeyRound,
  LogOut,
  BarChart3,
  Boxes,
  CalendarRange,
  ChevronRight,
  ClipboardList,
  ListTree,
  ShieldAlert,
  Warehouse,
  Settings2,
  PackageCheck,
  FlaskConical,
  DraftingCompass,
  Send,
  Zap,
  Plus,
  Wrench,
  LifeBuoy,
  Contact,
  Landmark,
  ShieldCheck,
  FileSpreadsheet,
  Container,
  Layers,
  HardHat,
  Server,
  Building2,
  Megaphone,
  Scale,
  Calculator,
  PiggyBank,
  ListOrdered,
  ClipboardCheck,
  ScrollText,
  Crown,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/api/auth';
import type { AccessModuleKey } from '@/api/accessProfiles';
import {
  DEPARTMENTS,
  DIRECTORATES,
  departmentTabLabel,
  getDepartment,
  type DepartmentDescriptor,
  type DepartmentKey,
} from '@/lib/departments';
import { getDashboardHandoffs } from '@/api/dashboard';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AccessDeniedPage } from '@/pages/AccessDeniedPage';

interface NavItem {
  /**
   * Departamento dono do processo (`@/lib/departments`). Não é regra de
   * acesso — só define em qual seção o item aparece.
   */
  department: DepartmentKey;
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
  /**
   * Módulo dono do item (UC-34/UC-35), usado para o menu dinâmico —
   * chaves de `server/src/shared/domain/accessModules.ts`. Itens sem
   * `module` (ex.: Início) sempre aparecem para qualquer usuário
   * autenticado, independente de perfil.
   */
  module?: AccessModuleKey;
  /**
   * Chave do contador de handoffs (UC-40, Bloco 3, ponto do dono ainda não
   * respondido — versão mínima e reversível implementada nesta entrega, ver
   * `docs/governance/TODO.md` rodapé). Mapeia para um valor numérico
   * derivado de `GET /api/dashboard/handoffs`. Itens sem `badgeKey` nunca
   * mostram badge.
   */
  badgeKey?: 'recebimento' | 'requisicoes' | 'expedicao' | 'qualidade' | 'compras_devolucoes';
}

interface NavSection {
  department: DepartmentDescriptor;
  items: NavItem[];
}

/**
 * 📋 Páginas do sistema, cada uma declarando o **departamento dono**.
 *
 * Esta é uma lista PLANA de propósito. As seções do menu não são escritas
 * aqui — elas são **derivadas** em tempo de render, agrupando os itens
 * visíveis por `department` na ordem canônica de `DEPARTMENTS`
 * (`@/lib/departments`). O usuário vê exatamente os departamentos onde o
 * perfil dele tem alguma página, e nada além.
 *
 * Seções fixas escritas à mão já divergiram do organograma real uma vez
 * (F1–F3, `AUDITORIA_AMPLA_2026-08-11.md`) — por isso a derivação.
 *
 * Regras ao mexer nesta lista:
 * 1. `to` é único. Dois itens com o mesmo destino quebram a resolução do
 *    departamento ativo — é literalmente o bug F1. O teste
 *    `AppLayout.navigation.test.tsx` reprova se isso voltar.
 * 2. `department` é o **dono do processo**, não quem consulta. Quem
 *    consulta é resolvido pelo módulo de permissão, não pela seção.
 * 3. `module` continua sendo a única regra de acesso (UC-34/UC-35). Este
 *    campo não concede nem restringe nada — só organiza.
 */
const NAV_ITEMS: NavItem[] = [
  // ── Início: espaço pessoal, não é departamento ──────────────────────
  { department: 'inicio', label: 'Painel', to: '/', icon: LayoutDashboard, module: 'dashboard' },
  // Meus Chamados: auto-serviço de Helpdesk de TI (BR-TI-001/RNF-TI-02),
  // sem `module` — visível a QUALQUER usuário autenticado, igual /hr.
  { department: 'inicio', label: 'Meus Chamados', to: '/meus-chamados', icon: LifeBuoy },
  // Chamado Predial: auto-serviço de Manutenção Predial (RF-FAC-040),
  // mesmo motivo/padrão de "Meus Chamados" acima — sem `module`.
  { department: 'inicio', label: 'Chamado Predial', to: '/chamado-predial', icon: Wrench },

  // ── Diretoria ────────────────────────────────────────────────────────
  // Módulo `diretor`: o mesmo que já governa a alçada de aprovação
  // (D-K/RF-JUR-003). Quem aprova é quem enxerga a sala de comando; o
  // `admin` entra pelo fallback de papel, como em todo o menu.
  { department: 'diretoria', label: 'Sala de Comando', to: '/dashboard', icon: Crown, module: 'diretor' },

  // ── Vendas ───────────────────────────────────────────────────────────
  { department: 'vendas', label: 'Pedidos de Venda', to: '/sales', icon: ShoppingCart, module: 'vendas' },
  { department: 'vendas', label: 'Clientes', to: '/sales/clients', icon: Contact, module: 'clientes' },
  // Garantia/Assistência Técnica = produto vendido que volta com defeito.
  // É **pós-venda**, e pós-venda é de Vendas: `docs/comercial/00-README.md`
  // lista "Assistente Comercial | VEND | Propostas, pedidos, pós-venda".
  // Não confundir com a subárea "Garantia da Qualidade" (GQ), que é função
  // de QA, não RMA de produto vendido.
  { department: 'vendas', label: 'Garantia / Assist. Técnica', to: '/service-orders', icon: LifeBuoy, module: 'garantia' },

  // ── Marketing ────────────────────────────────────────────────────────
  { department: 'marketing', label: 'Campanhas e Leads', to: '/marketing', icon: Megaphone, module: 'marketing' },

  // ── Compras ──────────────────────────────────────────────────────────
  { department: 'compras', label: 'Pedidos de Compra', to: '/purchases', icon: Truck, module: 'compras', badgeKey: 'compras_devolucoes' },
  { department: 'compras', label: 'Fila de aprovação', to: '/purchases/requisitions', icon: ClipboardList, module: 'requisicoes', badgeKey: 'requisicoes' },
  { department: 'compras', label: 'Cotação (RFQ)', to: '/purchases/rfqs', icon: FileSpreadsheet, module: 'compras' },
  { department: 'compras', label: 'Importação (Comex)', to: '/purchases/comex', icon: Container, module: 'comex' },
  { department: 'compras', label: 'Fornecedores', to: '/purchases/suppliers', icon: Truck, module: 'compras' },
  { department: 'compras', label: 'Relatórios de Compras', to: '/reports?tab=purchasing', icon: BarChart3, module: 'relatorios.compras' },

  // ── Almoxarifado ─────────────────────────────────────────────────────
  { department: 'almoxarifado', label: 'Estoque', to: '/logistics/estoque', icon: Warehouse, module: 'estoque' },
  { department: 'almoxarifado', label: 'Recebimento', to: '/logistics/recebimento', icon: PackageCheck, module: 'recebimento', badgeKey: 'recebimento' },
  { department: 'almoxarifado', label: 'Depósitos', to: '/logistics/warehouses', icon: Settings2, module: 'estoque' },
  { department: 'almoxarifado', label: 'Contagens de Inventário', to: '/products/inventory-counts', icon: ClipboardCheck, module: 'contagens' },
  { department: 'almoxarifado', label: 'Requisições do Almoxarifado', to: '/logistics/requisitions', icon: ClipboardList, module: 'estoque' },

  // ── Engenharia do Produto ────────────────────────────────────────────
  // O cadastro mestre de item e a estrutura de produto são da Engenharia:
  // quem CRIA o código é ela. Quem só consulta (almoxarife, comprador)
  // chega aqui pelo módulo `produtos`, que continua sendo a regra de
  // acesso — a seção organiza, não restringe.
  { department: 'engenharia', label: 'Engenharia', to: '/engineering', icon: DraftingCompass, module: 'engenharia' },
  { department: 'engenharia', label: 'Produtos', to: '/products', icon: Package, module: 'produtos' },
  { department: 'engenharia', label: 'Item Mestre', to: '/products/items', icon: Layers, module: 'produtos' },
  { department: 'engenharia', label: 'Estrutura de Produto (BOM)', to: '/production/bom', icon: ListTree, module: 'bom' },

  // ── PCP ──────────────────────────────────────────────────────────────
  { department: 'pcp', label: 'Plano Mestre (MPS)', to: '/production/master-plans', icon: CalendarRange, module: 'mrp' },
  { department: 'pcp', label: 'MRP', to: '/production/mrp', icon: ListTree, module: 'mrp' },

  // ── Produção ─────────────────────────────────────────────────────────
  { department: 'producao', label: 'Ordens de Produção', to: '/production', icon: Factory, module: 'producao' },
  { department: 'producao', label: 'Chão de Fábrica', to: '/production/shop-floor', icon: ClipboardList, module: 'chao_de_fabrica' },
  { department: 'producao', label: 'Roteiros de Fabricação', to: '/production/routes', icon: ListOrdered, module: 'producao' },
  { department: 'producao', label: 'Centros de Trabalho', to: '/production/work-centers', icon: Factory, module: 'centros_de_trabalho' },
  { department: 'producao', label: 'Requisições de Produção', to: '/production/requisitions', icon: ClipboardList, module: 'producao' },
  { department: 'producao', label: 'Relatórios de Produção', to: '/reports?tab=production', icon: BarChart3, module: 'relatorios.producao' },

  // ── Qualidade ────────────────────────────────────────────────────────
  { department: 'qualidade', label: 'Inspeção e NC', to: '/quality', icon: ShieldAlert, module: 'qualidade', badgeKey: 'qualidade' },
  { department: 'qualidade', label: 'Requisições de Qualidade', to: '/quality/requisitions', icon: ClipboardList, module: 'qualidade' },
  { department: 'qualidade', label: 'Laboratório', to: '/laboratory', icon: FlaskConical, module: 'laboratorio' },
  { department: 'qualidade', label: 'Rastreabilidade', to: '/traceability', icon: Search, module: 'rastreabilidade' },

  // ── Expedição ────────────────────────────────────────────────────────
  { department: 'expedicao', label: 'Expedição', to: '/logistics/expedicao', icon: Send, module: 'expedicao', badgeKey: 'expedicao' },

  // ── Manutenção ───────────────────────────────────────────────────────
  { department: 'manutencao', label: 'Ordens de Manutenção', to: '/maintenance', icon: Wrench, module: 'manutencao' },
  { department: 'manutencao', label: 'Requisições de Manutenção', to: '/maintenance/requisitions', icon: ClipboardList, module: 'manutencao' },
  { department: 'manutencao', label: 'Patrimônio', to: '/patrimonio', icon: Boxes, module: 'patrimonio' },

  // ── Segurança do Trabalho ────────────────────────────────────────────
  { department: 'sst', label: 'EPI, ASO, CIPA e PGR', to: '/sst', icon: HardHat, module: 'sst' },

  // ── Financeiro + subáreas Contabilidade/Tesouraria/
  //    Controladoria, que são subáreas funcionais e não departamentos
  //    próprios (`docs/00-ESTRUTURA_ORGANIZACIONAL.md`) ────────────────
  { department: 'financeiro', label: 'Contas e Fluxo de Caixa', to: '/financial', icon: Wallet, roles: ['admin', 'financial'], module: 'financeiro' },
  { department: 'financeiro', label: 'Contabilidade', to: '/accounting', icon: Calculator, roles: ['admin', 'financial'], module: 'contabilidade' },
  { department: 'financeiro', label: 'Tesouraria', to: '/treasury', icon: Landmark, roles: ['admin', 'financial'], module: 'tesouraria' },
  { department: 'financeiro', label: 'Controladoria', to: '/budget', icon: PiggyBank, roles: ['admin', 'financial'], module: 'controladoria' },
  { department: 'financeiro', label: 'Relatórios Financeiros', to: '/reports?tab=financial', icon: BarChart3, roles: ['admin', 'financial'], module: 'relatorios.financeiro' },
  { department: 'financeiro', label: 'Relatórios de Custos', to: '/reports?tab=costs', icon: BarChart3, module: 'relatorios.custos' },

  // ── Recursos Humanos ─────────────────────────────────────────────────
  // Sem `module`: `GET /api/employees` e `/api/departments` exigem só
  // sessão autenticada (o seletor de operador do chão de fábrica depende
  // disso). Os campos sensíveis — CPF, salário, banco, endereço — já são
  // filtrados no backend pelo módulo `rh`
  // (`employeeSensitiveFields.ts`, BR-RH-020/LGPD).
  { department: 'rh', label: 'Funcionários e Departamentos', to: '/hr', icon: Contact },

  // ── TI ───────────────────────────────────────────────────────────────
  { department: 'ti', label: 'Helpdesk e Ativos de TI', to: '/ti', icon: Server, module: 'ti' },

  // ── Facilities ───────────────────────────────────────────────────────
  { department: 'facilities', label: 'Frota e Predial', to: '/facilities', icon: Building2, module: 'facilities' },

  // ── Jurídico ─────────────────────────────────────────────────────────
  { department: 'juridico', label: 'Contratos e Contencioso', to: '/juridico', icon: Scale, module: 'juridico' },

  // ── Sistema: administração do ERP, não é departamento ────────────────
  { department: 'sistema', label: 'Usuários', to: '/users', icon: Users, roles: ['admin'] },
  { department: 'sistema', label: 'Perfis de Acesso', to: '/users/access-profiles', icon: KeyRound, roles: ['admin'] },
  { department: 'sistema', label: 'Log de Auditoria', to: '/audit-logs', icon: ScrollText, roles: ['admin'] },
  { department: 'sistema', label: 'Configuração Fiscal', to: '/settings/fiscal', icon: Landmark, roles: ['admin'] },
  { department: 'sistema', label: 'Auditor Inteligente', to: '/reports/auditor', icon: ShieldCheck, roles: ['admin'] },
];

/**
 * Exposto **apenas** para `AppLayout.navigation.test.tsx`, a guarda de
 * coerência do menu. Não usar em código de aplicação: quem precisa das
 * seções deve derivá-las como o layout faz, cruzando com as permissões.
 */
export const NAV_ITEMS_FOR_TEST: readonly NavItem[] = NAV_ITEMS;

interface QuickAction {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Atalhos de criação por departamento (pedido do dono do produto,
 * 2026-08-06): mesmo mecanismo de link simples usado no card "Atalhos" do
 * `DashboardPage` — sem estado novo, sem query param de auto-abertura de
 * diálogo. O link leva à página de listagem do módulo e o usuário aciona o
 * botão "novo" já existente lá (ex.: `/purchases/requisitions` abre a fila
 * de requisições, onde `RequisitionsPage` já tem seu próprio botão "Nova
 * requisição" com `Dialog` local). Chave = `DepartmentKey` (2026-08-11:
 * antes era o rótulo textual da seção fixa, que deixou de existir).
 * Departamentos sem ação de criação óbvia não têm entrada aqui de
 * propósito — o pedido foi explícito em não forçar atalho onde não existe
 * uma ação de criação clara e a seção já lista suas páginas normalmente.
 */
const SECTION_SHORTCUTS: Partial<Record<DepartmentKey, QuickAction[]>> = {
  inicio: [
    { label: 'Nova venda', to: '/sales', icon: ShoppingCart },
    { label: 'Novo pedido de compra', to: '/purchases', icon: Truck },
    { label: 'Nova ordem de produção', to: '/production', icon: Factory },
  ],
  vendas: [{ label: 'Nova venda', to: '/sales', icon: ShoppingCart }],
  compras: [
    { label: 'Novo pedido de compra', to: '/purchases', icon: Truck },
    { label: 'Nova requisição de compra', to: '/purchases/requisitions', icon: ClipboardList },
  ],
  producao: [{ label: 'Nova ordem de produção', to: '/production', icon: Factory }],
  almoxarifado: [{ label: 'Nova movimentação de estoque', to: '/logistics/estoque', icon: Warehouse }],
  manutencao: [{ label: 'Nova ordem de manutenção', to: '/maintenance', icon: Wrench }],
};

/**
 * Trilha de navegação **derivada** de `NAV_ITEMS` (2026-08-11).
 *
 * Derivar do menu impede a trilha de divergir dele (a versão manual
 * anterior envelheceu citando seções que não existiam).
 *
 * `EXTRA_BREADCRUMBS` cobre só as rotas que **não** são item de menu
 * (páginas de detalhe e utilitários), onde não há de onde derivar.
 */
const EXTRA_BREADCRUMBS: Record<string, string[]> = {
  '/change-password': ['Início', 'Trocar senha'],
  '/reports': ['Relatórios'],
  '/dashboard': ['Painel executivo'],
};

function breadcrumbTrail(pathname: string, search: string): string[] {
  // Rotas compartilhadas por departamentos (hoje só `/reports`) se
  // distinguem pela querystring: `/reports?tab=purchasing` é de Compras,
  // `?tab=production` é de Produção. Sem isso a trilha diria apenas
  // "Relatórios" e perderia justamente o departamento.
  const withQuery = NAV_ITEMS.find((item) => item.to.includes('?') && item.to === `${pathname}${search}`);
  if (withQuery) return [getDepartment(withQuery.department).label, withQuery.label];

  const exact = NAV_ITEMS.find((item) => item.to === pathname);
  if (exact) {
    const department = getDepartment(exact.department);
    // Em departamentos de uma página só, repetir o nome duas vezes é ruído
    // ("Expedição › Expedição"). Mostra só o departamento.
    return department.label === exact.label ? [department.label] : [department.label, exact.label];
  }

  if (EXTRA_BREADCRUMBS[pathname]) return EXTRA_BREADCRUMBS[pathname];

  // Rota de detalhe (ex.: /products/items/MP-057): herda a trilha do item de
  // menu mais específico que seja prefixo dela, e acrescenta o segmento
  // final como folha.
  const parent = NAV_ITEMS.filter((item) => item.to !== '/' && pathname.startsWith(`${item.to}/`)).sort(
    (a, b) => b.to.length - a.to.length,
  )[0];
  if (parent) {
    const leaf = decodeURIComponent(pathname.slice(parent.to.length + 1).split('/')[0] ?? '');
    const base = [getDepartment(parent.department).label, parent.label];
    return leaf ? [...base, leaf] : base;
  }

  return [pathname];
}

function Breadcrumbs() {
  const { pathname, search } = useLocation();
  const trail = breadcrumbTrail(pathname, search);

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Trilha de navegação">
      {trail.map((label, index) => (
        <React.Fragment key={label}>
          {index > 0 && <ChevronRight className="size-3.5" />}
          <span className={index === trail.length - 1 ? 'font-medium text-foreground' : ''}>{label}</span>
        </React.Fragment>
      ))}
    </nav>
  );
}

/**
 * Layout autenticado: sidebar com navegação dinâmica por perfil de acesso
 * (UC-34/UC-35) + header.
 *
 * Regras de visibilidade de cada item (combinadas — `roles` E `module`,
 * quando ambos presentes):
 * - `role = admin`: sempre vê tudo (menu completo, §3), como hoje;
 * - demais roles: item aparece se `!item.module` (item sem módulo
 *   associado, ex.: Início/Usuários controlados só por `roles`) OU se o
 *   módulo está presente no mapa de permissões resolvido
 *   (`hasModuleAccess`);
 * - **Fallback de segurança** (`permissionsFetchFailed`, ver
 *   `AuthContext`): se `GET /api/auth/me/permissions` falhar por erro de
 *   rede/500, o menu volta a ser filtrado só pela regra antiga de `roles`
 *   — nunca trava todo mundo por um bug de infraestrutura.
 * - Usuário `role != admin` sem perfil atribuído e sem falha de rede: menu
 *   fica vazio e a tela mostra o aviso didático "Seu acesso ainda não foi
 *   configurado" (UC-35-Exceção), com apenas o atalho para Trocar senha no
 *   header.
 */
export default function AppLayout() {
  const { user, hasRole, hasModuleAccess, permissions, permissionsFetchFailed, isPermissionsLoading, logout } = useAuth();
  const { pathname, search } = useLocation();

  const isAdmin = hasRole('admin');
  const usingRoleFallback = permissionsFetchFailed || isAdmin;

  // Bloco 3 (UC-40, ponto do dono ainda não respondido — versão mínima e
  // reversível): badge numérico discreto no menu, só para quem tem acesso
  // ao módulo `dashboard`. Falha da chamada nunca quebra o menu — `data`
  // fica `undefined` e nenhum badge é exibido (nenhum `onError`/retry
  // agressivo necessário, `useQuery` já não lança).
  const hasDashboardAccess = usingRoleFallback || hasModuleAccess('dashboard');
  const { data: handoffs } = useQuery({
    queryKey: ['dashboard-handoffs'],
    queryFn: getDashboardHandoffs,
    enabled: hasDashboardAccess,
    refetchInterval: 60_000,
    retry: false,
  });

  const badgeCount = (key?: NavItem['badgeKey']): number | undefined => {
    if (!key || !handoffs) return undefined;
    // Optional chaining em toda a cadeia: se a API (ex.: build antigo em
    // produção) responder sem alguma dessas chaves, o badge some — o menu
    // nunca pode quebrar por causa de um contador.
    switch (key) {
      case 'recebimento':
        return handoffs.recebimento?.pending;
      case 'requisicoes':
        return handoffs.requisicoes?.awaiting_approval;
      case 'expedicao':
        return handoffs.expedicao?.ready_to_ship;
      case 'qualidade': {
        const q = handoffs.qualidade;
        return q ? (q.quarantine ?? 0) + (q.open_rncs ?? 0) : undefined;
      }
      case 'compras_devolucoes':
        return handoffs.compras?.pending_returns;
      default:
        return undefined;
    }
  };

  const itemVisible = (item: NavItem): boolean => {
    if (item.roles && !hasRole(...item.roles)) return false;
    if (!item.module) return true;
    if (usingRoleFallback) return true;
    return hasModuleAccess(item.module);
  };

  // Seções = departamentos que sobraram depois do filtro de permissão, na
  // ordem canônica de `DEPARTMENTS` (fluxo do material). Um perfil de
  // Almoxarifado enxerga a aba Almoxarifado e mais nada; o admin enxerga
  // todas. Nenhuma seção é escrita à mão — é o cruzamento perfil × item.
  const visibleItems = NAV_ITEMS.filter(itemVisible);
  const visibleSections: NavSection[] = DEPARTMENTS.map((department) => ({
    department,
    items: visibleItems.filter((item) => item.department === department.key),
  })).filter((section) => section.items.length > 0);

  /** Soma das pendências do departamento — alimenta o badge da aba. */
  const sectionPendingCount = (section: NavSection): number =>
    section.items.reduce((total, item) => total + (badgeCount(item.badgeKey) ?? 0), 0);

  // Agrupamento por diretoria (`05-ORGANOGRAMA_EXECUTIVO.md`). Dá à barra a
  // leitura do organograma em vez de 18 abas soltas — e resolve o overflow
  // horizontal que o dono viu em 2026-08-11, quando a barra passava de
  // Expedição e sumia na borda.
  const visibleGroups = DIRECTORATES.map((directorate) => ({
    directorate,
    sections: visibleSections.filter((section) => section.department.directorate === directorate.key),
  })).filter((group) => group.sections.length > 0);

  // Rótulo da diretoria só quando há mais de uma à vista: para um
  // almoxarife que enxerga um departamento só, "SUPRIMENTOS" acima de uma
  // aba é ruído, não informação.
  const showDirectorateLabels = visibleGroups.length > 1;

  const renderDepartmentTab = (section: NavSection) => {
    const target = section.items[0]?.to ?? '/';
    const { key, icon: DeptIcon } = section.department;
    const isActiveSection = activeSection?.department.key === key;
    // Pendências somadas do departamento: o usuário vê onde há trabalho
    // parado sem precisar entrar em cada aba.
    const pending = sectionPendingCount(section);
    return (
      <NavLink
        key={key}
        to={target}
        title={section.department.description}
        className={cn(
          'group relative flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-white/60 transition-all duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:ring-offset-brand-dark',
          isActiveSection && 'border-brand text-white',
        )}
      >
        <DeptIcon
          className={cn(
            'size-4 shrink-0 transition-colors',
            isActiveSection ? 'text-brand' : 'text-white/40 group-hover:text-white/70',
          )}
        />
        {departmentTabLabel(section.department)}
        {pending > 0 && (
          <span
            className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-brand-foreground"
            title={`${pending} pendência(s) em ${section.department.label}`}
          >
            {pending > 99 ? '99+' : pending}
          </span>
        )}
      </NavLink>
    );
  };

  // Departamento ativo derivado apenas da rota atual, sem estado novo.
  //
  // Duas sutilezas que já causaram bug:
  // 1. Itens com querystring (ex.: "Relatórios de Compras" ->
  //    /reports?tab=purchasing) comparam pathname + search inteiros: várias
  //    áreas apontam para o mesmo /reports com tabs diferentes.
  // 2. **Prefixo mais longo vence.** `/production/bom` pertence à
  //    Engenharia e `/production` à Produção; casar pelo primeiro prefixo
  //    encontrado acusaria o departamento errado — a mesma classe do
  //    achado F1 da auditoria de 2026-08-11. Por isso ordena por tamanho
  //    de `to` antes de procurar, e exige limite de segmento (`/`) para
  //    não deixar `/products` casar com `/products-antigos`.
  const activeItem = [...NAV_ITEMS]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => {
      if (item.to.includes('?')) return `${pathname}${search}` === item.to;
      if (item.to === '/') return pathname === '/';
      return pathname === item.to || pathname.startsWith(`${item.to}/`);
    });

  const activeSection =
    (activeItem ? visibleSections.find((section) => section.department.key === activeItem.department) : undefined) ??
    visibleSections[0];

  // Sidebar sempre visível quando há uma seção ativa (2026-08-06: antes era
  // ocultada para departamentos com 1 item só — Início/Vendas —, mas isso
  // deixava a coluna lateral "vazia" e quebrava a consistência visual com o
  // resto do app; agora todo departamento mostra a caixa de navegação e,
  // quando aplicável, os atalhos de criação de `SECTION_SHORTCUTS`).
  const showSidebar = Boolean(activeSection);
  const sectionShortcuts = activeSection ? (SECTION_SHORTCUTS[activeSection.department.key] ?? []) : [];

  // UC-35-Exceção: usuário não-admin, sem perfil atribuído, sem falha de
  // rede (fallback não ativo) — bloqueio total com aviso didático.
  const hasNoProfileConfigured =
    !isAdmin && !permissionsFetchFailed && !isPermissionsLoading && (!permissions || Object.keys(permissions).length === 0);

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex flex-col border-b bg-brand-dark shadow-md">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="group flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-[0_0_16px_color-mix(in_oklch,var(--brand)_55%,transparent)] transition-transform duration-200 group-hover:scale-105">
              <Zap className="size-5" fill="currentColor" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight text-white">
                EVOK <span className="text-brand">ÁUDIO</span>
              </p>
              <p className="text-xs text-white/50">Gestão integrada</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm sm:block">
              <p className="font-medium leading-tight text-white">{user?.name}</p>
              <p className="text-xs text-white/50">{roleLabel(user?.role)}</p>
            </div>
            <Avatar className="size-9 ring-2 ring-white/10 transition-shadow duration-200 hover:ring-brand/60">
              <AvatarFallback className="bg-brand text-sm font-semibold text-brand-foreground">
                {initials(user?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="mx-1 hidden h-6 w-px bg-white/10 sm:block" aria-hidden />
            <Button
              asChild
              variant="ghost"
              size="icon"
              title="Trocar senha"
              className="text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Link to="/change-password">
                <KeyRound className="size-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Sair"
              onClick={logout}
              className="text-white/70 transition-colors hover:bg-destructive/20 hover:text-white"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>

        {/* Nível 1: departamentos — cada aba linka para a primeira página
            visível do departamento em `visibleSections` (derivado de
            `NAV_ITEMS`), sem rota nova. */}
        <nav className="overflow-x-auto border-t border-white/10 px-2" aria-label="Departamentos">
          {/*
            `w-max` + `mx-auto` (em vez de `justify-center` no container com
            `overflow-x-auto`) centraliza as abas quando cabem na largura da
            tela, mas em telas estreitas onde o conteúdo transborda, o navegador
            resolve as margens automáticas para 0 e o scroll continua normal
            (0..max), sem a "zona morta" à esquerda que `justify-center` causa
            em containers com overflow (parte do conteúdo ficaria inacessível
            por scroll em alguns navegadores).
          */}
          <div className="mx-auto flex w-max items-end gap-0.5">
            {visibleGroups.map((group, groupIndex) => (
              <div key={group.directorate.key} className="flex items-end">
                {/* Separador entre diretorias: um traço vertical discreto,
                    para o olho enxergar os blocos do organograma sem que a
                    barra vire uma lista de rótulos. */}
                {groupIndex > 0 && <span className="mx-1.5 mb-2 h-5 w-px shrink-0 bg-white/15" aria-hidden />}
                <div className="flex flex-col">
                  {showDirectorateLabels && (
                    <span className="px-3 pt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
                      {group.directorate.shortLabel}
                    </span>
                  )}
                  <div className="flex items-center gap-0.5">{group.sections.map(renderDepartmentTab)}</div>
                </div>
              </div>
            ))}
          </div>
        </nav>
      </header>
      <div className="flex flex-1 overflow-hidden">
        {/* Nível 2 (desktop): sidebar com as páginas do departamento ativo +,
            quando existir, um bloco "Atalhos" com ações de criação
            relevantes daquele departamento (`SECTION_SHORTCUTS`). Sempre
            visível quando há seção ativa — inclusive Início/Vendas, que têm
            1 página só (2026-08-06). */}
        {showSidebar && activeSection && (
          <aside
            key={activeSection.department.key}
            className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 hidden w-60 shrink-0 flex-col overflow-y-auto border-r bg-card p-2 py-3 md:flex"
          >
            {/* Cabeçalho do departamento: ícone + nome + uma linha do que a
                área faz. Deixa explícito em qual departamento o usuário
                está — antes era só um rótulo em caixa alta, e o rótulo
                podia ser uma seção que não existia na empresa. */}
            <div className="mb-2 flex items-start gap-2.5 rounded-lg bg-gradient-to-br from-brand/10 to-transparent px-3 py-2.5">
              <activeSection.department.icon className="mt-0.5 size-4 shrink-0 text-brand" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight text-foreground">
                  {activeSection.department.label}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  {activeSection.department.description}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              {activeSection.items.map((item) => {
                const { label, to, icon: Icon, badgeKey } = item;
                const count = badgeCount(badgeKey);
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium text-foreground/80 transition-all duration-150 hover:border-brand/30 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
                        isActive && 'border-brand bg-brand/10 font-semibold text-brand shadow-sm',
                      )
                    }
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{label}</span>
                    {Boolean(count) && (
                      <span
                        className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm"
                        title={`${count} pendente(s)`}
                      >
                        {count}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>

            {sectionShortcuts.length > 0 && (
              <>
                <p className="mt-4 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Atalhos
                </p>
                <div className="flex flex-col gap-1">
                  {sectionShortcuts.map((action) => (
                    <Link
                      key={`${action.to}-${action.label}`}
                      to={action.to}
                      className="flex items-center gap-2 rounded-md border border-dashed border-brand/30 bg-brand/5 px-3 py-2 text-sm font-medium text-brand transition-all duration-150 hover:border-brand hover:bg-brand/10 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
                    >
                      <Plus className="size-3.5 shrink-0" />
                      <span className="flex-1">{action.label}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </aside>
        )}

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Nível 2 (mobile/telas estreitas): mesma lista de páginas do
              departamento ativo, como uma segunda faixa de chips
              horizontais no lugar da sidebar (`hidden` em md+). */}
          {showSidebar && activeSection && (
            <nav
              className="flex items-center gap-2 overflow-x-auto border-b bg-muted/30 px-3 py-2 md:hidden"
              aria-label={`Páginas de ${activeSection.department.label}`}
            >
              {activeSection.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
                      isActive && 'bg-brand/10 text-brand',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              {/* Atalhos de criação (mesma lista de `SECTION_SHORTCUTS` do
                  desktop) — chip com contorno tracejado + ícone "+" para se
                  distinguir das abas de navegação acima, mesmo em telas
                  estreitas onde não há espaço para o rótulo "Atalhos". */}
              {sectionShortcuts.map((action) => (
                <Link
                  key={`${action.to}-${action.label}`}
                  to={action.to}
                  className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-dashed border-brand/40 bg-brand/5 px-3 py-1.5 text-xs font-medium text-brand transition-colors hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
                >
                  <Plus className="size-3 shrink-0" />
                  {action.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="border-b bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <Breadcrumbs />
          </div>

          <main className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 flex-1 overflow-auto bg-muted/20 p-6">
            {hasNoProfileConfigured ? <AccessDeniedPage variant="noProfile" /> : <Outlet />}
          </main>
        </div>
      </div>
    </div>
  );
}

function initials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function roleLabel(role?: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'financial':
      return 'Financeiro';
    case 'operator':
      return 'Operador';
    default:
      return '';
  }
}
