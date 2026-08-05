import { DepartmentRequisitionsPage } from '@/pages/shared/DepartmentRequisitionsPage';

/** Requisições de compra do departamento de Manutenção (Bloco E). */
export default function MaintenanceRequisitionsPage() {
  return (
    <DepartmentRequisitionsPage
      title="Requisições de Manutenção"
      description="Requisições de compra abertas pelo departamento de Manutenção (peças, insumos)."
      origin="manutencao"
    />
  );
}
