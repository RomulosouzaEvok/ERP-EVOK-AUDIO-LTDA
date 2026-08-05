import { DepartmentRequisitionsPage } from '@/pages/shared/DepartmentRequisitionsPage';

/** Requisições de compra do departamento de Logística (Bloco E). */
export default function LogisticsRequisitionsPage() {
  return (
    <DepartmentRequisitionsPage
      title="Requisições de Logística"
      description="Requisições de compra abertas pelo departamento de Logística."
      origin="logistica"
    />
  );
}
