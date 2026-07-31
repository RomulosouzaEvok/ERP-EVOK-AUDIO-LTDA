import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import * as authApi from '@/api/auth';
import { extractApiErrorMessage } from '@/api/httpClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof resetPasswordSchema>;

/**
 * Tela de conclusão da recuperação de senha (SEC-12). Lê o `token` da
 * query string (`/reset-password?token=...`), mesmo formato de link
 * gerado por `ForgotPasswordUseCase` no backend.
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(values: FormData) {
    if (!token) return;
    setApiError(null);
    try {
      await authApi.resetPassword(token, values.newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (error) {
      setApiError(extractApiErrorMessage(error, 'Token inválido ou expirado. Solicite um novo link.'));
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
          <CardDescription>Escolha uma nova senha para sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-destructive">Link inválido: token não informado.</p>
              <Button asChild variant="outline">
                <Link to="/forgot-password">Solicitar novo link</Link>
              </Button>
            </div>
          ) : success ? (
            <p className="text-sm">Senha redefinida com sucesso. Redirecionando para o login...</p>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input id="newPassword" type="password" autoComplete="new-password" {...register('newPassword')} />
                {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
              {apiError && <p className="text-sm text-destructive">{apiError}</p>}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Redefinir senha'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
