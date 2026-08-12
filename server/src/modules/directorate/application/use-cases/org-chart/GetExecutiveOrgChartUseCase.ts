/**
 * Caso de uso: monta a árvore do organograma executivo
 * (CEO → diretorias → departamentos), cobrindo
 * `GET /api/directorate/org-chart`.
 *
 * Leitura pura, sem efeito colateral. Não é segredo interno — qualquer
 * usuário autenticado pode consultar (ver RBAC em
 * `presentation/routes/directorate.ts`).
 *
 * @module modules/directorate/application/use-cases/org-chart/GetExecutiveOrgChartUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import DirectorateRepository from '../../../domain/repositories/DirectorateRepository';

interface DirectorateNode {
  id: number;
  code: string;
  name: string;
  position_title: string;
  manager: { id: number; name: string; position: string | null } | null;
  vacant: boolean;
  departments: Array<{ id: number; code: string; name: string; sigla: string }>;
}

class GetExecutiveOrgChartUseCase extends UseCase<void, { directorates: DirectorateNode[] }> {
  private readonly directorateRepository: DirectorateRepository;

  constructor(directorateRepository: DirectorateRepository) {
    super();
    this.directorateRepository = directorateRepository;
  }

  async execute(): Promise<{ directorates: DirectorateNode[] }> {
    const directorates = await this.directorateRepository.listDirectoratesWithDepartments();

    const nodes: DirectorateNode[] = directorates.map((d: any) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      position_title: d.position_title,
      manager: d.manager ? { id: d.manager.id, name: d.manager.name, position: d.manager.position } : null,
      vacant: d.manager_id === null,
      departments: (d.departments ?? []).map((dep: any) => ({
        id: dep.id, code: dep.code, name: dep.name, sigla: dep.sigla,
      })),
    }));

    return { directorates: nodes };
  }
}

export = GetExecutiveOrgChartUseCase;
