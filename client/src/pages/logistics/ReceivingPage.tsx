import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, PackageSearch } from 'lucide-react';

import * as purchasesApi from '@/api/purchases';
import { HandoffDot } from '@/components/HandoffDot';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { ReceivingConferenceDialog } from './ReceivingConferenceDialog';

function formatDate(value?: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

function isOverdue(expectedDate?: string | null): boolean {
  if (!expectedDate) return false;
  return new Date(expectedDate).getTime() < Date.now();
}

/**
 * Origem de amostra da Engenharia (Bloco 2, UC-39) — mesma convenção
 * compartilhada com `RequisitionsPage.tsx`/backend (`origin` é texto livre).
 */
const ENGINEERING_SAMPLE_ORIGIN = 'engenharia_amostra';

/**
 * `/logistics/recebimento` — fila de pedidos de compra aguardando
 * recebimento (`status` `sent`/`partial`) e conferência de itens.
 *
 * O backend (`GET /api/purchases`) só aceita um único `status` por
 * requisição (sem OR) — por isso a fila combina duas buscas client-side.
 *
 * Bloco 2 (UC-39): pedidos originados de requisição de amostra da
 * Engenharia (`requisition.origin === 'engenharia_amostra'`) exibem o badge
 * "Amostra — Engenharia" ao lado do número do pedido.
 */
export default function ReceivingPage() {
  const [conferringPurchase, setConferringPurchase] = React.useState<purchasesApi.Purchase | null>(null);

  const { data: sentData, isLoading: isLoadingSent, isError: isErrorSent } = useQuery({
    queryKey: ['receiving-queue', 'sent'],
    queryFn: () => purchasesApi.listPurchases({ status: 'sent', limit: 50 }),
  });

  const { data: partialData, isLoading: isLoadingPartial, isError: isErrorPartial } = useQuery({
    queryKey: ['receiving-queue', 'partial'],
    queryFn: () => purchasesApi.listPurchases({ status: 'partial', limit: 50 }),
  });

  const isLoading = isLoadingSent || isLoadingPartial;
  const isError = isErrorSent || isErrorPartial;

  const queue = React.useMemo(() => {
    const combined = [...(sentData?.data ?? []), ...(partialData?.data ?? [])];
    return combined.sort((a, b) => {
      const dateA = a.expected_date ? new Date(a.expected_date).getTime() : Infinity;
      const dateB = b.expected_date ? new Date(b.expected_date).getTime() : Infinity;
      return dateA - dateB;
    });
  }, [sentData, partialData]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <PackageSearch className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Recebimento</h1>
          <p className="text-sm text-muted-foreground">
            Conferência de pedidos de compra enviados ou parcialmente recebidos.
          </p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-6" />
            <TableHead>Pedido</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Data prevista</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar a fila de recebimento. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {queue.map((purchase) => {
            const overdue = isOverdue(purchase.expected_date);
            return (
              <TableRow key={purchase.id}>
                <TableCell>{purchase.handoff_signal && <HandoffDot signal={purchase.handoff_signal} />}</TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {purchase.order_number}
                    {purchase.requisition?.origin === ENGINEERING_SAMPLE_ORIGIN && (
                      <Badge variant="outline">Amostra — Engenharia</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{purchase.supplier?.company_name ?? purchase.supplier_id}</TableCell>
                <TableCell className={overdue ? 'font-medium text-destructive' : ''}>
                  {formatDate(purchase.expected_date)}
                  {overdue && ' (vencida)'}
                </TableCell>
                <TableCell>
                  <Badge variant={purchase.status === 'partial' ? 'warning' : 'secondary'}>
                    {purchase.status === 'partial' ? 'Recebido parcial' : 'Enviado'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" onClick={() => setConferringPurchase(purchase)}>
                    <ClipboardCheck className="size-4" /> Conferir
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {!isLoading && !isError && queue.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhum pedido aguardando recebimento.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <ReceivingConferenceDialog
        purchaseId={conferringPurchase?.id ?? null}
        onClose={() => setConferringPurchase(null)}
      />
    </div>
  );
}
