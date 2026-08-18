/**
 * Preview estruturado do Bloco K com base nos dados que o ERP ja registra.
 *
 * @module modules/fiscal/application/use-cases/GetBlocoKPreviewUseCase
 */

import UseCase from '../../../../shared/application/UseCase';

interface GetBlocoKPreviewInput {
  start_date: string;
  end_date: string;
}

class GetBlocoKPreviewUseCase extends UseCase<GetBlocoKPreviewInput, Promise<any>> {
  private readonly fiscalRepository: any;

  public constructor(fiscalRepository: any) {
    super();
    this.fiscalRepository = fiscalRepository;
  }

  /**
   * Consolida K200/K230/K235 a partir do dado que ja existe no banco.
   *
   * @param input - Periodo fiscal.
   * @returns Preview estruturado.
   */
  public async execute(input: GetBlocoKPreviewInput): Promise<any> {
    return this.fiscalRepository.findBlocoKPreview(input.start_date, input.end_date);
  }
}

export = GetBlocoKPreviewUseCase;
