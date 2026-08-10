/**
 * Entidade de dominio de Ordem de Producao.
 *
 * @module modules/production/domain/entities/ProductionOrderEntity
 */

import Entity from '../../../../shared/domain/Entity';
import { ValidationError, BusinessRuleError } from '../../../../errors';

type ProductionStatus = 'planned' | 'released' | 'in_progress' | 'paused' | 'completed' | 'canceled';
type ProductionPriority = 'low' | 'normal' | 'high' | 'urgent';

interface ProductionOrderProps {
  id?: number;
  order_number?: string;
  product_id: number;
  quantity: number;
  quantity_produced?: number;
  priority?: ProductionPriority;
  status?: ProductionStatus;
  due_date: string | Date;
  start_date?: string | Date | null;
  completion_date?: string | Date | null;
  sales_order_id?: number | null;
  responsible_id?: number | null;
  department_id?: number | null;
  notes?: string | null;
  created_by?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProductionProductSnapshot {
  id?: number;
  name?: string;
  status: string;
  product_type: string;
}

interface ProductionTransitionOptions {
  allowOverproduction?: boolean;
  quantityScrapped?: number;
  scrapReason?: string | null;
}

interface ProductionTransitionChanges {
  status: ProductionStatus;
  start_date?: Date;
  /** G6: preenchido na partida quando a OP ainda nao tem responsavel. FK -> `employees.id`. */
  responsible_id?: number;
  quantity_produced?: number;
  quantity_scrapped?: number;
  scrap_reason?: string | null;
  completion_date?: Date;
}

const PRODUCTION_STATUSES: ProductionStatus[] = ['planned', 'released', 'in_progress', 'paused', 'completed', 'canceled'];
const PRODUCTION_PRIORITIES: ProductionPriority[] = ['low', 'normal', 'high', 'urgent'];

const STATUS_TRANSITIONS: Record<ProductionStatus, ProductionStatus[]> = {
  planned: ['released', 'canceled'],
  released: ['in_progress', 'canceled'],
  in_progress: ['completed', 'paused', 'canceled'],
  paused: ['in_progress', 'canceled'],
  completed: [],
  canceled: []
};

class ProductionOrderEntity extends Entity {
  public static PRODUCTION_STATUSES = PRODUCTION_STATUSES;
  public static PRODUCTION_PRIORITIES = PRODUCTION_PRIORITIES;
  public static STATUS_TRANSITIONS = STATUS_TRANSITIONS;

  public order_number?: string;
  public product_id: number;
  public quantity: number;
  public quantity_produced: number;
  public priority: ProductionPriority;
  public status: ProductionStatus;
  public due_date: string | Date;
  public start_date: string | Date | null;
  public completion_date: string | Date | null;
  public sales_order_id: number | null;
  public responsible_id: number | null;
  /** FK -> departments.id (opcional). Departamento dono da OP, usado pelo painel de TV de demandas por departamento. */
  public department_id: number | null;
  public notes: string | null;
  public created_by: number | null;

  /**
   * Cria a entidade de OP e valida invariantes basicas.
   *
   * @param props - Propriedades da OP.
   * @throws {ValidationError} Se algum campo obrigatorio/regra basica falhar.
   */
  public constructor(props: ProductionOrderProps) {
    super({ id: props.id, createdAt: props.createdAt, updatedAt: props.updatedAt });

    this.order_number = props.order_number;
    this.product_id = props.product_id;
    this.quantity = Number(props.quantity);
    this.quantity_produced = props.quantity_produced !== undefined ? Number(props.quantity_produced) : 0;
    this.priority = props.priority || 'normal';
    this.status = props.status || 'planned';
    this.due_date = props.due_date;
    this.start_date = props.start_date ?? null;
    this.completion_date = props.completion_date ?? null;
    this.sales_order_id = props.sales_order_id ?? null;
    this.responsible_id = props.responsible_id ?? null;
    this.department_id = props.department_id ?? null;
    this.notes = props.notes ?? null;
    this.created_by = props.created_by ?? null;

    this.validate();
  }

  /**
   * Valida invariantes internas da OP.
   *
   * @returns void
   * @throws {ValidationError} Se a OP estiver invalida.
   */
  public validate(): void {
    if (!this.product_id) throw new ValidationError('Produto da ordem de producao e obrigatorio');
    if (!Number.isFinite(this.quantity) || this.quantity <= 0) throw new ValidationError('Quantidade planejada deve ser maior que zero');
    if (!Number.isFinite(this.quantity_produced) || this.quantity_produced < 0) throw new ValidationError('Quantidade produzida nao pode ser negativa');
    if (!this.due_date) throw new ValidationError('Data de vencimento e obrigatoria');
    if (!PRODUCTION_PRIORITIES.includes(this.priority)) throw new ValidationError(`Prioridade invalida. Valores aceitos: ${PRODUCTION_PRIORITIES.join(', ')}`);
    if (!PRODUCTION_STATUSES.includes(this.status)) throw new ValidationError(`Status invalido. Valores aceitos: ${PRODUCTION_STATUSES.join(', ')}`);
  }

