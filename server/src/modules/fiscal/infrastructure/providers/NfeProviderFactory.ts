/**
 * Fábrica de provedor de NF-e. Seleciona a implementação com base no
 * parâmetro explícito (normalmente `CompanyFiscalConfig.nfe_provider`,
 * vindo do banco) — nunca lê `NFE_PROVIDER` diretamente aqui, para que a
 * escolha de provedor seja um dado de negócio administrável, não uma
 * variável de ambiente fixa. As credenciais de cada provedor (tokens),
 * essas sim, vêm de variáveis de ambiente (nunca do banco).
 *
 * @module modules/fiscal/infrastructure/providers/NfeProviderFactory
 */

const MockNfeProvider = require('./MockNfeProvider');
const FocusNfeProvider = require('./FocusNfeProvider');
const ENotasProvider = require('./ENotasProvider');

function createNfeProvider(providerName: 'mock' | 'focus_nfe' | 'enotas') {
  switch (providerName) {
    case 'focus_nfe':
      return new FocusNfeProvider();
    case 'enotas':
      return new ENotasProvider();
    case 'mock':
    default:
      return new MockNfeProvider();
  }
}

export = createNfeProvider;
