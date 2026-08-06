/**
 * Tipos compartilhados dos contratos JSON da API do ERP consumidos pelo app
 * de TV. Espelha os DTOs reais retornados pelo backend — não modele campos
 * que o backend não envia.
 */

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface LoginResponseData {
  token: string;
  user: AuthUser;
}

/**
 * Contratos de `GET /api/dashboard/department-demands` — ver
 * `docs/arquitetura/API.md` seção "14. Dashboard / Painel de TV".
 */
export interface DepartmentDemandItem {
  id: number;
  reference: string;
  status: string;
  due_date: string | null;
  label: string | null;
}

export interface DepartmentDemandGroup {
  count: number;
  items: DepartmentDemandItem[];
}

export interface DepartmentDemand {
  department_id: number | null;
  department_name: string;
  open_production_orders: DepartmentDemandGroup;
  open_purchase_requisitions: DepartmentDemandGroup;
  open_inventory_counts: DepartmentDemandGroup;
}

export interface DepartmentDemandsResponse {
  success: true;
  data: DepartmentDemand[];
}