  /**
   * Valida se a OP pode ser criada para o produto informado.
   *
   * @param product - Snapshot do produto.
   * @returns void
   * @throws {BusinessRuleError} Se o produto nao puder gerar OP.
   */
  public assertCanBeCreatedFor(product: ProductionProductSnapshot | null): void {
    if (!product) throw new BusinessRuleError('Produto nao encontrado');
    if (product.status !== 'active') throw new BusinessRuleError('Produto inativo nao pode ser produzido');
    if (product.product_type !== 'finished') {
      throw new BusinessRuleError(`Apenas produtos acabados tem OP. '${product.name}' e '${product.product_type}'`);
    }
  }

  /**
   * Aplica a maquina de estados da OP e retorna os campos a persistir.
   *
   * @param nextStatus - Status alvo.
   * @param quantityProduced - Quantidade produzida quando a transicao for `completed`.
   * @param options - Opcoes da transicao.
   * @returns Campos a persistir.
   * @throws {BusinessRuleError} Se a transicao nao for permitida.
   * @throws {ValidationError} Se a quantidade produzida for invalida.
   */
  public transitionTo(
    nextStatus: ProductionStatus,
    quantityProduced?: number,
    options: ProductionTransitionOptions = {}
  ): ProductionTransitionChanges {
    const { allowOverproduction = false, quantityScrapped, scrapReason } = options;
    const allowed = STATUS_TRANSITIONS[this.status] || [];
    if (this.status === nextStatus) throw new BusinessRuleError(`OP ja esta com status ${nextStatus}`);
    if (!allowed.includes(nextStatus)) throw new BusinessRuleError(`Transicao invalida: ${this.status} -> ${nextStatus}`);

    const changes: ProductionTransitionChanges = { status: nextStatus };

    // Gap G6 — FECHADO em 2026-08-10, com aprovacao do dono.
    //
    // A analise de 2026-08-09 (que manteve o gap aberto por tres rodadas)
    // continua correta no que dizia: `production_orders` nao tem coluna de
    // centro de trabalho, `responsible_id` e opcional por desenho, e exigir
    // apontamento iniciado dependia da decisao do G4. O que mudou foi o
    // contexto — G5 deu API de roteiro e G4 tornou o apontamento obrigatorio
    // na conclusao —, e a pre-condicao real da partida passou a existir sem
    // precisar de coluna nova: **a OP so entra em producao se houver algo
    // contra o que apontar, e nenhum centro de trabalho inativo**.
    //
    // A regra pura vive em `productionTrackingRules.assertOrderCanStart`
    // (codigos `G6-START-NO-ROUTE` / `G6-START-WC-INACTIVE`) e e aplicada por
    // `ChangeProductionOrderStatusUseCase.assertOrderIsReadyToStart`, que
    // precisa do banco (etapas + centro de trabalho). A entidade continua
    // cuidando so da maquina de estados: aqui a partida grava a data, e o
    // `responsible_id` e preenchido pelo caso de uso quando resolvivel.
    if (nextStatus === 'in_progress') changes.start_date = new Date();
    if (nextStatus === 'completed') {
      const produced = quantityProduced !== undefined ? Number(quantityProduced) : this.quantity;
      if (!Number.isFinite(produced) || produced < 0) throw new ValidationError('Quantidade produzida nao pode ser negativa');
      if (produced > this.quantity && !allowOverproduction) {
        throw new ValidationError(
          `Quantidade produzida (${produced}) excede a quantidade planejada (${this.quantity}). ` +
          'Envie "allow_overproduction: true" na requisicao para confirmar producao acima do planejado.'
        );
      }

      const scrapped = quantityScrapped !== undefined ? Number(quantityScrapped) : 0;
      if (!Number.isFinite(scrapped) || scrapped < 0) throw new ValidationError('Quantidade refugada nao pode ser negativa');
      if (produced + scrapped > this.quantity && !allowOverproduction) {
        throw new ValidationError(
          `Producao boa + refugo (${produced + scrapped}) excede a quantidade planejada (${this.quantity}). ` +
          'Envie "allow_overproduction: true" na requisicao para confirmar producao acima do planejado.'
        );
      }

      changes.quantity_produced = produced;
      changes.quantity_scrapped = scrapped;
      changes.scrap_reason = scrapped > 0 ? (scrapReason ?? null) : null;
      changes.completion_date = new Date();
    }

    return changes;
  }

  /**
   * Serializa a OP para persistencia na criacao.
   *
   * @param input - Numero gerado e usuario criador.
   * @returns Objeto persistivel.
   */
  public toCreatePersistence(input: { order_number: string; created_by: number | null }): Record<string, unknown> {
    return {
      order_number: input.order_number,
      product_id: this.product_id,
      quantity: this.quantity,
      priority: this.priority,
      status: 'planned',
      due_date: this.due_date,
      sales_order_id: this.sales_order_id,
      responsible_id: this.responsible_id,
      department_id: this.department_id,
      notes: this.notes,
      created_by: input.created_by
    };
  }
}

export = ProductionOrderEntity;

