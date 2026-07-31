import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';

import * as financialApi from '@/api/financial';
import { extractApiErrorMessage } from '@/api/httpClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'destructive' | 'secondary'> = {
  pending: 'secondary',
  paid: 'success',
  overdue: 'destructive',
  canceled: 'secondary',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Atrasado',
  canceled: 'Cancelado',
};

const payableSchema = z.object({
  description: z.string().min(1, 'Informe a descrição.'),
  amount: z.coerce.number().positive('Informe um valor maior que zero.'),
  due_date: z.string().min(1, 'Informe o vencimento.'),
});

type PayableFormData = z.infer<typeof payableSchema>;

/** `FE5`: contas a pagar/receber e fluxo de caixa agregado por período. */
export default function FinancialPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const { data: payables, isLoading: loadingPayables } = useQuery({
    queryKey: ['payables'],
    queryFn: () => financialApi.listPayables({ limit: 50 }),
  });
  const { data: receivables, isLoading: loadingReceivables } = useQuery({
    queryKey: ['receivables'],
    queryFn: () => financialApi.listReceivables({ limit: 50 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PayableFormData>({ resolver: zodResolver(payableSchema) });

  const createMutation = useMutation({
    mutationFn: financialApi.createPayable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payables'] });
      setOpen(false);
      reset();
      setFormError(null);
    },
    onError: (error) => setFormError(extractApiErrorMessage(error)),
  });

  const payMutation = useMutation({
    mutationFn: (id: number) => financialApi.payPayable(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payables'] }),
    onError: (error) => window.alert(extractApiErrorMessage(error, 'Não foi possível registrar o pagamento.')),
  });

  const receiveMutation = useMutation({
    mutationFn: (id: number) => financialApi.receivePayment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['receivables'] }),
    onError: (error) => window.alert(extractApiErrorMessage(error, 'Não foi possível registrar o recebimento.')),
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Financeiro</h1>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Contas a pagar</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus /> Nova conta a pagar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova conta a pagar</DialogTitle>
              </DialogHeader>
              <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => createMutation.mutate(values))} noValidate>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" {...register('description')} />
                  {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="amount">Valor</Label>
                    <Input id="amount" type="number" step="any" {...register('amount')} />
                    {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="due_date">Vencimento</Label>
                    <Input id="due_date" type="date" {...register('due_date')} />
                    {errors.due_date && <p className="text-sm text-destructive">{errors.due_date.message}</p>}
                  </div>
                </div>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Salvando...' : 'Criar conta'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingPayables && (
                <TableRow>
                  <TableCell colSpan={5}>Carregando...</TableCell>
                </TableRow>
              )}
              {payables?.data.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>{account.description}</TableCell>
                  <TableCell>R$ {Number(account.amount).toFixed(2)}</TableCell>
                  <TableCell>{new Date(account.due_date).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[account.status] ?? 'secondary'}>{STATUS_LABEL[account.status] ?? account.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {account.status === 'pending' && (
                      <Button size="sm" onClick={() => payMutation.mutate(account.id)}>
                        Registrar pagamento
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loadingPayables && payables?.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhuma conta a pagar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contas a receber</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingReceivables && (
                <TableRow>
                  <TableCell colSpan={5}>Carregando...</TableCell>
                </TableRow>
              )}
              {receivables?.data.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>{account.id}</TableCell>
                  <TableCell>R$ {Number(account.amount).toFixed(2)}</TableCell>
                  <TableCell>{new Date(account.due_date).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[account.status] ?? 'secondary'}>{STATUS_LABEL[account.status] ?? account.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {account.status === 'pending' && (
                      <Button size="sm" onClick={() => receiveMutation.mutate(account.id)}>
                        Registrar recebimento
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loadingReceivables && receivables?.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhuma conta a receber.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        A API de fluxo de caixa hoje só agrega totais por status no período (sem série diária) — assim que essa
        limitação do backend for resolvida, um gráfico de fluxo de caixa entra aqui.
      </p>
    </div>
  );
}
