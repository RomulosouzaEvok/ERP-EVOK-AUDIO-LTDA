/**
 * Interface de serviço para desativar o login do sistema de um funcionário
 * desligado (RF-RH-022) — executado na MESMA transação que grava
 * `employees.status='fired'`.
 *
 * @module modules/rh/application/services/UserAccountService
 */
abstract class UserAccountService {
  abstract deactivate(userId: number, transaction?: unknown): Promise<void>;
}

export = UserAccountService;
