/**
 * Entidade de dominio de Fornecedor.
 *
 * @module modules/suppliers/domain/entities/SupplierEntity
 */

import Entity from '../../../../shared/domain/Entity';
import { ValidationError } from '../../../../errors';

interface SupplierProps {
  id?: number;
  company_name: string;
  cnpj: string;
  trade_name?: string | null;
  ie?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  payment_terms?: string | null;
  delivery_time?: number | null;
  notes?: string | null;
  /** G11 — fornecedor estrangeiro (importação). Ausente = `false`. */
  is_foreign?: boolean | null;
}

class SupplierEntity extends Entity {
  public company_name: string;
  public cnpj: string;
  /**
   * Nome fantasia. `undefined` (e **nunca** `null`) quando ausente:
   * `suppliers.trade_name` é `NOT NULL DEFAULT ''` no banco, e gravar `null`
   * explícito anula o DEFAULT do Postgres — era exatamente o que fazia
   * `POST /api/suppliers` responder **500** ("null value in column
   * trade_name ... violates not-null constraint") para qualquer payload que
   * omitisse o nome fantasia, que é opcional no validador. Mesma armadilha
   * de {@link is_foreign} logo abaixo.
   */
  public trade_name: string | undefined;
  public ie: string | null;
  public phone: string | null;
  public email: string | null;
  public address: string | null;
  public contact_name: string | null;
  public contact_phone: string | null;
  public payment_terms: string | null;
  public delivery_time: number;
  public notes: string | null;
  /**
   * G11 — fornecedor estrangeiro. Normalizado para `false` quando ausente:
   * `suppliers.is_foreign` é `NOT NULL DEFAULT false` e gravar `null`
   * explícito anularia o DEFAULT do Postgres. Marcar `true` faz TODO pedido
   * de compra deste fornecedor exigir aprovação da diretoria, em qualquer
   * valor (`modules/purchases/domain/constants.ts`).
   */
  public is_foreign: boolean;

  /**
   * @param props - Propriedades do fornecedor.
   * @throws {ValidationError} Se `company_name` ou `cnpj` estiverem ausentes.
   */
  public constructor(props: SupplierProps) {
    super({ id: props.id });
    this.company_name = props.company_name;
    this.cnpj = props.cnpj;
    this.trade_name = props.trade_name ?? undefined;
    this.ie = props.ie ?? null;
    this.phone = props.phone ?? null;
    this.email = props.email ?? null;
    this.address = props.address ?? null;
    this.contact_name = props.contact_name ?? null;
    this.contact_phone = props.contact_phone ?? null;
    this.payment_terms = props.payment_terms ?? null;
    this.delivery_time = props.delivery_time ?? 15;
    this.notes = props.notes ?? null;
    this.is_foreign = props.is_foreign === true;

    this.validate();
  }

  /**
   * Executa todas as validacoes de forma da entidade.
   *
   * @returns void
   * @throws {ValidationError} Se `company_name` ou `cnpj` estiverem ausentes.
   */
  public validate(): void {
    if (!this.company_name || !this.cnpj) {
      throw new ValidationError('Razão social e CNPJ são obrigatórios');
    }
  }
}

export = SupplierEntity;
