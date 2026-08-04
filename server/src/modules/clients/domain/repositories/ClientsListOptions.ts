/**
 * @module modules/clients/domain/repositories/ClientsListOptions
 *
 * Tipo isolado em arquivo próprio (sem `export =`) para poder ser
 * importado por nome sem colidir com o `export =` de `ClientsRepository.ts`.
 */

export interface ClientsListOptions {
  limit: number;
  offset: number;
  search?: string;
  status?: string;
}
