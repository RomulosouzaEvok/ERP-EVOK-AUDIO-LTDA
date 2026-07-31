import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';

import * as suppliersApi from '@/api/suppliers';
import { extractApiErrorMessage } from '@/api/httpClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const supplierSchema = z.object({
  company_name: z.string().min(1, 'Informe a razão social.'),
  trade_name: z.string().optional(),
  cnpj: z.string().min(1, 'Informe o CNPJ.'),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

/** `FE3`: cadastro/busca de fornecedores. */
export default function SuppliersPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => suppliersApi.listSuppliers({ search: search || undefined, limit: 50 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormData>({ resolver: zodResolver(supplierSchema) });

  const createMutation = useMutation({
    mutationFn: suppliersApi.createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setOpen(false);
      reset();
      setFormError(null);
    },
    onError: (error) => setFormError(extractApiErrorMessage(error)),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fornecedores</h1>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> Novo fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo fornecedor</DialogTitle>
              </DialogHeader>
              <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => createMutation.mutate(values))} noValidate>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="company_name">Razão social</Label>
                  <Input id="company_name" {...register('company_name')} />
                  {errors.company_name && <p className="text-sm text-destructive">{errors.company_name.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="trade_name">Nome fantasia</Label>
                  <Input id="trade_name" {...register('trade_name')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" {...register('cnpj')} />
                  {errors.cnpj && <p className="text-sm text-destructive">{errors.cnpj.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" {...register('phone')} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" {...register('email')} />
                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                  </div>
                </div>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                    {isSubmitting ? 'Salvando...' : 'Criar fornecedor'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Input placeholder="Buscar por razão social ou CNPJ..." value={search} onChange={(event) => setSearch(event.target.value)} className="max-w-sm" />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Razão social</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>E-mail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={4}>Carregando...</TableCell>
            </TableRow>
          )}
          {isError && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-destructive">
                Não foi possível carregar os fornecedores. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((supplier) => (
            <TableRow key={supplier.id}>
              <TableCell>{supplier.company_name}</TableCell>
              <TableCell>{supplier.cnpj}</TableCell>
              <TableCell>{supplier.phone ?? '-'}</TableCell>
              <TableCell>{supplier.email ?? '-'}</TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nenhum fornecedor encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
