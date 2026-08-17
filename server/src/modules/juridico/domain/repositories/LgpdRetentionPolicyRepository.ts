class LgpdRetentionPolicyRepository {
  public async create(_data: Record<string, unknown>): Promise<any> {
    throw new Error('LgpdRetentionPolicyRepository.create nao implementado.');
  }

  public async findActiveById(_id: number | string): Promise<any | null> {
    throw new Error('LgpdRetentionPolicyRepository.findActiveById nao implementado.');
  }
}

export = LgpdRetentionPolicyRepository;
