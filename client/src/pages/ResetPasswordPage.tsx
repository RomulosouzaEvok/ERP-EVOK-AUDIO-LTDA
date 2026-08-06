import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound } from 'lucide-react';

import evokLogo from '@/assets/brand/evok-logo.png';

import * as authApi from '@/api/auth';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
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
  const [apiError, setApiError] = React.useState<DidacticError | null>(null);
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
      setApiError(
        translateApiError(error, 'Não foi possível redefinir a senha', undefined, 'Token inválido ou expirado. Solicite um novo link.'),
      );
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-brand-dark p-4">
      {/* Glow verde de fundo, ecoando o "momento de marca" da tela de login */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--brand-vivid) 32%, transparent) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-2xl bg-white px-6 py-4 shadow-[0_0_40px_color-mix(in_oklch,var(--brand-vivid)_50%,transparent)]">
            <img src={evokLogo} alt="EVOK ÁUDIO" className="h-14 w-auto" />
          </div>
        </div>

        <Card className="w-full border-white/10 bg-card/95 shadow-2xl backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <KeyRound className="size-5" />
              </div>
              <div>
                <CardTitle>Redefinir senha</CardTitle>
                <CardDescription>Escolha uma nova senha para sua conta.</CardDescription>
              </div>
            </div>
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
                {apiError && <DidacticAlert error={apiError} />}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Redefinir senha'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
