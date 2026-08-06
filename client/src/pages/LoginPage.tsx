import * as React from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';

import evokLogo from '@/assets/brand/evok-logo.png';

import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe a senha.'),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Tela de login (`POST /api/auth/login`).
 *
 * Usa o logo oficial EVOK ÁUDIO (`@/assets/brand/evok-logo.png`, raio verde +
 * wordmark preto) sobre cartão branco no `BrandMark`, com o glow verde da
 * identidade neon da marca ao fundo.
 */
export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [apiError, setApiError] = React.useState<DidacticError | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  if (isAuthenticated) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={redirectTo} replace />;
  }

  async function onSubmit(values: LoginFormData) {
    setApiError(null);
    try {
      await login(values.email, values.password);
      navigate('/', { replace: true });
    } catch (error) {
      setApiError(
        translateApiError(error, 'Não foi possível entrar', undefined, 'Verifique suas credenciais e tente novamente.'),
      );
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-brand-dark p-4">
      {/* Glow verde de fundo, ecoando o wallpaper neon da marca */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--brand-vivid) 32%, transparent) 0%, transparent 70%),' +
            'radial-gradient(40% 40% at 90% 100%, color-mix(in oklch, var(--brand-vivid) 18%, transparent) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(color-mix(in oklch, white 100%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklch, white 100%, transparent) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6">
        <BrandMark />

        <Card className="w-full border-white/10 bg-card/95 shadow-2xl backdrop-blur">
          <CardHeader className="gap-1 text-center">
            <p className="text-lg font-semibold">Acessar o sistema</p>
            <p className="text-sm text-muted-foreground">Entre com seu e-mail e senha para continuar.</p>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" autoComplete="username" placeholder="voce@evokaudio.com" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-brand hover:underline">
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="pr-9"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Ocultar caracteres digitados' : 'Mostrar caracteres digitados'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>
              {apiError && <DidacticAlert error={apiError} />}
              <Button type="submit" disabled={isSubmitting} className="mt-2">
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-white/40">Qualidade é a nossa marca! · © {new Date().getFullYear()} EVOK ÁUDIO</p>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {/* Fundo branco: o wordmark "VOK AUDIO" do logo oficial é preto e sumiria sobre o fundo escuro */}
      <div className="rounded-2xl bg-white px-6 py-4 shadow-[0_0_40px_color-mix(in_oklch,var(--brand-vivid)_50%,transparent)]">
        <img src={evokLogo} alt="EVOK ÁUDIO" className="h-14 w-auto" />
      </div>
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">Gestão integrada</p>
    </div>
  );
}
