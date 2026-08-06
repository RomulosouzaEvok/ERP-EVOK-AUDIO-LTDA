import * as React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

/**
 * Última linha de defesa contra tela branca: qualquer erro de renderização
 * não tratado cai aqui e vira uma tela de erro amigável com opção de
 * recarregar, em vez de derrubar a árvore inteira do React sem mensagem.
 * (Incidente 2026-08-06 — docs/incidentes/2026-08-06-tela-branca-applayout.md)
 */
export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AppErrorBoundary] erro de renderização não tratado:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" />
        </span>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">Algo deu errado nesta tela</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Ocorreu um erro inesperado ao exibir a página. Recarregue para tentar de novo; se
            persistir, informe o suporte citando o horário e o que estava fazendo.
          </p>
        </div>
        <details className="max-w-lg text-left text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">Detalhes técnicos</summary>
          <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3">{this.state.error.message}</pre>
        </details>
        <Button onClick={() => window.location.reload()}>
          <RotateCcw /> Recarregar página
        </Button>
      </div>
    );
  }
}
