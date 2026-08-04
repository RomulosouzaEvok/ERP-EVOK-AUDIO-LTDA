import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';

import * as accessProfilesApi from '@/api/accessProfiles';
import type { AccessModuleKey, AccessModuleLevel } from '@/api/accessProfiles';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { DidacticAlert } from '@/components/DidacticAlert';

/** Nível de permissão exibido na matriz, incluindo o valor "sem acesso" (ausência de linha no backend). */
type MatrixLevel = 'none' | AccessModuleLevel;

const LEVEL_LABEL: Record<MatrixLevel, string> = {
  none: 'Sem acesso',
  operate: 'Operar',
  approve: 'Aprovar',
};

const profileSchema = z.object({
  nome: z.string().min(1, 'Informe o nome do perfil.'),
  descricao: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

/** Estado local da matriz módulo × nível dentro do formulário (fora do react-hook-form por simplicidade — array dinâmico de 26 linhas). */
type MatrixState = Partial<Record<AccessModuleKey, MatrixLevel>>;

/**
 * `FE — Bloco 1.4`: tela "Usuários > Perfis de Acesso" (UC-30 a UC-32),
 * admin-only. Lista perfis, cria/edita com a matriz de 26 módulos ×
 * nível, e desativa com o tratamento didático do bloqueio 422 (UC-32 —
 * usuários ativos vinculados).
 */
export default function AccessProfilesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editingProfile, setEditingProfile] = React.useState<accessProfilesApi.AccessProfile | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [matrix, setMatrix] = React.useState<MatrixState>({});
  const [deactivateError, setDeactivateError] = React.useState<DidacticError | null>(null);

  const { data: profiles, isLoading, isError } = useQuery({
    queryKey: ['access-profiles'],
    queryFn: accessProfilesApi.listAccessProfiles,
  });

  const { data: modules, isLoading: isLoadingModules } = useQuery({
    queryKey: ['access-profiles', 'modules'],
    queryFn: accessProfilesApi.listAccessModules,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({ resolver: zodResolver(profileSchema) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['access-profiles'] });

  const closeDialog = () => {
    setOpen(false);
    setEditingProfile(null);
    setFormError(null);
    setMatrix({});
    reset({ nome: '', descricao: '' });
  };

  const openCreateDialog = () => {
    setEditingProfile(null);
    setMatrix({});
    reset({ nome: '', descricao: '' });
    setFormError(null);
    setOpen(true);
  };

  const openEditDialog = (profile: accessProfilesApi.AccessProfile) => {
    setEditingProfile(profile);
    const nextMatrix: MatrixState = {};
    for (const perm of profile.permissions) {
      nextMatrix[perm.module] = perm.level;
    }
    setMatrix(nextMatrix);
    reset({ nome: profile.nome, descricao: profile.descricao ?? '' });
    setFormError(null);
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: ProfileFormData) => {
      const permissions = Object.entries(matrix)
        .filter((entry): entry is [AccessModuleKey, AccessModuleLevel] => entry[1] !== 'none' && entry[1] !== undefined)
        .map(([module, level]) => ({ module, level }));

      const input: accessProfilesApi.AccessProfileInput = {
        nome: values.nome,
        descricao: values.descricao || null,
        permissions,
      };

      if (editingProfile) {
        return accessProfilesApi.updateAccessProfile(editingProfile.id, input);
      }
      return accessProfilesApi.createAccessProfile(input);
    },
    onSuccess: () => {
      invalidate();
      closeDialog();
    },
    onError: (error) => {
      const didactic = translateApiError(
        error,
        editingProfile ? 'Não foi possível salvar as alterações do perfil.' : 'Não foi possível criar o perfil de acesso.',
      );
      setFormError(didactic.reasons.join(' '));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: accessProfilesApi.deactivateAccessProfile,
    onSuccess: () => {
      invalidate();
      setDeactivateError(null);
    },
    onError: (error) => {
      setDeactivateError(translateApiError(error, 'Não foi possível desativar o perfil de acesso.'));
    },
  });

  const setLevel = (module: AccessModuleKey, level: MatrixLevel) => {
    setMatrix((prev) => ({ ...prev, [module]: level }));
  };

  const onSubmit = handleSubmit((values) => {
    const hasAnyPermission = Object.values(matrix).some((level) => level && level !== 'none');
    if (!hasAnyPermission) {
      setFormError('Perfil deve conceder acesso a pelo menos um módulo.');
      return;
    }
    setFormError(null);
    saveMutation.mutate(values);
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Perfis de Acesso</h1>
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              closeDialog();
            } else {
              setOpen(true);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus /> Novo perfil
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProfile ? `Editar perfil "${editingProfile.nome}"` : 'Novo perfil de acesso'}</DialogTitle>
            </DialogHeader>
            <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nome">Nome</Label>
                  <Input id="nome" {...register('nome')} />
                  {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="descricao">Descrição (opcional)</Label>
                  <Input id="descricao" {...register('descricao')} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Matriz de permissões por módulo</Label>
                <div className="max-h-[50vh] overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Módulo</TableHead>
                        <TableHead className="w-[420px]">Nível de acesso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingModules && <TableSkeletonRows columns={2} />}
                      {modules?.map((module) => {
                        const currentLevel: MatrixLevel = matrix[module.key] ?? 'none';
                        return (
                          <TableRow key={module.key}>
                            <TableCell className="font-medium">{module.label}</TableCell>
                            <TableCell>
                              <div className="flex gap-4">
                                {(['none', 'operate', 'approve'] as MatrixLevel[]).map((level) => (
                                  <label key={level} className="flex items-center gap-1.5 text-sm">
                                    <input
                                      type="radio"
                                      name={`level-${module.key}`}
                                      value={level}
                                      checked={currentLevel === level}
                                      onChange={() => setLevel(module.key, level)}
                                    />
                                    {LEVEL_LABEL[level]}
                                  </label>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting || saveMutation.isPending}>
                  {saveMutation.isPending ? 'Salvando...' : editingProfile ? 'Salvar alterações' : 'Criar perfil'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {deactivateError && <DidacticAlert error={deactivateError} />}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Módulos</TableHead>
            <TableHead>Usuários</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar os perfis de acesso. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {profiles?.map((profile) => (
            <TableRow key={profile.id}>
              <TableCell className="font-medium">{profile.nome}</TableCell>
              <TableCell className="text-muted-foreground">{profile.descricao || '—'}</TableCell>
              <TableCell>{profile.permissions.length}</TableCell>
              <TableCell>{profile.userCount}</TableCell>
              <TableCell>
                <Badge variant={profile.active ? 'success' : 'secondary'}>{profile.active ? 'Ativo' : 'Inativo'}</Badge>
              </TableCell>
              <TableCell className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEditDialog(profile)}>
                  Editar
                </Button>
                {profile.active && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={deactivateMutation.isPending}
                    onClick={() => {
                      if (window.confirm(`Desativar o perfil "${profile.nome}"?`)) {
                        setDeactivateError(null);
                        deactivateMutation.mutate(profile.id);
                      }
                    }}
                  >
                    Desativar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && profiles?.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhum perfil de acesso cadastrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
