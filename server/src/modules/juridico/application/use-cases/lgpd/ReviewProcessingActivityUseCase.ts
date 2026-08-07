/**
 * `POST /api/jur/lgpd/processing-activities/:id/review` — registra revisão
 * anual (RF-JUR-036). Atualiza `last_reviewed_at` e reagenda
 * `next_review_due_at` para +1 ano.
 *
 * @module modules/juridico/application/use-cases/lgpd/ReviewProcessingActivityUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdActivityRepository from '../../../domain/repositories/LgpdActivityRepository';
import { NotFoundError } from '../../../../../errors';
import type { ReviewProcessingActivityInput } from '../../../domain/entities/LgpdTypes';

class ReviewProcessingActivityUseCase extends UseCase<ReviewProcessingActivityInput, any> {
  private readonly repository: LgpdActivityRepository;

  public constructor(repository: LgpdActivityRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Atividade não encontrada (404). */
  public async execute(input: ReviewProcessingActivityInput): Promise<any> {
    const current = await this.repository.findById(input.id);
    if (!current) throw new NotFoundError(`Atividade de tratamento ${input.id} não encontrada.`);

    const reviewedAt = input.reviewedAt ? new Date(input.reviewedAt) : new Date();
    const nextReview = new Date(reviewedAt);
    nextReview.setFullYear(nextReview.getFullYear() + 1);

    return this.repository.update(input.id, {
      last_reviewed_at: reviewedAt.toISOString().slice(0, 10),
      next_review_due_at: nextReview.toISOString().slice(0, 10),
    });
  }
}

export = ReviewProcessingActivityUseCase;
