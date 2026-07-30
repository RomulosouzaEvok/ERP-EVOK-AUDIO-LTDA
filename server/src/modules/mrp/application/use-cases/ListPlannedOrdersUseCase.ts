import UseCase from '../../../../shared/application/UseCase';
import MrpRepository from '../../domain/repositories/MrpRepository';

/**
 * Lista ordens planejadas persistidas.
 */
class ListPlannedOrdersUseCase extends UseCase<void, any[]> {
  private readonly mrpRepository: MrpRepository;

  public constructor(mrpRepository: MrpRepository) {
    super();
    this.mrpRepository = mrpRepository;
  }

  public async execute(): Promise<any[]> {
    return this.mrpRepository.listPlannedOrders();
  }
}

export = ListPlannedOrdersUseCase;
