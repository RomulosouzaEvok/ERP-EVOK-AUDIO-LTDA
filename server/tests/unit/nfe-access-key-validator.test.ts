const { isValidNfeAccessKey } = require('../../src/modules/fiscal/domain/services/NfeAccessKeyValidator');

describe('NfeAccessKeyValidator', () => {
  it('aceita uma chave de 44 digitos com digito verificador correto', () => {
    expect(isValidNfeAccessKey('12345678901234567890123456789012345678901235')).toBe(true);
  });

  it('rejeita chave com digito verificador incorreto', () => {
    expect(isValidNfeAccessKey('12345678901234567890123456789012345678901239')).toBe(false);
  });

  it('rejeita chave com tamanho diferente de 44 digitos', () => {
    expect(isValidNfeAccessKey('123456789')).toBe(false);
  });

  it('rejeita valores nao numericos/vazios', () => {
    expect(isValidNfeAccessKey('')).toBe(false);
    expect(isValidNfeAccessKey(undefined as unknown as string)).toBe(false);
  });

  it('aceita chave formatada com espacos/pontuacao (normaliza antes de validar)', () => {
    expect(isValidNfeAccessKey('1234 5678 9012 3456 7890 1234 5678 9012 3456 7890 1235')).toBe(true);
  });
});
