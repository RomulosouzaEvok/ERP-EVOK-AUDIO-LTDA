import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Users as UsersIcon } from 'lucide-react';

import * as usersApi from '@/api/users';
import * as accessProfilesApi from '@/api/accessProfiles';
import type { AccessModuleLevel } from '@/api/accessProfiles';
import { extractApiErrorMessage } from '@/api/httpClient';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  operator: 'Operador',
  financial: 'Financeiro',
};

/**
 * Rótulo do nível de acesso concedido por módulo (Bloco 1.4). O usuário
 * **não** tem um campo de nível próprio — o nível (operar/aprovar) já é
 * resolvido pela matriz módulo × nível do perfil de acesso atribuído (ver
 * `AssignAccessProfileUseCase`, decisão de arquitetura do Bloco 1.2). O
 * seletor de nível "dependendo do modelo de dados" citado em
 * `docs/governance/TODO.md` §1.4 é, portanto, a pré-visualização abaixo, e
 * não um campo editável adicional no usuário.
 */
const LEVEL_LABEL: Record<AccessModuleLevel, string> = {
  operate: 'Operar',
  approve: 'Aprovar',
};

const userSchema = z.object({
  name: z.string().min(1, 'Informe o nome.'),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
  role: z.enum(['admin', 'operator', 'financial']),
});

type UserFormData = z.infer<typeof userSchema>;

const assignProfileSchema = z.object({
  accessProfileId: z.string(),
});

type AssignProfileFormData = z.infer<typeof assignProfileSchema>;

/** `FE6`: administração de usuários (admin) — listar, criar, inativar, revogar sessões (SEC-12), atribuir perfil de acesso (UC-33). */
export default function UsersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [assigningUser, setAssigningUser] = React.useState<usersApi.User | null>(null);
  const [assignError, setAssignError] = React.useState<DidacticError | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['users', page],
    queryFn: () => usersApi.listUsers({ limit: 20, page }),
  });

  // Todos os perfis (não paginado) — usados para resolver o nome do perfil
  // de cada usuário na coluna "Perfil" e para o seletor do dialog de
  // atribuição (apenas os ativos são ofertados, UC-33).
  const { data: accessProfiles } = useQuery({
    queryKey: ['access-profiles'],
    queryFn: accessProfilesApi.listAccessProfiles,
  });

  const profileNameById = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const profile of accessProfiles ?? []) {
      map.set(profile.id, profile.nome);
    }
    return map;
  }, [accessProfiles]);

  const activeProfiles = React.useMemo(() => (accessProfiles ?? []).filter((profile) => profile.active), [accessProfiles]);

  // Módulos com rótulo pt-BR — usados para a pré-visualização de nível por
  // módulo do perfil selecionado no dialog "Atribuir perfil" (não há campo
  // de nível próprio no usuário, ver `LEVEL_LABEL`).
  const { data: modules } = useQuery({
    queryKey: ['access-profiles', 'modules'],
    queryFn: accessProfilesApi.listAccessModules,
  });

  const moduleLabelByKey = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const module of modules ?? []) {
      map.set(module.key, module.label);
    }
    return map;
  }, [modules]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({ resolver: zodResolver(userSchema), defaultValues: { role: 'operator' } });

  const {
    register: registerAssign,
    handleSubmit: handleAssignSubmit,
    reset: resetAssign,
    watch: watchAssign,
  } = useForm<AssignProfileFormData>({ resolver: zodResolver(assignProfileSchema), defaultValues: { accessProfileId: '' } });

  const selectedProfileId = watchAssign('accessProfileId');
  const selectedProfilePreview = React.useMemo(
    () => activeProfiles.find((profile) => String(profile.id) === selectedProfileId) ?? null,
    [activeProfiles, selectedProfileId],
  );

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

  const assignProfileMutation = useMutation({
    mutationFn: ({ userId, accessProfileId }: { userId: number; accessProfileId: number | null }) =>
      accessProfilesApi.assignAccessProfile(userId, accessProfileId),
    onSuccess: () => {
      invalidate();
      setAssigningUser(null);
      setAssignError(null);
    },
    onError: (error) => setAssignError(translateApiError(error, 'Não foi possível atribuir o perfil de acesso.')),
  });

  const openAssignDialog = (user: usersApi.User) => {
    setAssigningUser(user);
    resetAssign({ accessProfileId: user.accessProfileId ? String(user.accessProfileId) : '' });
    setAssignError(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <UsersIcon className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Usuários</h1>
            <p className="text-sm text-muted-foreground">Administração de contas, papéis e perfis de acesso do sistema.</p>
          </div>
        </div>
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
                <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
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
            <TableHead>Perfil</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar os usuários. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{ROLE_LABEL[user.role] ?? user.role}</TableCell>
              <TableCell>
                {user.role === 'admin' ? (
                  <span className="text-xs text-muted-foreground">Não se aplica (admin)</span>
                ) : user.accessProfileId ? (
                  profileNameById.get(user.accessProfileId) ?? '—'
                ) : (
                  <Badge variant="destructive">Sem perfil</Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={user.active ? 'success' : 'secondary'}>{user.active ? 'Ativo' : 'Inativo'}</Badge>
              </TableCell>
              <TableCell className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openAssignDialog(user)}>
                  Atribuir perfil
                </Button>
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
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhum usuário encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <Dialog
        open={Boolean(assigningUser)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setAssigningUser(null);
            setAssignError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir perfil de acesso — {assigningUser?.name}</DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            noValidate
            onSubmit={handleAssignSubmit((values) => {
              if (!assigningUser) return;
              assignProfileMutation.mutate({
                userId: assigningUser.id,
                accessProfileId: values.accessProfileId ? Number(values.accessProfileId) : null,
              });
            })}
          >
            {assigningUser?.role === 'admin' && (
              <p className="text-sm text-muted-foreground">
                Usuários administradores não são afetados por perfis de área — o admin global sempre tem acesso completo,
                independente do perfil atribuído aqui.
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="access-profile">Perfil de acesso</Label>
              <SelectNative id="access-profile" {...registerAssign('accessProfileId')}>
                <option value="">Sem perfil</option>
                {activeProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.nome}
                  </option>
                ))}
              </SelectNative>
            </div>

            {selectedProfilePreview && (
              <div className="flex flex-col gap-1.5 rounded-md border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Nível de acesso concedido por módulo (definido no perfil, não editável por usuário):
                </p>
                {selectedProfilePreview.permissions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Este perfil ainda não concede acesso a nenhum módulo.</p>
                ) : (
                  <ul className="flex flex-col gap-0.5 text-xs">
                    {selectedProfilePreview.permissions.map((permission) => (
                      <li key={permission.module} className="flex items-center justify-between gap-2">
                        <span>{moduleLabelByKey.get(permission.module) ?? permission.module}</span>
                        <Badge variant={permission.level === 'approve' ? 'default' : 'secondary'}>
                          {LEVEL_LABEL[permission.level]}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              A mudança de perfil vale a partir do próximo login do usuário — a sessão ativa (se houver) não é derrubada
              automaticamente. Para revogação imediata, use "Revogar sessões" ou inative o usuário.
            </p>
            {assignError && <DidacticAlert error={assignError} />}
            <DialogFooter>
              <Button type="submit" disabled={assignProfileMutation.isPending}>
                {assignProfileMutation.isPending ? 'Salvando...' : 'Salvar atribuição'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
