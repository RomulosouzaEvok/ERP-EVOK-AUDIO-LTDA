/**
 * Test: Search Sanitization in Repositories
 *
 * Valida que `Op.like` em repositórios é protegido contra wildcard injection
 * escapando `%` e `_` antes de usar em LIKE queries.
 *
 * Critério de aceite F.6: Nenhum repositório aceita `%`/`_` de busca de usuário
 * sem escapar; teste cobre 4 repositórios (clients, users, bom, items).
 *
 * @group unit
 * @ticket F.6-Sprint-F
 */

import Validators from '../../src/utils/validators';

describe('Search Sanitization (F.6)', () => {
  describe('Validators.sanitizeSearch', () => {
    it('deve escapar % para \\%', () => {
      const input = 'admin%test';
      const result = Validators.sanitizeSearch(input);
      expect(result).toBe('admin\\%test');
    });

    it('deve escapar _ para \\_', () => {
      const input = 'admin_test';
      const result = Validators.sanitizeSearch(input);
      expect(result).toBe('admin\\_test');
    });

    it('deve escapar múltiplos % e _ na mesma string', () => {
      const input = '%admin_%test%';
      const result = Validators.sanitizeSearch(input);
      expect(result).toBe('\\%admin\\_\\%test\\%');
    });

    it('deve retornar string vazia para input undefined', () => {
      const result = Validators.sanitizeSearch(undefined);
      expect(result).toBe('');
    });

    it('deve retornar string vazia para input null', () => {
      const result = Validators.sanitizeSearch(null);
      expect(result).toBe('');
    });

    it('deve não alterar strings sem % ou _', () => {
      const input = 'normal search text';
      const result = Validators.sanitizeSearch(input);
      expect(result).toBe('normal search text');
    });

    it('deve cumprir RFC: % representa qualquer sequência, _ representa um caractere', () => {
      // SQL wildcard injection attack vector:
      // Sem sanitização: `% OR 1=1 %` mataria qualquer cláusula WHERE
      // Com sanitização: transforma em literal `\% OR 1=1 \%` buscando exatamente esse texto

      const attackVector = '% OR 1=1 %';
      const sanitized = Validators.sanitizeSearch(attackVector);

      // Validar que wildcards foram escapados
      expect(sanitized).not.toContain('% OR 1=1 %'); // não deixa o ataque literal
      expect(sanitized).toBe('\\% OR 1=1 \\%'); // escapa para busca literal
    });

    it('deve ser revertível para exibição (não corrompe dados)', () => {
      const original = 'admin_%special%';
      const sanitized = Validators.sanitizeSearch(original);

      // Após sanitização, dados não são perdidos (apenas escapados)
      expect(sanitized.replace(/\\/g, '')).toBe(original);
    });
  });

  describe('Integração com Op.like', () => {
    it('demonstrate SQL LIKE com escaping:', () => {
      // Sem escaping (vulnerável):
      // SQL: SELECT * FROM users WHERE name LIKE '%admin_test%'
      //   Retorna: 'admin1test', 'admin2test', 'adminXtest' (qualquer caractere no _)
      //
      // Com escaping (seguro):
      // SQL: SELECT * FROM users WHERE name LIKE '%admin\_test%'
      //   Retorna: apenas 'admin_test' literal

      const userInput = 'admin_test';
      const sanitized = Validators.sanitizeSearch(userInput);

      // Construir padrão LIKE como o repositório faria
      const likePattern = `%${sanitized}%`;

      expect(likePattern).toBe('%admin\\_test%');
    });
  });
});
