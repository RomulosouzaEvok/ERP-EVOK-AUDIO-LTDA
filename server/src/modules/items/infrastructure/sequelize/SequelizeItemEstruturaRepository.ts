import ItemEstruturaRepository from '../../domain/repositories/ItemEstruturaRepository';
// G1 (2026-08-10): a estrutura de produto passou a ter fonte unica — a BOM
// ativa (`bill_of_materials`), projetada em UUID de item. Este repositorio
// deixou de ler a tabela `item_estruturas`, que virou legado congelado.
// Racional completo em `services/bomStructureProjection`.
const BomStructureProjection = require('../../../../services/bomStructureProjection');

/**
 * Implementacao Sequelize do repositorio de estruturas de produto.
 *
 * **Depois do G1 este repositorio nao le mais `item_estruturas`.** Ele le a
 * mesma estrutura que a producao consome e custeia, projetada para o
 * formato de aresta em UUID que os casos de uso ja esperavam. O contrato
 * publico (nomes de metodo, formato de retorno) nao mudou — mudou de onde
 * vem o dado, que era o gap G1: planejamento e consumo liam arvores
 * diferentes.
 */
class SequelizeItemEstruturaRepository extends ItemEstruturaRepository {
  /**
   * @inheritdoc
   *
   * Escrita direta em `item_estruturas` esta encerrada (G1). A criacao de
   * estrutura passa a ser exclusividade do modulo de BOM, que e onde o
   * controle de alteracao de engenharia (revisao/`superseded`) existe. O
   * bloqueio de negocio, com mensagem e `details.rule`, mora em
   * `CreateItemStructureUseCase` — este metodo e a ultima barreira, para o
   * caso de alguem instanciar o repositorio direto.
   */
  public async create(_data: Record<string, unknown>, _transaction?: any): Promise<any> {
    throw Object.assign(
      new Error(
        'Estrutura de produto nao e mais gravada em `item_estruturas` (gap G1). '
        + 'Cadastre a estrutura pelo modulo de BOM (`POST /api/engineering/bom`), '
        + 'que e a fonte unica lida pelo MRP e pela producao.',
      ),
      { statusCode: 422, rule: 'G1-ESTRUTURA-DUPLA' },
    );
  }

  /** @inheritdoc */
  public async findActiveByParentId(itemPaiId: string): Promise<any[]> {
    return BomStructureProjection.listActiveEdgesByParent(String(itemPaiId));
  }

  /** @inheritdoc */
  public async listActiveEdges(): Promise<any[]> {
    return BomStructureProjection.listActiveEdges();
  }

  /** @inheritdoc */
  public async hasPathBetween(fromItemId: string, toItemId: string): Promise<boolean> {
    return BomStructureProjection.hasPathBetween(String(fromItemId), String(toItemId));
  }

  /** @inheritdoc */
  public async hasActiveParentOrComponent(itemId: string): Promise<boolean> {
    return BomStructureProjection.hasActiveParentOrComponent(String(itemId));
  }
}

export = SequelizeItemEstruturaRepository;
