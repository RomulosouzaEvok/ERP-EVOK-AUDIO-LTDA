import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BalancesTab } from './BalancesTab';
import { ExtractTab } from './ExtractTab';
import { LotsTab } from './LotsTab';
import { CountsTab } from './CountsTab';

type InventoryTab = 'balances' | 'extract' | 'lots' | 'counts';

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
      <div>
        <h1 className="text-2xl font-semibold">Estoque</h1>
        <p className="text-sm text-muted-foreground">
          Saldos, movimentações, lotes e contagem de inventário.
        </p>
      </div>

      <div className="flex gap-1 border-b">
        <TabButton active={tab === 'balances'} onClick={() => setTab('balances')}>
          Saldos
        </TabButton>
        <TabButton active={tab === 'extract'} onClick={() => setTab('extract')}>
          Extrato
        </TabButton>
        <TabButton active={tab === 'lots'} onClick={() => setTab('lots')}>
          Lotes
        </TabButton>
        <TabButton active={tab === 'counts'} onClick={() => setTab('counts')}>
          Contagens
        </TabButton>
      </div>

      {tab === 'balances' && <BalancesTab />}
      {tab === 'extract' && <ExtractTab />}
      {tab === 'lots' && <LotsTab />}
      {tab === 'counts' && <CountsTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        'rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-transparent hover:text-foreground',
        active && 'border-primary text-foreground',
      )}
    >
      {children}
    </Button>
  );
}
