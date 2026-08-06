import * as React from 'react';
import { LayoutDashboard } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import type { AccessModuleKey } from '@/api/accessProfiles';
import { homeWidgets, type HomeWidgetDefinition } from '@/pages/home/widgetRegistry';
import { cn } from '@/lib/utils';

const TODAY_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});

function capitalize(text: string): string {
  return text.length > 0 ? text[0].toUpperCase() + text.slice(1) : text;
}

/**
 * Home por Perfil (workspace por papel) — substitui o `DashboardPage`
 * executivo como rota `/` (`docs/governance/HANDOFF_CODEX.md`). Monta dinamicamente os
 * cards de `widgetRegistry.tsx` filtrados pelos módulos do perfil do usuário
 * logado (`hasModuleAccess`, UC-34), na mesma lógica de fallback de
 * segurança já usada pelo menu (`AppLayout`) e pelo painel executivo: role
 * `admin` ou falha de rede na busca de permissões nunca escondem widgets.
 *
 * Um almoxarife (perfil com módulos estoque/recebimento/expedição) vê só os
 * 2-3 widgets operacionais dele, em cards grandes (layout de foco); um admin
 * vê o grid denso completo, incluindo o painel executivo.
 */
export default function HomePage() {
  const { user, hasRole, hasModuleAccess, permissionsFetchFailed } = useAuth();

  const usingRoleFallback = permissionsFetchFailed || hasRole('admin');

  const isWidgetVisible = React.useCallback(
    (widget: HomeWidgetDefinition) => {
      const modules: AccessModuleKey[] = Array.isArray(widget.module) ? widget.module : [widget.module];
      const moduleOk = usingRoleFallback || modules.some((module) => hasModuleAccess(module));
      const roleOk = !widget.roles || widget.roles.length === 0 || hasRole(...widget.roles);
      return moduleOk && roleOk;
    },
    [usingRoleFallback, hasModuleAccess, hasRole],
  );

  const visibleWidgets = React.useMemo(
    () => homeWidgets.filter(isWidgetVisible).sort((a, b) => a.priority - b.priority),
    [isWidgetVisible],
  );

  // Layout de foco (cards grandes, menos densidade) quando o perfil só tem
  // 1-2 widgets — ex.: um almoxarife dedicado só a recebimento. Grid denso
  // nos demais casos (perfis com vários módulos, ex.: admin).
  const isFocusLayout = visibleWidgets.length <= 2;

  const todayLabel = capitalize(TODAY_FORMATTER.format(new Date()));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <LayoutDashboard className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Olá, {user?.name?.split(' ')[0]}</h1>
          <p className="text-sm text-muted-foreground">{todayLabel}</p>
        </div>
      </div>

      {visibleWidgets.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum widget disponível para o seu perfil de acesso ainda. Fale com o administrador do sistema se
          esperava ver algo aqui.
        </p>
      ) : (
        <div
          className={cn(
            'grid grid-cols-1 gap-4',
            isFocusLayout ? 'sm:grid-cols-1 lg:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-3',
          )}
        >
          {visibleWidgets.map((widget) => {
            const Component = widget.component;
            const spanClass = widget.size === 'wide' ? (isFocusLayout ? '' : 'sm:col-span-2 xl:col-span-2') : '';
            return (
              <div key={widget.key} className={cn(isFocusLayout && 'min-h-40', spanClass)}>
                <Component />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
