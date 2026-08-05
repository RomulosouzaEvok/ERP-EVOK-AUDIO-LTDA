import { DepartmentRequisitionsPage } from '@/pages/shared/DepartmentRequisitionsPage';

/** Requisições de compra do departamento de Produção (Bloco E). */
export default function ProductionRequisitionsPage() {
  return (
    <DepartmentRequisitionsPage
      title="Requisições de Produção"
      description="Requisições de compra abertas pelo departamento de Produção."
      origin="op"
    />
  );
}
