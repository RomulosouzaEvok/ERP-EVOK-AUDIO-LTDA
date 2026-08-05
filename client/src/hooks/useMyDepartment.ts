import { useQuery } from '@tanstack/react-query';

import * as employeesApi from '@/api/employees';
import { useAuth } from '@/context/AuthContext';

/**
 * Resolve o departamento do usuário logado (Bloco C/E,
 * `docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md`) — usado pelas
 * telas de requisição por departamento (Logística, Produção, Manutenção,
 * Qualidade) para filtrar automaticamente a listagem por `department_id`.
 *
 * Resolve via `GET /api/employees?user_id=<id do usuário logado>`: o
 * backend já preenche `PurchaseRequisition.department_id` a partir do
 * mesmo vínculo `Employee.user_id` na criação (Bloco C), então esta é a
 * mesma fonte de verdade usada no filtro de leitura.
 *
 * Usuários sem `Employee` vinculado (ex.: administradores puros de
 * sistema) recebem `departmentId: null` — a tela deve então listar sem
 * filtro de departamento (nunca travar a tela por falta de vínculo).
 */
export function useMyDepartment() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['my-employee', user?.id],
    queryFn: () => employeesApi.listEmployees({ user_id: user!.id, limit: 1 }),
    enabled: Boolean(user?.id),
  });

  const employee = data?.data[0] ?? null;

  return {
    employee,
    departmentId: employee?.department_id ?? null,
    departmentName: employee?.department?.name ?? null,
    isLoading,
  };
}
