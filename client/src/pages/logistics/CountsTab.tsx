import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Aba "Contagens" — apenas um atalho para a página existente de contagem de
 * inventário (`/products/inventory-counts`). A página não foi movida nesta
 * onda; só ganhou um ponto de entrada adicional em Logística.
 */
export function CountsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="size-4" /> Contagem de inventário
        </CardTitle>
        <CardDescription>
          Planejamento e execução de contagens cíclicas/gerais, com aprovação de ajustes de estoque.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to="/products/inventory-counts">Abrir contagens de inventário</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
