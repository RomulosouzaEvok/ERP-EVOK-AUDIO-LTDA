/**
 * Casos de uso de Visitante (RF-FAC-044/047), cobrindo
 * `/api/facilities/visitors`. Dados pessoais mascarados em listagem —
 * LGPD (RNF-FAC-04, §8.2 do contrato de API).
 *
 * @module modules/facilities/application/use-cases/visitor/VisitorUseCases
 */

import UseCase from '../../../../../shared/application/UseCase';
import VisitorRepository from '../../../domain/repositories/VisitorRepository';

/** Mascara documento em listagem (`"123.456.789-00"` → `"***.***.789-00"`). */
function maskDocument(document: string): string {
  if (!document || document.length < 4) return '***';
  return `***${document.slice(-7)}`;
}

/** `GET /api/facilities/visitors` — busca por nome/documento, dados mascarados. */
export class ListVisitorsUseCase extends UseCase<Record<string, any>, any> {
  constructor(private readonly visitorRepository: VisitorRepository) {
    super();
  }

  async execute({ search, page = 1, limit = 20, offset = 0 }: Record<string, any> = {}) {
    const { rows, count } = await this.visitorRepository.list({ search }, { limit, offset });
    const masked = rows.map((v: any) => {
      const json = v.toJSON ? v.toJSON() : v;
      return { ...json, document: maskDocument(json.document), phone: json.phone ? `***${String(json.phone).slice(-4)}` : null };
    });
    return { rows: masked, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

/** `POST /api/facilities/visitors` — cadastra ou reaproveita se `document` já existe. */
export class CreateVisitorUseCase extends UseCase<Record<string, any>, any> {
  constructor(private readonly visitorRepository: VisitorRepository) {
    super();
  }

  async execute(input: Record<string, any>) {
    if (input.document) {
      const existing = await this.visitorRepository.findByDocument(input.document);
      if (existing) return existing;
    }

    return this.visitorRepository.create({
      name: input.name,
      document: input.document,
      company: input.company ?? null,
      phone: input.phone ?? null,
      photo_path: input.photo_path ?? null,
    });
  }
}
