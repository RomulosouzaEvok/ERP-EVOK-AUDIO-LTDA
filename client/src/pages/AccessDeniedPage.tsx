import { Link } from 'react-router';
import { ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Tela de bloqueio exibida em duas situações (UC-35/UC-35-Exceção):
 * - Usuário navega diretamente por URL para um módulo fora do seu perfil de
 *   acesso (`accessDenied`, guard de rota do `AppLayout`);
 * - Usuário `role != admin` ainda não tem `access_profile_id` atribuído
 *   (`noProfile`) — bloqueio total, com o texto oficial do dono (UC-35-Exceção).
 */
export function AccessDeniedPage({ variant = 'accessDenied' }: { variant?: 'accessDenied' | 'noProfile' }) {
  const title = variant === 'noProfile' ? 'Acesso ainda não configurado' : 'Acesso negado';
  const message =
    variant === 'noProfile'
      ? 'Seu acesso ainda não foi configurado — procure o administrador.'
      : 'Você não tem permissão para acessar este módulo. Se acredita que isso é um erro, procure o administrador.';

  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="size-8" />
      </div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      {variant === 'accessDenied' && (
        <Button asChild>
          <Link to="/home">Voltar ao início</Link>
        </Button>
      )}
    </div>
  );
}

export default AccessDeniedPage;
