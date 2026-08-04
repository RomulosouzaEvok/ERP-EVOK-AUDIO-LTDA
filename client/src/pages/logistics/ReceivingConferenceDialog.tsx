import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router';
import { ShieldAlert } from 'lucide-react';

import * as purchasesApi from '@/api/purchases';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DidacticAlert } from '@/components/DidacticAlert';

const conferenceItemSchema = z.object({
  purchase_item_id: z.number(),
  pending: z.number(),
  quantity: z.string().optional(),
  lot_number: z.string().optional(),
  expires_at: z.string().optional(),
});

const conferenceSchema = z.object({
  invoice_number: z.string().trim().min(1, 'Informe o número da NF.'),
  warehouse_code: z.enum(['INSUMOS', 'LABORATORIO']),
  items: z.array(conferenceItemSchema),
});

type ConferenceFormData = z.infer<typeof conferenceSchema>;

/**
 * Dialog de conferência de recebimento: exibe pedido/já recebido/receber
 * agora por item, com `lot_number`/`expires_at` opcionais e `invoice_number`
 * obrigatório. Submete em `POST /api/purchases/:id/receive` no payload
 * exato aceito por `receivePurchaseItemsSchema`
 * (`{ invoice_number, items: [{ item_id, quantity, lot_number?, expires_at? }] }`).
 */
export function ReceivingConferenceDialog({
  purchaseId,
  onClose,
}: {
  purchaseId: number | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const { data: purchase, isLoading } = useQuery({
    queryKey: ['receiving-purchase-detail', purchaseId],
    queryFn: () => purchasesApi.getPurchase(purchaseId!),
    enabled: purchaseId !== null,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ConferenceFormData>({
    resolver: zodResolver(conferenceSchema),
    defaultValues: { invoice_number: '', warehouse_code: 'INSUMOS', items: [] },
  });

  const { fields } = useFieldArray({ control, name: 'items' });

  React.useEffect(() => {
    if (purchase) {
      reset({
        invoice_number: '',
        warehouse_code: 'INSUMOS',
        items: (purchase.items ?? []).map((item) => ({
          purchase_item_id: item.id,
          pending: Number(item.quantity) - Number(item.received_quantity),
          quantity: '',
          lot_number: '',
          expires_at: '',
        })),
      });
      setFormError(null);
      setSuccessMessage(null);
    }
  }, [purchase, reset]);

  const mutation = useMutation({
    mutationFn: (values: ConferenceFormData) => {
      const items = values.items
        .filter((item) => Number(item.quantity) > 0)
        .map((item) => ({
          item_id: item.purchase_item_id,
          quantity: Number(item.quantity),
          lot_number: item.lot_number?.trim() || undefined,
          expires_at: item.expires_at || undefined,
        }));
      if (items.length === 0) throw new Error('Informe a quantidade a receber de ao menos um item.');
      return purchasesApi.receivePurchaseItems(purchaseId!, {
        invoice_number: values.invoice_number.trim(),
        warehouse_code: values.warehouse_code,
        items,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receiving-queue'] });
      queryClient.invalidateQueries({ queryKey: ['logistics-lots'] });
      queryClient.invalidateQueries({ queryKey: ['quality-lots'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] });
      setFormError(null);
      setSuccessMessage('Recebimento registrado com sucesso.');
    },
    onError: (error) =>
      setFormError(
        translateApiError(
          error,
          `Não é possível confirmar o recebimento do Pedido ${purchase?.order_number ?? `#${purchaseId}`}`,
          'receive-purchase',
        ),
      ),
  });

  const handleClose = () => {
    setSuccessMessage(null);
    setFormError(null);
    onClose();
  };

  return (
    <Dialog open={purchaseId !== null} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Conferência de recebimento — {purchase?.order_number ?? ''}</DialogTitle>
          <DialogDescription>
            Informe a quantidade recebida de cada item. Lote e validade são opcionais, mas recomendados para
            rastreabilidade.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando pedido...</p>}

        {purchase && !successMessage && (
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
            noValidate
          >
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-1.5 max-w-xs">
                <Label htmlFor="invoice_number">Número da NF *</Label>
                <Input id="invoice_number" {...register('invoice_number')} />
                {errors.invoice_number && (
                  <p className="text-sm text-destructive">{errors.invoice_number.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5 max-w-xs">
                <Label htmlFor="warehouse_code">Depósito de destino *</Label>
                <SelectNative id="warehouse_code" {...register('warehouse_code')}>
                  <option value="INSUMOS">Insumos</option>
                  <option value="LABORATORIO">Laboratório</option>
                </SelectNative>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Pedida</TableHead>
                  <TableHead className="text-right">Já recebida</TableHead>
                  <TableHead>Receber agora</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Validade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => {
                  const purchaseItem = purchase.items?.[index];
                  return (
                    <TableRow key={field.id}>
                      <TableCell>
                        {purchaseItem?.product ? `${purchaseItem.product.code} — ${purchaseItem.product.name}` : purchaseItem?.product_id}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{purchaseItem ? Number(purchaseItem.quantity) : '-'}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {purchaseItem ? Number(purchaseItem.received_quantity) : '-'}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="any"
                          className="w-28 text-right tabular-nums"
                          placeholder={`máx. ${field.pending}`}
                          {...register(`items.${index}.quantity` as const)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="w-32"
                          placeholder="Nº do lote"
                          {...register(`items.${index}.lot_number` as const)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input type="date" className="w-36" {...register(`items.${index}.expires_at` as const)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {fields.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Itens não disponíveis.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {formError && <DidacticAlert error={formError} />}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                {mutation.isPending ? 'Registrando...' : 'Confirmar recebimento'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {successMessage && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <p>
                {successMessage} Lotes recebidos entram em quarentena para inspeção (Qualidade).{' '}
                <Link to="/quality" className="font-medium underline">
                  Ir para Qualidade
                </Link>
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
