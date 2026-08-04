import * as React from 'react';
import { Boxes, ScrollText, Layers, ClipboardList, ArrowLeftRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BalancesTab } from './BalancesTab';
import { ExtractTab } from './ExtractTab';
import { LotsTab } from './LotsTab';
import { CountsTab } from './CountsTab';
import { TransfersTab } from './TransfersTab';

type InventoryTab = 'balances' | 'extract' | 'lots' | 'counts' | 'transfers';

/**
 * `/logistics/estoque` — saldos de estoque, extrato de movimentações, lotes
 * (somente leitura) e atalho para contagem de inventário.
 *
 * Onda 1 da proposta de departamentos: separa a operação de estoque
 * (Logística) do cadastro de produto (Produtos), que passou a não ter mais
 * ação de movimentação nem coluna de saldo.
 */
export default function InventoryPage() {
  const [tab, setTab] = React.useState<InventoryTab>('balances');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Boxes className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Estoque</h1>
          <p className="text-sm text-muted-foreground">
            Saldos, movimentações, lotes e contagem de inventário.
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        <TabButton active={tab === 'balances'} icon={Boxes} onClick={() => setTab('balances')}>
          Saldos
        </TabButton>
        <TabButton active={tab === 'extract'} icon={ScrollText} onClick={() => setTab('extract')}>
          Extrato
        </TabButton>
        <TabButton active={tab === 'lots'} icon={Layers} onClick={() => setTab('lots')}>
          Lotes
        </TabButton>
        <TabButton active={tab === 'counts'} icon={ClipboardList} onClick={() => setTab('counts')}>
          Contagens
        </TabButton>
        <TabButton active={tab === 'transfers'} icon={ArrowLeftRight} onClick={() => setTab('transfers')}>
          Transferências
        </TabButton>
      </div>

      {tab === 'balances' && <BalancesTab />}
      {tab === 'extract' && <ExtractTab />}
      {tab === 'lots' && <LotsTab />}
      {tab === 'counts' && <CountsTab />}
      {tab === 'transfers' && <TransfersTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        'rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-brand/5 hover:text-brand',
        active && 'border-brand text-brand',
      )}
    >
      <Icon className="size-4" />
      {children}
    </Button>
  );
}
