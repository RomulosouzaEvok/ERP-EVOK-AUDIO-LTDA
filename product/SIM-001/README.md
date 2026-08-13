# SIM-001 — Sala Livre

API em memória para reserva de salas de reunião. Projeto do ciclo SIM-001 do CoreTriad.

## Stack

- Node.js puro (CommonJS)
- Zero dependências externas
- Testes com o runner nativo `node:test`

## Estrutura

```
product/SIM-001/
├── README.md
├── SOFTWARE_RELEASE_PACKAGE.md
├── requirements/
│   ├── BUSINESS_RULES.md
│   └── REQUIREMENTS.md
├── src/
│   └── bookingService.js
└── tests/
    └── booking.test.js
```

## Como rodar os testes

Na raiz do repositório:

```
node --test "product/SIM-001/tests/**/*.test.js"
```

(As aspas garantem que o glob seja expandido pelo próprio Node em qualquer shell.)

## API (resumo)

`createBookingService()` retorna um serviço com:

- `createBooking({ roomId, userId, start, end, price })` — cria uma reserva; rejeita horários sobrepostos na mesma sala.
- `cancelBooking({ bookingId, userId, userRole, now })` — cancela uma reserva; cancelamentos com menos de 24h de antecedência estão sujeitos a taxa.
- `listBookings(roomId)` — lista as reservas ativas de uma sala.

Regras de negócio: `requirements/BUSINESS_RULES.md`.
Requisitos e critérios de aceite: `requirements/REQUIREMENTS.md`.
