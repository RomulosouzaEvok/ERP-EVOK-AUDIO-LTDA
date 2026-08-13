'use strict';

/**
 * Cliente do gateway externo de pagamentos.
 *
 * Implementação determinística em memória usada pelo simulado: registra cada
 * chamada recebida e devolve uma referência externa sequencial.
 */
function createGatewayClient({ prefix = 'GW' } = {}) {
  const calls = [];
  let sequence = 0;

  async function submitPayment({ paymentId, amount, currency = 'BRL' }) {
    if (!paymentId) {
      throw new Error('paymentId é obrigatório');
    }
    if (!(amount > 0)) {
      throw new Error('amount deve ser positivo');
    }

    sequence += 1;
    const externalRef = `${prefix}-${String(sequence).padStart(6, '0')}`;
    calls.push({ paymentId, amount, currency, externalRef });

    return { accepted: true, externalRef };
  }

  return {
    submitPayment,
    callCount() {
      return calls.length;
    },
    callsFor(paymentId) {
      return calls.filter((call) => call.paymentId === paymentId);
    },
    history() {
      return calls.slice();
    },
    reset() {
      calls.length = 0;
      sequence = 0;
    }
  };
}

module.exports = { createGatewayClient };
