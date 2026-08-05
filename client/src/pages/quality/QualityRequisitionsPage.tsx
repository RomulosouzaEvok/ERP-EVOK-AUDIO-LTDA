import { DepartmentRequisitionsPage } from '@/pages/shared/DepartmentRequisitionsPage';

/** Requisições de compra do departamento de Qualidade (Bloco E). */
export default function QualityRequisitionsPage() {
  return (
    <DepartmentRequisitionsPage
      title="Requisições de Qualidade"
      description="Requisições de compra abertas pelo departamento de Qualidade (materiais de laboratório, calibração)."
      origin="qualidade"
    />
  );
}
