import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QrCode } from 'lucide-react';

import * as productionApi from '@/api/production';
import * as bomApi from '@/api/bom';
import * as inventoryApi from '@/api/inventory';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ProductionOrder } from '@/api/production';

interface ScannedConsumption {
  product_id: number;
  name: string;
  neededQuantity: number;
  code: string;
  resolvedLot: inventoryApi.LotByCode | null;
  quantity: string;
  resolveError: string | null;
  resolving: boolean;
}

/**
 * Conclusão de OP no chão de fábrica com leitura/digitação de código de lote
 * (item 6 do roadmap, `docs/LEVANTAMENTO_ERP_2026-08-02.md` — rastreabilidade
 * por lote/QR). Diferente de `CompleteProductionOrderDialog`
 * (`/production/orders`, seleção por dropdown), aqui o operador digita ou lê
 * (leitor físico) o código do lote consumido — o componente resolve
 * `lot_number -> lot_control_id` via `GET /lots/by-code/:lot_number` antes de
 * montar o payload, pois a API de conclusão só aceita o `id` numérico para
 * consumo (`lot_consumptions`). O lote do produto acabado
 * (`finished_lot_number`) aceita o código digitado diretamente, sem resolver.
 */
export default function CompleteOrderWithLotScanDialog({
  order,
  onClose,
  onCompleted,
}: {
  order: ProductionOrder | null;
  onClose: () => void;
  onCompleted: (finishedLot: inventoryApi.LotByCode) => void;
}) {
  const queryClient = useQueryClient();
  const [consumptions, setConsumptions] = React.useState<ScannedConsumption[]>([]);
  const [finishedLotNumber, setFinishedLotNumber] = React.useState('');
  const [quantityProduced, setQuantityProduced] = React.useState('');
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<DidacticError | null>(null);

  const { data: bom } = useQuery({
    queryKey: ['bom-by-product', order?.product_id],
    queryFn: () => bomApi.getActiveBomByProduct(order!.product_id),
    enabled: Boolean(order),
  });

  const producedQty = Number(quantityProduced) || Number(order?.quantity ?? 0);

  const { data: explosion, isLoading: loadingExploded } = useQuery({
    queryKey: ['bom-explode', bom?.id, producedQty],
    queryFn: () => bomApi.explodeBom(bom!.id, producedQty),
    enabled: Boolean(bom?.id) && producedQty > 0,
  });

  React.useEffect(() => {
    if (!order) return;
    setQuantityProduced(String(order.quantity));
    setFinishedLotNumber(`OP-${order.id}-${Date.now()}`);
    setSubmitError(null);
  }, [order]);

  React.useEffect(() => {
    if (!explosion) return;
    setConsumptions(
      explosion.components.map((component) => ({
        product_id: component.component_id,
        name: component.component_name ?? `Produto #${component.component_id}`,
        neededQuantity: component.quantity,
        code: '',
        resolvedLot: null,
        quantity: String(component.quantity.toFixed(4)),
        resolveError: null,
        resolving: false,
      })),
    );
  }, [explosion]);

  React.useEffect(() => {
    if (bom === null && order) {
      setLoadError(
        'Este produto não tem estrutura (BOM) ativa cadastrada — não é possível concluir com rastreabilidade de consumo. Cadastre a BOM primeiro em "Produção → Estrutura de produto".',
      );
    } else {
      setLoadError(null);
    }
  }, [bom, order]);

  async function resolveCode(index: number, code: string) {
    setConsumptions((prev) =>
      prev.map((item, i) => (i === index ? { ...item, code, resolveError: null } : item)),
    );
    const trimmed = code.trim();
    if (!trimmed) return;

    setConsumptions((prev) => prev.map((item, i) => (i === index ? { ...item, resolving: true } : item)));
    try {
      const item = consumptions[index];
      const lot = await inventoryApi.resolveLotByCode(trimmed, item?.product_id);
      setConsumptions((prev) =>
        prev.map((entry, i) =>
          i === index ? { ...entry, resolvedLot: lot, resolving: false, resolveError: null } : entry,
        ),
      );
    } catch (error) {
      const didactic = translateApiError(error, 'Código de lote não resolvido');
      setConsumptions((prev) =>
        prev.map((entry, i) =>
          i === index
            ? { ...entry, resolvedLot: null, resolving: false, resolveError: didactic.reasons[0] ?? 'Código de lote não encontrado.' }
            : entry,
        ),
      );
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!order) return;
      const incomplete = consumptions.find((item) => !item.resolvedLot || !item.quantity);
      if (incomplete) {
        throw new Error(`Leia/digite o código de lote e a quantidade consumida de "${incomplete.name}".`);
      }
      await productionApi.completeProductionOrder(order.id, {
        quantity_produced: Number(quantityProduced),
        finished_lot_number: finishedLotNumber || undefined,
        lot_consumptions: consumptions.map((item) => ({
          product_id: item.product_id,
          lot_control_id: item.resolvedLot!.id,
          quantity: Number(item.quantity),
        })),
      });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['production-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (order && finishedLotNumber) {
        try {
          const finishedLot = await inventoryApi.resolveLotByCode(finishedLotNumber, order.product_id);
          onCompleted(finishedLot);
        } catch {
          // Lote produzido não pôde ser resolvido para impressão imediata do QR —
          // ainda assim a OP foi concluída com sucesso; operador pode imprimir depois em Estoque → Lotes.
        }
      }
      onClose();
    },
    onError: (error) =>
      setSubmitError(
        translateApiError(
          error,
          `Não é possível concluir a ordem de produção ${order?.order_number ?? `#${order?.id}`}`,
          'complete-production-order',
        ),
      ),
  });

  return (
    <Dialog open={Boolean(order)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Concluir OP com leitura de lote — {order?.order_number ?? order?.id}</DialogTitle>
        </DialogHeader>

        {loadError && <p className="text-sm text-destructive">{loadError}</p>}

        {!loadError && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="scanQuantityProduced">Quantidade produzida</Label>
                <Input
                  id="scanQuantityProduced"
                  className="h-12 text-base"
                  type="number"
                  step="any"
                  value={quantityProduced}
                  onChange={(event) => setQuantityProduced(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="scanFinishedLotNumber">Código do lote produzido (ler/digitar)</Label>
                <Input
                  id="scanFinishedLotNumber"
                  className="h-12 text-base"
                  value={finishedLotNumber}
                  onChange={(event) => setFinishedLotNumber(event.target.value)}
                  placeholder="Ex.: OP-123-lote"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Label>Lotes consumidos (leia/digite o código de cada componente)</Label>
              {loadingExploded && <p className="text-sm text-muted-foreground">Carregando estrutura...</p>}
              {consumptions.map((item, index) => (
                <ScannedComponentRow
                  key={item.product_id}
                  item={item}
                  onCodeChange={(code) => resolveCode(index, code)}
                  onQuantityChange={(quantity) =>
                    setConsumptions((prev) => prev.map((c, i) => (i === index ? { ...c, quantity } : c)))
                  }
                />
              ))}
              {!loadingExploded && consumptions.length === 0 && (
                <p className="text-sm text-muted-foreground">Estrutura sem componentes.</p>
              )}
            </div>

            {submitError && <DidacticAlert error={submitError} />}
          </div>
        )}

        <DialogFooter>
          <Button
            className="min-h-12 w-full"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || Boolean(loadError) || consumptions.length === 0}
          >
            {mutation.isPending ? 'Concluindo...' : 'Concluir produção'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScannedComponentRow({
  item,
  onCodeChange,
  onQuantityChange,
}: {
  item: ScannedConsumption;
  onCodeChange: (code: string) => void;
  onQuantityChange: (quantity: string) => void;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-md border p-3 transition-colors ${
        item.resolvedLot ? 'border-brand/40 bg-brand/5' : 'border-input'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            Necessário: <span className="tabular-nums">{item.neededQuantity.toFixed(4)}</span>
          </p>
        </div>
        {item.resolvedLot && (
          <span className="flex items-center gap-1 text-xs font-medium text-success">
            <QrCode className="size-3.5" /> Lote {item.resolvedLot.lot_number} · saldo{' '}
            <span className="tabular-nums">{item.resolvedLot.quantity_available}</span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          className="h-11 flex-1 text-base"
          placeholder="Código do lote (ler ou digitar)"
          value={item.code}
          onChange={(event) => onCodeChange(event.target.value)}
        />
        <Input
          type="number"
          step="any"
          className="h-11 w-28 text-right text-base tabular-nums"
          value={item.quantity}
          onChange={(event) => onQuantityChange(event.target.value)}
        />
      </div>
      {item.resolving && <p className="text-xs text-muted-foreground">Verificando código...</p>}
      {item.resolveError && <p className="text-xs text-destructive">{item.resolveError}</p>}
    </div>
  );
}
