/**
 * Entidades de dominio leves de credenciais de autenticacao.
 *
 * @module modules/auth/domain/entities/AuthCredentialsEntity
 */

import Entity from '../../../../shared/domain/Entity';
import { ValidationError } from '../../../../errors';

/** Mesma regex de formato de email usada pelo controller anterior `authController.ts#register`. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginCredentialsProps {
  email: string;
  password: string;
}

interface RegisterUserProps {
  name: string;
  email: string;
  password: string;
  role?: string;
}

/**
 * Entidade de dominio leve que representa as credenciais informadas em
 * `POST /api/auth/login`.
 */
class LoginCredentialsEntity extends Entity {
  public email: string;
  public password: string;

  /**
   * @param props - Email e senha informados.
   * @throws {ValidationError} Se `email` ou `password` estiverem ausentes.
   */
  public constructor({ email, password }: LoginCredentialsProps) {
    super({});
    this.email = email;
    this.password = password;
    this.validate();
  }

  /**
   * @returns void
   * @throws {ValidationError} Se algum campo obrigatorio estiver ausente.
   */
  public validate(): void {
    if (!this.email || !this.password) {
      throw new ValidationError('Email e senha são obrigatórios');
    }
  }
}

/**
 * Entidade de dominio leve que representa os dados informados em
 * `POST /api/auth/register`.
 */
class RegisterUserEntity extends Entity {
  public name: string;
  public email: string;
  public password: string;
  public role?: string;

  /**
   * @param props - Nome, email, senha e papel (opcional).
   * @throws {ValidationError} Se algum campo obrigatorio estiver ausente, o email for invalido ou a senha for curta demais.
   */
  public constructor({ name, email, password, role }: RegisterUserProps) {
    super({});
    this.name = name;
    this.email = email;
    this.password = password;
    this.role = role;
    this.validate();
  }

  /**
   * @returns void
   * @throws {ValidationError} Se algum campo obrigatorio estiver ausente, o email for invalido ou a senha for curta demais.
   */
  public validate(): void {
    if (!this.name || !this.email || !this.password) {
      throw new ValidationError('Nome, email e senha são obrigatórios');
    }
    if (!EMAIL_REGEX.test(this.email)) {
      throw new ValidationError('Formato de email inválido');
    }
    if (this.password.length < 6) {
      throw new ValidationError('Senha deve ter no mínimo 6 caracteres');
    }
  }
}

export { LoginCredentialsEntity, RegisterUserEntity, EMAIL_REGEX };
