import * as React from 'react';
import { Link } from 'react-router';
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

const forgotPasswordSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
});

type FormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Tela de solicitação de recuperação de senha (SEC-12). A API sempre
 * responde com a mesma mensagem genérica, exista ou não o e-mail — o
 * frontend deve refletir isso e nunca tentar diferenciar os dois casos.
 */
export default function ForgotPasswordPage() {
  const [message, setMessage] = React.useState<string | null>(null);
  const [apiError, setApiError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: FormData) {
    setApiError(null);
    try {
      const result = await authApi.forgotPassword(values.email);
      setMessage(result);
    } catch (error) {
      setApiError(translateApiError(error, 'Não foi possível solicitar a recuperação de senha'));
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
                <CardTitle>Recuperar senha</CardTitle>
                <CardDescription>Informe seu e-mail para receber o link de recuperação.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {message ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm">{message}</p>
                <Button asChild variant="outline">
                  <Link to="/login">Voltar ao login</Link>
                </Button>
              </div>
            ) : (
              <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" autoComplete="username" {...register('email')} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
                {apiError && <DidacticAlert error={apiError} />}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
                </Button>
                <Link to="/login" className="text-center text-xs text-muted-foreground hover:underline">
                  Voltar ao login
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
