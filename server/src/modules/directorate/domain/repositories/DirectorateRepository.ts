/**
 * Contrato de repositório do módulo Diretoria: organograma executivo,
 * Planejamento Estratégico (`strategic_plannings`), Atas de Reunião
 * (`meeting_minutes`) e Riscos Corporativos (`business_risks`).
 *
 * A camada de aplicação (use cases) depende apenas desta interface, nunca de
 * uma implementação concreta (Sequelize) — mantém a regra de negócio
 * independente do ORM/banco.
 *
 * @module modules/directorate/domain/repositories/DirectorateRepository
 */
class DirectorateRepository {
  // ---- Organograma / Diretorias ----

  /** Lista as diretorias ativas com `manager` (Employee) e `departments` aninhados, ordenadas por `code`. */
  async listDirectoratesWithDepartments(): Promise<any[]> {
    throw new Error('DirectorateRepository.listDirectoratesWithDepartments não implementado.');
  }

  /** Busca uma diretoria pelo id. */
  async findDirectorateById(_id: number): Promise<any | null> {
    throw new Error('DirectorateRepository.findDirectorateById não implementado.');
  }

  /** Atualiza `manager_id` de uma diretoria (`null` = vaga o cargo). */
  async updateDirectorateManager(_id: number, _managerId: number | null): Promise<any | null> {
    throw new Error('DirectorateRepository.updateDirectorateManager não implementado.');
  }

  /** Busca um funcionário pelo id, para validar existência/status antes de provê-lo num cargo. */
  async findEmployeeById(_id: number): Promise<any | null> {
    throw new Error('DirectorateRepository.findEmployeeById não implementado.');
  }

  // ---- Planejamento Estratégico ----

  /** Lista objetivos estratégicos paginados, com filtros opcionais de `year`/`directorate_id`/`department_id`/`status`. */
  async listStrategicPlannings(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('DirectorateRepository.listStrategicPlannings não implementado.');
  }

  /** Busca um objetivo estratégico pelo id. */
  async findStrategicPlanningById(_id: number): Promise<any | null> {
    throw new Error('DirectorateRepository.findStrategicPlanningById não implementado.');
  }

  /** Cria um objetivo estratégico. */
  async createStrategicPlanning(_data: Record<string, unknown>): Promise<any> {
    throw new Error('DirectorateRepository.createStrategicPlanning não implementado.');
  }

  /** Atualiza campos de um objetivo estratégico existente. */
  async updateStrategicPlanning(_id: number, _data: Record<string, unknown>): Promise<any | null> {
    throw new Error('DirectorateRepository.updateStrategicPlanning não implementado.');
  }

  // ---- Atas de Reunião ----

  /** Cria uma ata de reunião (imutável após criação — sem update/delete no contrato). */
  async createMeetingMinute(_data: Record<string, unknown>): Promise<any> {
    throw new Error('DirectorateRepository.createMeetingMinute não implementado.');
  }

  /** Lista atas paginadas, com filtros opcionais de `meeting_type`/data (`from`/`to`). */
  async listMeetingMinutes(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('DirectorateRepository.listMeetingMinutes não implementado.');
  }

  /** Busca uma ata pelo id. */
  async findMeetingMinuteById(_id: number): Promise<any | null> {
    throw new Error('DirectorateRepository.findMeetingMinuteById não implementado.');
  }

  // ---- Riscos Corporativos ----

  /** Cria um risco corporativo. */
  async createBusinessRisk(_data: Record<string, unknown>): Promise<any> {
    throw new Error('DirectorateRepository.createBusinessRisk não implementado.');
  }

  /** Atualiza campos de um risco corporativo existente. */
  async updateBusinessRisk(_id: number, _data: Record<string, unknown>): Promise<any | null> {
    throw new Error('DirectorateRepository.updateBusinessRisk não implementado.');
  }

  /** Lista riscos paginados, com filtros opcionais de `status`/`risk_category`. */
  async listBusinessRisks(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('DirectorateRepository.listBusinessRisks não implementado.');
  }

  /** Busca um risco pelo id. */
  async findBusinessRiskById(_id: number): Promise<any | null> {
    throw new Error('DirectorateRepository.findBusinessRiskById não implementado.');
  }
}

export = DirectorateRepository;
