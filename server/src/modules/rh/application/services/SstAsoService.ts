/**
 * Interface de serviço para consultar o status de ASO de um funcionário
 * junto ao módulo SST (RF-RH-008/020, §2 do contrato de API — CORRIGIDO
 * pelo `AuditorIntegrador`: usado **apenas** por `RequestAsoUseCase`
 * (admissão/demissão), nunca pelos use cases de conclusão/retorno, que
 * dependem exclusivamente do snapshot em `HrEmployeeDocument`/campos
 * `aso_*` das próprias tabelas de processo).
 *
 * @module modules/rh/application/services/SstAsoService
 */
abstract class SstAsoService {
  abstract getStatus(employeeId: number): Promise<{ status: string; tipo_ultimo_aso: string | null; vencimento: string | null } | null>;
}

export = SstAsoService;
