import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import * as authApi from '@/api/auth';
import { extractApiErrorMessage } from '@/api/httpClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof changePasswordSchema>;

/**
 * Troca de senha autenticada (SEC-09). Ao concluir, a própria API invalida
 * a sessão atual (SEC-10) — o interceptor de 401 do `httpClient` cuida de
 * deslogar automaticamente na próxima chamada; aqui só avisamos o usuário.
 */
export default function ChangePasswordPage() {
  const { logout } = useAuth();
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(values: FormData) {
    setApiError(null);
    try {
      const message = await authApi.changePassword(values.currentPassword, values.newPassword);
      setSuccess(message);
      reset();
      setTimeout(() => logout(), 1500);
    } catch (error) {
      setApiError(extractApiErrorMessage(error));
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Trocar senha</CardTitle>
        <CardDescription>Ao trocar a senha, você precisará entrar novamente.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currentPassword">Senha atual</Label>
            <Input id="currentPassword" type="password" autoComplete="current-password" {...register('currentPassword')} />
            {errors.currentPassword && <p className="text-sm text-destructive">{errors.currentPassword.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">Nova senha</Label>
            <Input id="newPassword" type="password" autoComplete="new-password" {...register('newPassword')} />
            {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <Input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
          </div>
          {apiError && <p className="text-sm text-destructive">{apiError}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Trocar senha'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
