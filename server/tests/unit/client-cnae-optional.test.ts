/**
 * Testes unitários da decisão D-I do dono do produto (2026-08-10): **CNAE no
 * cadastro de cliente é "sim, mas opcional"** — o campo passa a existir na API,
 * mas NUNCA trava a criação, porque não se aplica a pessoa física.
 *
 * O foco aqui é a armadilha que já mordeu esta tabela exatamente uma vez
 * (BUG-02, commit `94e0f14`): `ClientEntity` normaliza campo ausente para
 * `null`, e um `null` explícito **ANULA o `DEFAULT` do Postgres**. Por isso os
 * testes abaixo travam as duas metades da regra:
 *
 * - `cnae` é `varchar(10) NULL` **sem** `DEFAULT` → `null` por ausência é o
 *   valor certo (verificado em `information_schema.columns`);
 * - `phone`/`email`/`notes` são `NOT NULL DEFAULT ''` → têm que continuar
 *   saindo como `''`, jamais `null`, mesmo com o campo novo no payload.
 *
 * ⚠️ Teste unitário usa repositório dublê e **não** prova escrita real — ver
 * `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`.
 * A escrita real contra o PostgreSQL (INSERT com e sem CNAE, dentro de
 * transação revertida) foi executada à parte e está registrada no handoff.
 */

import CreateClientUseCase = require('../../src/modules/clients/application/use-cases/CreateClientUseCase');
import UpdateClientUseCase = require('../../src/modules/clients/application/use-cases/UpdateClientUseCase');
import ClientEntity = require('../../src/modules/clients/domain/entities/ClientEntity');
const { createClientSchema, updateClientSchema } = require('../../src/modules/clients/presentation/validators/clientValidators');

/** CPF sintaticamente válido usado nos testes (dígitos verificadores corretos). */
const CPF_VALIDO = '52998224725';
/** CNPJ sintaticamente válido usado nos testes. */
const CNPJ_VALIDO = '11444777000161';

/** Repositório dublê que apenas captura o payload entregue pelo use case. */
function fakeRepo() {
  const captured: { create?: Record<string, unknown>; update?: Record<string, unknown> } = {};
  return {
    captured,
    async create(data: Record<string, unknown>) {
      captured.create = data;
      return { id: 1, ...data };
    },
    async update(_id: number, data: Record<string, unknown>) {
      captured.update = data;
      return 1;
    },
    async findById(id: number) {
      return { id, ...(captured.update ?? {}) };
    },
  } as any;
}

describe('D-I — CNAE opcional no cadastro de cliente', () => {
  describe('validador (createClientSchema / updateClientSchema)', () => {
    it('aceita cnae informado', () => {
      const parsed = createClientSchema.safeParse({ name: 'ACME', cpf_cnpj: CNPJ_VALIDO, cnae: '2660-4/00' });
      expect(parsed.success).toBe(true);
      expect(parsed.data.cnae).toBe('2660-4/00');
    });

    it('aceita a AUSENCIA de cnae — o campo nao trava a criacao (pessoa fisica)', () => {
      const parsed = createClientSchema.safeParse({ name: 'Fulano', cpf_cnpj: CPF_VALIDO });
      expect(parsed.success).toBe(true);
      expect(parsed.data.cnae).toBeUndefined();
    });

    it('rejeita cnae acima de 10 caracteres antes de chegar no varchar(10) do Postgres', () => {
      const parsed = createClientSchema.safeParse({ name: 'ACME', cpf_cnpj: CNPJ_VALIDO, cnae: '12345678901' });
      expect(parsed.success).toBe(false);
    });

    it('continua .strict(): campo desconhecido segue sendo rejeitado', () => {
      const parsed = createClientSchema.safeParse({ name: 'ACME', cpf_cnpj: CNPJ_VALIDO, campo_inexistente: 'x' });
      expect(parsed.success).toBe(false);
    });

    it('updateClientSchema tambem aceita cnae (preencher depois)', () => {
      expect(updateClientSchema.safeParse({ cnae: '6201-5/01' }).success).toBe(true);
    });
  });

  describe('ClientEntity', () => {
    it('normaliza cnae ausente para null (coluna nullable SEM default)', () => {
      const entity = new ClientEntity({ name: 'Fulano', cpf_cnpj: CPF_VALIDO });
      expect(entity.cnae).toBeNull();
    });

    it('normaliza cnae em branco para null, para nao gravar string vazia', () => {
      expect(new ClientEntity({ name: 'ACME', cpf_cnpj: CNPJ_VALIDO, cnae: '   ' }).cnae).toBeNull();
      expect(new ClientEntity({ name: 'ACME', cpf_cnpj: CNPJ_VALIDO, cnae: '' }).cnae).toBeNull();
    });

    it('preserva (com trim) o cnae informado', () => {
      expect(new ClientEntity({ name: 'ACME', cpf_cnpj: CNPJ_VALIDO, cnae: ' 2660-4/00 ' }).cnae).toBe('2660-4/00');
    });

    it('nao torna cnae obrigatorio: entidade valida sem ele', () => {
      expect(() => new ClientEntity({ name: 'Fulano', cpf_cnpj: CPF_VALIDO })).not.toThrow();
    });
  });

  describe('CreateClientUseCase', () => {
    it('repassa o cnae informado para o repositorio', async () => {
      const repo = fakeRepo();
      await new CreateClientUseCase(repo).execute({ name: 'ACME', cpf_cnpj: CNPJ_VALIDO, cnae: '2660-4/00' });
      expect(repo.captured.create!.cnae).toBe('2660-4/00');
    });

    it('cria cliente SEM cnae (decisao D-I) gravando null', async () => {
      const repo = fakeRepo();
      const created = await new CreateClientUseCase(repo).execute({ name: 'Fulano', cpf_cnpj: CPF_VALIDO });
      expect(created.id).toBe(1);
      expect(repo.captured.create!.cnae).toBeNull();
    });

    it("BUG-02: o campo novo nao contamina as colunas NOT NULL DEFAULT '' (phone/email/notes seguem '')", async () => {
      const repo = fakeRepo();
      await new CreateClientUseCase(repo).execute({ name: 'Fulano', cpf_cnpj: CPF_VALIDO, cnae: '2660-4/00' });
      expect(repo.captured.create!.phone).toBe('');
      expect(repo.captured.create!.email).toBe('');
      expect(repo.captured.create!.notes).toBe('');
    });
  });

  describe('UpdateClientUseCase', () => {
    it('cnae esta na allowlist do PUT — da para preencher depois', async () => {
      const repo = fakeRepo();
      await new UpdateClientUseCase(repo).execute({ id: 7, body: { cnae: '6201-5/01' } });
      expect(repo.captured.update).toEqual({ cnae: '6201-5/01' });
    });

    it('campo fora da allowlist continua sendo descartado', async () => {
      const repo = fakeRepo();
      await new UpdateClientUseCase(repo).execute({ id: 7, body: { cnae: '6201-5/01', cpf_cnpj: '999' } });
      expect(repo.captured.update).not.toHaveProperty('cpf_cnpj');
    });
  });
});
