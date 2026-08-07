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
}

export = LegalAlertRepository;
