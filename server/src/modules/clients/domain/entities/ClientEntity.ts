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
