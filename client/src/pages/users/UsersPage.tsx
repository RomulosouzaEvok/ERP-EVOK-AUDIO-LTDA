import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';

import * as usersApi from '@/api/users';
import { extractApiErrorMessage } from '@/api/httpClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  operator: 'Operador',
  financial: 'Financeiro',
};

const userSchema = z.object({
  name: z.string().min(1, 'Informe o nome.'),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
  role: z.enum(['admin', 'operator', 'financial']),
});

type UserFormData = z.infer<typeof userSchema>;

/** `FE6`: administração de usuários (admin) — listar, criar, inativar, revogar sessões (SEC-12). */
export default function UsersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.listUsers({ limit: 50 }) });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({ resolver: zodResolver(userSchema), defaultValues: { role: 'operator' } });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const createMutation = useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => {
      invalidate();
      setOpen(false);
      reset();
      setFormError(null);
    },
    onError: (error) => setFormError(extractApiErrorMessage(error)),
  });

  const deactivateMutation = useMutation({
    mutationFn: usersApi.deactivateUser,
    onSuccess: invalidate,
    onError: (error) => window.alert(extractApiErrorMessage(error, 'Não foi possível inativar o usuário.')),
  });

  const revokeMutation = useMutation({
    mutationFn: usersApi.revokeUserSessions,
    onSuccess: (message) => window.alert(message),
    onError: (error) => window.alert(extractApiErrorMessage(error, 'Não foi possível revogar as sessões.')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Usuários</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus /> Novo usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo usuário</DialogTitle>
            </DialogHeader>
            <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => createMutation.mutate(values))} noValidate>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Senha provisória</Label>
                <Input id="password" type="password" {...register('password')} />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="role">Papel</Label>
                <SelectNative id="role" {...register('role')}>
                  <option value="operator">Operador</option>
                  <option value="financial">Financeiro</option>
                  <option value="admin">Administrador</option>
                </SelectNative>
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Criar usuário'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5}>Carregando...</TableCell>
            </TableRow>
          )}
          {data?.data.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{ROLE_LABEL[user.role] ?? user.role}</TableCell>
              <TableCell>
                <Badge variant={user.active ? 'success' : 'secondary'}>{user.active ? 'Ativo' : 'Inativo'}</Badge>
              </TableCell>
              <TableCell className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => revokeMutation.mutate(user.id)}>
                  Revogar sessões
                </Button>
                {user.active && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (window.confirm(`Inativar o usuário "${user.name}"?`)) {
                        deactivateMutation.mutate(user.id);
                      }
                    }}
                  >
                    Inativar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Nenhum usuário encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
