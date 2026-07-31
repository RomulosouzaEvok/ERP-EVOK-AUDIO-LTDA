import * as React from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import * as authApi from '@/api/auth';
import { extractApiErrorMessage } from '@/api/httpClient';
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
  const [apiError, setApiError] = React.useState<string | null>(null);

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
      setApiError(extractApiErrorMessage(error));
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Recuperar senha</CardTitle>
          <CardDescription>Informe seu e-mail para receber o link de recuperação.</CardDescription>
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
              {apiError && <p className="text-sm text-destructive">{apiError}</p>}
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
  );
}
