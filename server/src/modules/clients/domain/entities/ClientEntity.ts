/**
 * Entidade de dominio de Cliente.
 *
 * @module modules/clients/domain/entities/ClientEntity
 */

import Entity from '../../../../shared/domain/Entity';
import { ValidationError } from '../../../../errors';

interface ClientProps {
  id?: number;
  name: string;
  cpf_cnpj: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  tax_regime?: string | null;
  ie?: string | null;
  im?: string | null;
  cnae?: string | null;
  cep?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}

class ClientEntity extends Entity {
  public name: string;
  public cpf_cnpj: string;
  public phone: string | null;
  public email: string | null;
  public address: string | null;
  public notes: string | null;
  public tax_regime: string | null;
  public ie: string | null;
  public im: string | null;
  public cnae: string | null;
  public cep: string | null;
  public street: string | null;
  public number: string | null;
  public complement: string | null;
  public neighborhood: string | null;
  public city: string | null;
  public state: string | null;

  /**
   * @param props - Propriedades do cliente.
   * @throws {ValidationError} Se `name` ou `cpf_cnpj` estiverem ausentes.
   */
  public constructor(props: ClientProps) {
    super({ id: props.id });
    this.name = props.name;
    this.cpf_cnpj = props.cpf_cnpj;
    this.phone = props.phone ?? null;
    this.email = props.email ?? null;
    this.address = props.address ?? null;
    this.notes = props.notes ?? null;
    this.tax_regime = props.tax_regime ?? null;
    this.ie = props.ie ?? null;
    this.im = props.im ?? null;
    // CNAE opcional (decisão D-I do dono, 2026-08-10). `null` é o valor
    // CORRETO para ausência aqui — diferente de `phone`/`email`/`notes`, que
    // são `NOT NULL DEFAULT ''` e onde o `null` explícito ANULARIA o DEFAULT do
    // Postgres (BUG-02, ver `CreateClientUseCase`). Conferido em
    // `information_schema.columns`: `clients.cnae` é `varchar(10)`,
    // `is_nullable = YES`, `column_default = NULL`.
    // String vazia vira `null` para não gravar '' num campo que "não se
    // aplica" (pessoa física) — '' e NULL significariam a mesma coisa e
    // sujariam relatório e futura emissão fiscal.
    this.cnae = props.cnae && props.cnae.trim() !== '' ? props.cnae.trim() : null;
    this.cep = props.cep ?? null;
    this.street = props.street ?? null;
    this.number = props.number ?? null;
    this.complement = props.complement ?? null;
    this.neighborhood = props.neighborhood ?? null;
    this.city = props.city ?? null;
    this.state = props.state ?? null;

    this.validate();
  }

  /**
   * Executa todas as validacoes de forma da entidade.
   *
   * @returns void
   * @throws {ValidationError} Se `name` ou `cpf_cnpj` estiverem ausentes.
   */
  public validate(): void {
    if (!this.name || !this.cpf_cnpj) {
      throw new ValidationError('Nome e CPF/CNPJ são obrigatórios');
    }
  }
}

export = ClientEntity;
