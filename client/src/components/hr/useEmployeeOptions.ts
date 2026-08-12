import { useQuery } from '@tanstack/react-query';

import * as employeesApi from '@/api/employees';

/**
 * Lista os funcionários (até 200, mesmo limite de `ShopFloorPage.tsx`) para
 * popular seletores e resolver `employee_id → nome` nas 4 abas novas de RH
 * (Admissão resolve `employee_id` só depois de concluída; Contratos,
 * Demissão e Férias sempre referenciam um funcionário já existente).
 */
export function useEmployeeOptions() {
  const { data, isLoading } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.listEmployees({ limit: 200 }),
  });

  const employees = data?.data ?? [];
  const employeeName = (id: number | null | undefined): string => {
    if (!id) return '-';
    return employees.find((employee) => employee.id === id)?.name ?? `#${id}`;
  };

  return { employees, employeeName, isLoading };
}
