/**
 * Contrato do repositório de `JurLegalAlert` — entidade única de alerta do
 * módulo (RF-JUR-005/006/022/027/032/038). `origin_type`+`origin_id` é
 * polimórfico, sem FK real — a integridade é responsabilidade do use case
 * que já tem a origem carregada em memória.
 *
 * @module modules/juridico/domain/repositories/LegalAlertRepository
 */

class LegalAlertRepository {
  public async create(_data: Record<string, unknown>): Promise<any> {
    throw new Error('LegalAlertRepository.create não implementado.');
  }

  /** `GET /api/jur/alerts` — lista consolidada (§8.1). */
  public async findAndCount(_filters: Record<string, unknown>, _pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    throw new Error('LegalAlertRepository.findAndCount não implementado.');
  }

  /** `GET /api/jur/alerts/:id` — detalhe (§8.1). */
  public async findById(_id: number | string): Promise<any | null> {
    throw new Error('LegalAlertRepository.findById não implementado.');
  }

  /**
   * `POST /api/jur/alerts/:id/acknowledge` — marca como lido/tratado.
   * NUNCA aceita desativar (RNF-JUR-04) — a trava de `is_fatal` é
   * responsabilidade do use case (verifica a origem antes de chamar isto),
   * não desta camada de persistência.
   */
  public async update(_id: number | string, _data: Record<string, unknown>): Promise<any | null> {
    throw new Error('LegalAlertRepository.update não implementado.');
  }
}

export = LegalAlertRepository;
