/**
 * 🗄️ TypeScript model type definitions for Sequelize.
 *
 * @module types/models
 */

import { Model } from 'sequelize';

export interface BaseAttributes {
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserAttributes extends BaseAttributes {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'operator' | 'financial';
  department?: string;
  active: boolean;
}

export interface UserInstance extends Model<UserAttributes>, UserAttributes {
  comparePassword(candidate: string): Promise<boolean>;
}

export interface ClientAttributes extends BaseAttributes {
  name: string;
  cpf_cnpj?: string;
  phone?: string;
  email?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  status: 'active' | 'inactive';
  notes?: string;
  tax_regime?: string;
  ie?: string;
  im?: string;
  ind_final?: string;
  ind_ie?: string;
  cnae?: string;
}

export interface CategoryAttributes extends BaseAttributes {
  name: string;
  description?: string;
  active: boolean;
}

export interface ProductAttributes extends BaseAttributes {
  name: string;
  code: string;
  description?: string;
  category_id?: number;
  price: number;
  cost_price?: number;
  quantity: number;
  min_quantity?: number;
  status: 'active' | 'inactive';
  location?: string;
  product_type: 'finished' | 'semi_finished' | 'component' | 'raw_material';
  ncm?: string;
  cest?: string;
  weight?: number;
  unit?: string;
  lead_time?: number;
  drawing_number?: string;
  revision?: string;
  ts_params_fs?: number;
  ts_params_qms?: number;
  ts_params_qes?: number;
  ts_params_qts?: number;
  ts_params_vas?: number;
  ts_params_sd?: number;
  ts_params_xmax?: number;
  ts_params_re?: number;
  ts_params_le?: number;
  ts_params_bl?: number;
  ts_params_mms?: number;
  ts_params_cms?: number;
  ts_params_spl?: number;
}

export interface ProductInstance extends Model<ProductAttributes>, ProductAttributes {}

export interface SupplierAttributes extends BaseAttributes {
  company_name: string;
  trade_name?: string;
  cnpj: string;
  ie?: string;
  phone?: string;
  email?: string;
  contact_name?: string;
  contact_phone?: string;
  payment_terms?: string;
  delivery_time?: number;
  rating: number;
  status: 'active' | 'inactive';
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  notes?: string;
}

export interface SaleAttributes extends BaseAttributes {
  customer_id: number;
  user_id: number;
  total_amount: number;
  discount?: number;
  status: 'quote' | 'confirmed' | 'invoiced' | 'canceled';
  payment_method?: string;
  installments?: number;
  notes?: string;
  nfe_number?: string;
  nfe_status?: string;
  nfe_key?: string;
}

export interface SaleItemAttributes extends BaseAttributes {
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface PurchaseAttributes extends BaseAttributes {
  order_number: string;
  supplier_id: number;
  requester_id: number;
  status: 'pending' | 'approved' | 'sent' | 'partial' | 'received' | 'canceled';
  total_amount?: number;
  expected_date?: Date;
  delivery_date?: Date;
  freight_type?: string;
  freight_value?: number;
  invoice_number?: string;
  invoice_date?: Date;
  notes?: string;
}

export interface PurchaseItemAttributes extends BaseAttributes {
  purchase_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  received_quantity?: number;
  status: 'pending' | 'partial' | 'received' | 'canceled';
}

export interface AccountReceivableAttributes extends BaseAttributes {
  sale_id: number;
  customer_id: number;
  installment?: number;
  amount: number;
  due_date: Date;
  payment_date?: Date;
  status: 'pending' | 'paid' | 'overdue' | 'canceled';
  payment_method?: string;
  interest?: number;
  fine?: number;
  discount?: number;
  collection_status?: string;
  notes?: string;
}

export interface AccountPayableAttributes extends BaseAttributes {
  description: string;
  amount: number;
  due_date: Date;
  payment_date?: Date;
  status: 'pending' | 'paid' | 'overdue' | 'canceled';
  category?: string;
  supplier_id?: number;
  purchase_id?: number;
  payment_type?: string;
  cost_center?: string;
  notes?: string;
  approved_by?: number;
  approval_date?: Date;
}

export interface InventoryMovementAttributes extends BaseAttributes {
  product_id: number;
  user_id: number;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  description?: string;
  reference_id?: number;
  reference_type?: string;
}

export interface ProductionOrderAttributes extends BaseAttributes {
  order_number: string;
  product_id: number;
  quantity: number;
  quantity_produced?: number;
  priority?: string;
  status: 'planned' | 'released' | 'in_progress' | 'paused' | 'completed' | 'canceled';
  start_date?: Date;
  due_date?: Date;
  completion_date?: Date;
  sales_order_id?: number;
  responsible_id?: number;
  notes?: string;
  created_by?: number;
}

export interface BillOfMaterialAttributes extends BaseAttributes {
  product_id: number;
  revision: string;
  revision_date?: Date;
  revision_notes?: string;
  status: 'draft' | 'active' | 'inactive' | 'superseded';
  notes?: string;
  approved_by?: number;
  approved_at?: Date;
}

export interface BillOfMaterialItemAttributes extends BaseAttributes {
  bom_id: number;
  component_product_id: number;
  quantity: number;
  unit?: string;
  scrap_percentage?: number;
  bom_level: number;
  parent_item_id?: number;
  alternative_product_id?: number;
  notes?: string;
}

export interface ServiceOrderAttributes extends BaseAttributes {
  order_number: string;
  client_id: number;
  product_id?: number;
  equipment_desc?: string;
  reported_issue?: string;
  diagnosed_issue?: string;
  service_performed?: string;
  labor_cost?: number;
  total_amount?: number;
  status: 'open' | 'in_progress' | 'completed' | 'canceled';
  priority?: string;
  entry_date?: Date;
  completion_date?: Date;
  delivery_date?: Date;
  technician_id?: number;
  responsible_id?: number;
  warranty_days?: number;
  notes?: string;
}

export interface EmployeeAttributes extends BaseAttributes {
  user_id?: number;
  department_id?: number;
  name: string;
  cpf: string;
  rg?: string;
  pis_pasep?: string;
  ctps?: string;
  phone?: string;
  email?: string;
  address?: string;
  position?: string;
  salary?: number;
  salary_type?: string;
  hire_date?: Date;
  dismissal_date?: Date;
  status: 'active' | 'inactive';
  shift?: string;
  work_regime?: string;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  pix_key?: string;
  notes?: string;
}

export interface DepartmentAttributes extends BaseAttributes {
  code: string;
  name: string;
  sigla?: string;
  description?: string;
  manager_id?: number;
  active: boolean;
}

export interface AssetAttributes extends BaseAttributes {
  tag: string;
  name: string;
  description?: string;
  product_id?: number;
  department_id?: number;
  responsible_id?: number;
  location?: string;
  asset_type?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: Date;
  purchase_value?: number;
  current_value?: number;
  useful_life_months?: number;
  status: 'active' | 'inactive' | 'maintenance' | 'deactivated';
  qr_code?: string;
  notes?: string;
  last_inventory_date?: Date;
}

export interface NonConformityAttributes extends BaseAttributes {
  number: string;
  product_id?: number;
  production_order_id?: number;
  supplier_id?: number;
  reported_by: number;
  responsible_id?: number;
  closed_by?: number;
  type: 'internal' | 'supplier' | 'customer' | 'audit';
  severity: 'critical' | 'major' | 'minor' | 'observation';
  description: string;
  cause?: string;
  action_plan?: string;
  deadline?: Date;
  closure_date?: Date;
  status: 'open' | 'in_progress' | 'closed' | 'canceled';
  notes?: string;
}

export interface MaintenanceOrderAttributes extends BaseAttributes {
  number: string;
  asset_id?: number;
  technician_id?: number;
  reported_by: number;
  diagnosed_by?: number;
  type: 'corrective' | 'preventive' | 'predictive';
  priority: string;
  description: string;
  diagnosed_problem?: string;
  solution?: string;
  parts_used?: string;
  labor_hours?: number;
  cost?: number;
  status: 'open' | 'diagnosed' | 'in_progress' | 'completed' | 'canceled';
  entry_date?: Date;
  start_date?: Date;
  completion_date?: Date;
  notes?: string;
}

export interface AuditLogAttributes extends BaseAttributes {
  user_id?: number;
  action: string;
  entity: string;
  entity_id?: number;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  description?: string;
  ip?: string;
  user_agent?: string;
}
