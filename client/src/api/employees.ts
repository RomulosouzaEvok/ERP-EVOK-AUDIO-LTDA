import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';
import type { Department } from './departments';

/**
 * API de Funcionários (RH). Endpoints hospedados sob `/api/employees`
 * (`server/src/modules/employees/presentation/routes/employees.ts`).
 * Leitura exige apenas sessão autenticada; escrita (`POST`/`PUT`/`DELETE`)
 * exige role `admin` (dados de RH — salário, admissão etc.).
 *
 * Também consumido por `client/src/pages/production/ShopFloorPage.tsx`
 * (`listEmployees({ limit: 200 })`, para o seletor de operador do
 * apontamento) — manter a assinatura de `listEmployees` retrocompatível.
 */

export type EmployeeStatus = 'active' | 'inactive' | 'fired' | 'vacation' | 'license';
export type EmployeeSalaryType = 'mensal' | 'horista' | 'comissionado';
export type EmployeeShift = 'morning' | 'afternoon' | 'night' | 'commercial' | 'rotating';
export type EmployeeWorkRegime = 'clt' | 'pj' | 'estagiario' | 'aprendiz';
export type EmployeeBankAccountType = 'corrente' | 'poupanca';

export interface Employee {
  id: number;
  user_id: number | null;
  department_id: number;
  name: string;
  cpf: string;
  rg: string | null;
  pis_pasep: string | null;
  ctps: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  position: string | null;
  salary: string | number;
  salary_type: EmployeeSalaryType;
  hire_date: string;
  dismissal_date: string | null;
  status: EmployeeStatus;
  shift: EmployeeShift;
  work_regime: EmployeeWorkRegime;
  work_hours_weekly: number;
  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  bank_account_type: EmployeeBankAccountType;
  pix_key: string | null;
  notes: string | null;
  department?: Pick<Department, 'id' | 'name'> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListEmployeesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: EmployeeStatus;
  department_id?: number;
  /**
   * Filtro por usuário vinculado (Bloco E,
   * `docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md`) — usado para
   * resolver o `department_id` do Employee do usuário logado nas telas de
   * requisição por departamento (`useMyDepartment`).
   */
  user_id?: number;
}

/** `GET /api/employees?page=&limit=&search=&status=&department_id=&user_id=` — lista paginada de funcionários. */
export async function listEmployees(params: ListEmployeesParams = {}) {
  const { data } = await httpClient.get<ListResponse<Employee>>('/api/employees', { params });
  return data;
}

/** `GET /api/employees/:id` — busca um funcionário pelo id (inclui `department`). */
export async function getEmployee(id: number) {
  const { data } = await httpClient.get<ItemResponse<Employee>>(`/api/employees/${id}`);
  return data.data;
}

export interface CreateEmployeeInput {
  name: string;
  cpf: string;
  rg?: string;
  pis_pasep?: string;
  ctps?: string;
  phone?: string;
  email?: string;
  position?: string;
  salary?: number;
  salary_type?: EmployeeSalaryType;
  department_id: number;
  hire_date?: string;
  shift?: EmployeeShift;
  work_regime?: EmployeeWorkRegime;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  pix_key?: string;
  notes?: string;
}

/**
 * `POST /api/employees` — cria um novo funcionário (exige role `admin`).
 *
 * @throws {AxiosError} 400 `ValidationError` (nome/CPF ausentes ou CPF inválido); 409 `ConflictError` (CPF já cadastrado).
 */
export async function createEmployee(input: CreateEmployeeInput) {
  const { data } = await httpClient.post<ItemResponse<Employee>>('/api/employees', input);
  return data.data;
}

export interface UpdateEmployeeInput {
  name?: string;
  cpf?: string;
  rg?: string;
  pis_pasep?: string;
  ctps?: string;
  phone?: string;
  email?: string;
  position?: string;
  salary?: number;
  salary_type?: EmployeeSalaryType;
  department_id?: number;
  shift?: EmployeeShift;
  work_regime?: EmployeeWorkRegime;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  pix_key?: string;
  notes?: string;
  status?: EmployeeStatus;
}

/**
 * `PUT /api/employees/:id` — atualiza um funcionário (exige role `admin`).
 * `hire_date`/`dismissal_date` não estão na lista de campos permitidos pelo
 * backend (`UpdateEmployeeUseCase.ALLOWED_FIELDS`) e são ignorados se enviados.
 *
 * @throws {AxiosError} 400 `ValidationError` (CPF inválido); 404 `NotFoundError`; 409 `ConflictError` (CPF já cadastrado).
 */
export async function updateEmployee(id: number, input: UpdateEmployeeInput) {
  const { data } = await httpClient.put<ItemResponse<Employee>>(`/api/employees/${id}`, input);
  return data.data;
}

/**
 * `DELETE /api/employees/:id` — desliga (soft delete: `status = 'inactive'`,
 * `dismissal_date = hoje`) um funcionário (exige role `admin`).
 *
 * @throws {AxiosError} 404 `NotFoundError`.
 */
export async function deactivateEmployee(id: number) {
  const { data } = await httpClient.delete<ItemResponse<{ message: string }>>(`/api/employees/${id}`);
  return data.data;
}
