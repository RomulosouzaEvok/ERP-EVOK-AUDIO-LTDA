import type * as React from 'react';

import type { AccessModuleKey } from '@/api/accessProfiles';
import type { UserRole } from '@/api/auth';

import { RecebimentoPendenteWidget } from '@/pages/home/widgets/RecebimentoPendenteWidget';
import { ExpedicaoProntaWidget } from '@/pages/home/widgets/ExpedicaoProntaWidget';
import { RequisicoesAprovacaoWidget } from '@/pages/home/widgets/RequisicoesAprovacaoWidget';
import { QualidadePendenciasWidget } from '@/pages/home/widgets/QualidadePendenciasWidget';
import { EstoqueCriticoWidget } from '@/pages/home/widgets/EstoqueCriticoWidget';
import { FinanceiroResumoWidget } from '@/pages/home/widgets/FinanceiroResumoWidget';
import { KpisExecutivosWidget } from '@/pages/home/widgets/KpisExecutivosWidget';
import { SstPendenciasWidget } from '@/pages/home/widgets/SstPendenciasWidget';
import { TiPendenciasWidget } from '@/pages/home/widgets/TiPendenciasWidget';
import { JuridicoPendenciasWidget } from '@/pages/home/widgets/JuridicoPendenciasWidget';
import { FacilitiesPendenciasWidget } from '@/pages/home/widgets/FacilitiesPendenciasWidget';

/**
 * Descritor de um widget da Home por Perfil (`HomePage.tsx`). A home monta o
 * grid filtrando este registry por `hasModuleAccess`/`role`, ordenando por
 * `priority` (menor primeiro) — nenhum widget é "hardcoded" na página, então
 * adicionar um módulo novo é só adicionar uma entrada aqui.
 */
export interface HomeWidgetDefinition {
  /** Chave estável (usada como `key` de lista e em telemetria futura, se houver). */
  key: string;
  /** Título exibido no cabeçalho do card (fallback caso o widget não tenha o seu próprio). */
  title: string;
  /**
   * Módulo(s) que liberam o widget — usa a mesma checagem `hasModuleAccess`
   * do menu (`AppLayout`) e do painel executivo. Quando é um array, basta
   * ter acesso a qualquer um dos módulos listados.
   */
  module: AccessModuleKey | AccessModuleKey[];
  /**
   * Restrição adicional por role (além do módulo) — usado pelo
   * `kpis-executivos`, que é módulo `dashboard` (concedido a todos), mas só
   * deve aparecer para quem também tem papel gerencial.
   */
  roles?: UserRole[];
  /** Ordem de exibição (menor primeiro). Widgets operacionais vêm antes do painel executivo. */
  priority: number;
  /** `wide` ocupa 2 colunas no grid denso (ex.: tabela de estoque crítico). */
  size?: 'default' | 'wide';
  component: React.ComponentType;
}

export const homeWidgets: HomeWidgetDefinition[] = [
  {
    key: 'recebimento-pendente',
    title: 'Recebimento pendente',
    module: 'recebimento',
    priority: 10,
    component: RecebimentoPendenteWidget,
  },
  {
    key: 'expedicao-pronta',
    title: 'Pronto para expedição',
    module: 'expedicao',
    priority: 20,
    component: ExpedicaoProntaWidget,
  },
  {
    key: 'requisicoes-aprovacao',
    title: 'Requisições aguardando aprovação',
    module: 'requisicoes',
    priority: 30,
    component: RequisicoesAprovacaoWidget,
  },
  {
    key: 'qualidade-pendencias',
    title: 'Pendências de qualidade',
    module: 'qualidade',
    priority: 40,
    component: QualidadePendenciasWidget,
  },
  {
    key: 'estoque-critico',
    title: 'Estoque crítico',
    module: 'estoque',
    priority: 50,
    size: 'wide',
    component: EstoqueCriticoWidget,
  },
  {
    key: 'sst-pendencias',
    title: 'Pendências de SST',
    module: 'sst',
    priority: 45,
    component: SstPendenciasWidget,
  },
  {
    key: 'ti-pendencias',
    title: 'Pendências de TI',
    module: 'ti',
    priority: 47,
    component: TiPendenciasWidget,
  },
  {
    key: 'juridico-pendencias',
    title: 'Pendências de Jurídico',
    module: 'juridico',
    priority: 48,
    component: JuridicoPendenciasWidget,
  },
  {
    key: 'facilities-pendencias',
    title: 'Vencimentos de Facilities',
    module: 'facilities',
    priority: 49,
    component: FacilitiesPendenciasWidget,
  },
  {
    key: 'financeiro-resumo',
    title: 'Contas a pagar atrasadas',
    module: 'financeiro',
    roles: ['admin', 'financial'],
    priority: 60,
    component: FinanceiroResumoWidget,
  },
  {
    key: 'kpis-executivos',
    title: 'Painel executivo',
    module: 'dashboard',
    roles: ['admin', 'financial'],
    priority: 100,
    size: 'wide',
    component: KpisExecutivosWidget,
  },
];
