import type { ComponentType } from 'react';
import {
  Boxes,
  Building2,
  Crown,
  DraftingCompass,
  Factory,
  HardHat,
  Home,
  Landmark,
  ListTree,
  Megaphone,
  PackageCheck,
  Scale,
  Send,
  Server,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';

/**
 * 🏢 Estrutura organizacional da navegação — espelho de
 * `server/src/config/seeds.ts` (17 departamentos, códigos `01`..`17`) e do
 * organograma em `docs/administrativo/05-ORGANOGRAMA_EXECUTIVO.md`.
 *
 * **Por que este arquivo existe, e por que ele carrega `code`/`sigla`.**
 * Até 2026-08-11 o menu declarava 9 "seções" inventadas — Logística,
 * Qualidade & Engenharia, Gestão, Administração — que não correspondiam a
 * nenhum departamento real. Fundiam SST dentro de Qualidade, Marketing
 * dentro de Vendas, e deixavam PCP sem lugar
 * (`docs/governance/auditorias/AUDITORIA_AMPLA_2026-08-11.md`, F1–F3).
 *
 * A causa não foi desatenção: **não havia vínculo mecânico** entre a
 * estrutura documentada e a tela. Os docs eram lidos por gente, o menu era
 * escrito de memória, e quando os dois discordavam nada falhava — nem
 * typecheck, nem teste, nem build. Por isso `code` e `sigla` estão aqui:
 * são a chave que a guarda `departments.seeds.test.ts` usa para cruzar este
 * arquivo com `seeds.ts` e **reprovar** quando divergirem.
 *
 * Regra ao mexer: mudou o organograma → mude `seeds.ts`, este arquivo e o
 * doc, na mesma rodada. O teste avisa se esquecer de um.
 *
 * **Duas chaves não são departamentos** (`synthetic: true`, sem `code`):
 * - `inicio` — espaço pessoal do usuário (painel + auto-serviço de chamados);
 * - `sistema` — administração do próprio ERP (usuários, perfis, fiscal,
 *   auditor), função de TI/Diretoria mas não uma área da fábrica.
 */

/** Diretorias do organograma (`05-ORGANOGRAMA_EXECUTIVO.md`). */
export type DirectorateKey = 'ceo' | 'industrial' | 'suprimentos' | 'comercial' | 'adminfin' | 'transversal';

export interface DirectorateDescriptor {
  key: DirectorateKey;
  label: string;
  /** Rótulo curto para a faixa de navegação. */
  shortLabel: string;
}

/**
 * Ordem = leitura do organograma, da fábrica para o apoio.
 *
 * `suprimentos` foi criada em 2026-08-11 por decisão do dono, reunindo
 * Compras + Almoxarifado + Expedição. Antes disso o organograma tinha três
 * defeitos que essa diretoria resolve: o desenho ASCII punha Almoxarifado
 * no braço Administrativo-Financeiro enquanto a tabela do mesmo arquivo o
 * punha no Industrial; a nota de Expedição ficava pendurada em Manutenção;
 * e Compras era rotulado "transversal, sem diretoria fixa" apesar de ser
 * departamento pleno no seed. Segue a distinção clássica entre *supply
 * chain* (comprar, armazenar, distribuir) e *operations* (transformar).
 *
 * ⚠️ O cargo de Diretor de Suprimentos & Logística está **vago** — é
 * estrutura-alvo, não ocupante atual.
 */
export const DIRECTORATES: readonly DirectorateDescriptor[] = [
  { key: 'ceo', label: 'Diretoria', shortLabel: 'Diretoria' },
  { key: 'industrial', label: 'Diretoria Industrial', shortLabel: 'Industrial' },
  { key: 'suprimentos', label: 'Suprimentos & Logística', shortLabel: 'Suprimentos' },
  { key: 'comercial', label: 'Diretoria Comercial', shortLabel: 'Comercial' },
  { key: 'adminfin', label: 'Administrativo-Financeiro', shortLabel: 'Adm-Financeiro' },
  { key: 'transversal', label: 'Transversal', shortLabel: 'Transversal' },
];

export interface DepartmentDescriptor {
  key: DepartmentKey;
  /**
   * Código do seed (`seeds.ts`, `'01'`..`'17'`). Ausente nas chaves
   * sintéticas. É por ele que a guarda cruza com o backend — **não** pelo
   * `departments.id` do banco, que é serial e hoje está deslocado em +1.
   */
  code?: string;
  /** Sigla do organograma (ENG, PCP, ALM…). Ausente nas sintéticas. */
  sigla?: string;
  /** Nome exibido — igual a `seeds.ts` quando não sintético. */
  label: string;
  /** Rótulo curto para a barra de abas, quando o nome completo é longo. */
  shortLabel?: string;
  directorate: DirectorateKey;
  icon: ComponentType<{ className?: string }>;
  /** Uma linha sobre o que a área faz — cabeçalho da sidebar. */
  description: string;
  /** Subáreas funcionais (`00-ESTRUTURA_ORGANIZACIONAL.md`), se houver. */
  subareas?: readonly string[];
  /** `true` = não corresponde a uma linha de `seeds.ts`. */
  synthetic?: boolean;
}

export type DepartmentKey =
  | 'inicio'
  | 'diretoria'
  | 'engenharia'
  | 'pcp'
  | 'producao'
  | 'qualidade'
  | 'manutencao'
  | 'compras'
  | 'almoxarifado'
  | 'expedicao'
  | 'vendas'
  | 'marketing'
  | 'rh'
  | 'financeiro'
  | 'juridico'
  | 'ti'
  | 'facilities'
  | 'sst'
  | 'sistema';

/**
 * Ordem = organograma lido de cima para baixo, diretoria por diretoria.
 * Não é alfabética de propósito: a barra de navegação conta a estrutura da
 * empresa, e dentro de Industrial/Suprimentos ela segue o fluxo do material.
 */
export const DEPARTMENTS: readonly DepartmentDescriptor[] = [
  {
    key: 'inicio',
    label: 'Início',
    directorate: 'ceo',
    icon: Home,
    description: 'Seu painel e seus chamados',
    synthetic: true,
  },
  {
    key: 'diretoria',
    code: '01',
    sigla: 'DIR',
    label: 'Diretoria',
    directorate: 'ceo',
    icon: Crown,
    description: 'Sala de comando e alçada de aprovação',
  },

  // ── Diretoria Industrial ────────────────────────────────────────────
  {
    key: 'engenharia',
    code: '03',
    sigla: 'ENG',
    label: 'Engenharia do Produto',
    shortLabel: 'Engenharia',
    directorate: 'industrial',
    icon: DraftingCompass,
    description: 'Cadastro de item, estrutura (BOM) e especificação técnica',
  },
  {
    key: 'pcp',
    code: '04',
    sigla: 'PCP',
    label: 'PCP',
    directorate: 'industrial',
    icon: ListTree,
    description: 'Plano mestre e necessidade de material',
  },
  {
    key: 'producao',
    code: '05',
    sigla: 'PROD',
    label: 'Produção',
    directorate: 'industrial',
    icon: Factory,
    description: 'Ordens, apontamento e chão de fábrica',
  },
  {
    key: 'qualidade',
    code: '10',
    sigla: 'QUAL',
    label: 'Qualidade',
    directorate: 'industrial',
    icon: ShieldAlert,
    description: 'Inspeção, não-conformidade e rastreabilidade',
    subareas: ['Laboratório de Testes (LAB)', 'Garantia da Qualidade (GQ)'],
  },
  {
    key: 'manutencao',
    code: '12',
    sigla: 'MANUT',
    label: 'Manutenção',
    directorate: 'industrial',
    icon: Wrench,
    description: 'Ordens de manutenção e patrimônio',
  },

  // ── Suprimentos & Logística (criada em 2026-08-11) ──────────────────
  {
    key: 'compras',
    code: '07',
    sigla: 'COMP',
    label: 'Compras',
    directorate: 'suprimentos',
    icon: Truck,
    description: 'Requisição, cotação, pedido e importação',
    subareas: ['Comércio Exterior (COMEX)'],
  },
  {
    key: 'almoxarifado',
    code: '06',
    sigla: 'ALM',
    label: 'Almoxarifado',
    directorate: 'suprimentos',
    icon: PackageCheck,
    description: 'Estoque de insumos, recebimento e inventário',
  },
  {
    key: 'expedicao',
    code: '11',
    sigla: 'EXP',
    label: 'Expedição',
    directorate: 'suprimentos',
    icon: Send,
    description: 'Separação, embalagem e embarque',
  },

  // ── Diretoria Comercial ─────────────────────────────────────────────
  {
    key: 'vendas',
    code: '08',
    sigla: 'VEND',
    label: 'Vendas',
    directorate: 'comercial',
    icon: ShoppingCart,
    description: 'Carteira de pedidos, clientes e pós-venda',
  },
  {
    key: 'marketing',
    code: '14',
    sigla: 'MKT',
    label: 'Marketing',
    directorate: 'comercial',
    icon: Megaphone,
    description: 'Campanhas, leads e materiais',
  },

  // ── Diretoria Administrativo-Financeira ─────────────────────────────
  {
    key: 'rh',
    code: '02',
    sigla: 'RH',
    label: 'Recursos Humanos',
    shortLabel: 'RH',
    directorate: 'adminfin',
    icon: Users,
    description: 'Funcionários e estrutura organizacional',
  },
  {
    key: 'financeiro',
    code: '09',
    sigla: 'FIN',
    label: 'Financeiro',
    directorate: 'adminfin',
    icon: Landmark,
    description: 'Contas, tesouraria, contabilidade e orçamento',
    subareas: ['Contabilidade (CONT)', 'Controladoria (CTR)', 'Tesouraria (TES)'],
  },
  {
    key: 'juridico',
    code: '16',
    sigla: 'JUR',
    label: 'Jurídico',
    directorate: 'adminfin',
    icon: Scale,
    description: 'Contratos, contencioso, PI e LGPD',
  },
  {
    key: 'ti',
    code: '13',
    sigla: 'TI',
    label: 'TI',
    directorate: 'adminfin',
    icon: Server,
    description: 'Helpdesk, ativos de TI e acessos',
  },
  {
    key: 'facilities',
    code: '17',
    sigla: 'FAC',
    label: 'Facilities',
    directorate: 'adminfin',
    icon: Building2,
    description: 'Frota, predial e serviços gerais',
  },

  // ── Transversal ─────────────────────────────────────────────────────
  {
    key: 'sst',
    code: '15',
    sigla: 'SST',
    label: 'Segurança do Trabalho',
    shortLabel: 'SST',
    directorate: 'transversal',
    icon: HardHat,
    description: 'EPI, ASO, CIPA e PGR',
  },
  {
    key: 'sistema',
    label: 'Sistema',
    directorate: 'transversal',
    icon: ShieldCheck,
    description: 'Administração do ERP',
    synthetic: true,
  },
];

const BY_KEY = new Map(DEPARTMENTS.map((d) => [d.key, d]));

export function getDepartment(key: DepartmentKey): DepartmentDescriptor {
  const found = BY_KEY.get(key);
  // Impossível pelo tipo; o fallback existe só para não derrubar o layout
  // inteiro caso um item de menu ganhe uma chave nova sem descritor.
  return found ?? { key, label: key, directorate: 'transversal', icon: Boxes, description: '' };
}

/** Rótulo da aba (curto quando existir), usado na barra de departamentos. */
export function departmentTabLabel(d: DepartmentDescriptor): string {
  return d.shortLabel ?? d.label;
}
