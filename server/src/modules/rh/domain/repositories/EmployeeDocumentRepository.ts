/**
 * Interface de repositório de `HrEmployeeDocument` (RF-RH-027 a 030).
 * @module modules/rh/domain/repositories/EmployeeDocumentRepository
 */
abstract class EmployeeDocumentRepository {
  abstract findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }>;
  abstract findById(id: number | string): Promise<any | null>;
  abstract create(data: Record<string, unknown>): Promise<any>;
  abstract update(id: number | string, data: Record<string, unknown>): Promise<any | null>;
  /** Documento `aso_*` mais recente do tipo informado, dentro da validade e com aptidão apto/apto_com_restricao (RF-RH-030). */
  abstract findValidAso(employeeId: number | string, docType: string, today: string): Promise<any | null>;
}

export = EmployeeDocumentRepository;
