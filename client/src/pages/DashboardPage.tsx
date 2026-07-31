import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** Página inicial pós-login. */
export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Olá, {user?.name?.split(' ')[0]}</h1>
        <p className="text-muted-foreground">Bem-vindo ao ERP EVOK ÁUDIO.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Próximos passos</CardTitle>
          <CardDescription>Use o menu lateral para acessar estoque, vendas, compras, produção e financeiro.</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
