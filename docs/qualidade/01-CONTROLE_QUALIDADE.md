# Controle de Qualidade - Módulo Qualidade

## 1. Incoming (Inspeção de Recebimento)

### Critérios de Inspeção por Material

| Material | Item a Inspecionar | Critério | Amostragem | Instrumento |
|----------|-------------------|----------|------------|-------------|
| Cone 12" | Diâmetro externo | 305 ±0,5 mm | 5% | Paquímetro |
| Cone 12" | Espessura borda | 0,8 ±0,1 mm | 5% | Micrômetro |
| Cone 12" | Peso | 25 ±2 g | 5% | Balança |
| Cone 12" | Acabamento | Sem rebarbas, trincas | 100% visual | Visual |
| Bobina VC | Resistência DC | 6,5 ±0,3 Ω | 10% | Multímetro |
| Bobina VC | Diâmetro interno | 50,8 ±0,1 mm | 10% | Paquímetro |
| Bobina VC | Peso | 12 ±1 g | 10% | Balança |
| Imã Ferrite | Dimensões | 200x50x20 ±1 mm | 10% | Paquímetro |
| Imã Ferrite | Fluxo magnético | 12.000 ±500 Gauss | 100% | Gaussmeter |
| Basket | Dimensões | Conforme desenho | 5% | Gabarito |
| Basket | Pintura | Sem falhas, uniforme | 100% visual | Visual |

### Tabela AQL (Acceptable Quality Level)

| Lote | Nível I (Normal) | Nível II (Reduzido) | Nível III (Apertado) |
|------|-----------------|-------------------|-------------------|
| Até 50 | 13 | 8 | 21 |
| 51-150 | 21 | 13 | 34 |
| 151-500 | 34 | 21 | 55 |
| 501-1200 | 55 | 34 | 89 |
| 1201-10000 | 89 | 55 | 144 |

## 2. In-Process (Controle de Processo)

### Parâmetros Controlados por Operação

| Operação | Parâmetro | Especificação | Frequência | Ação Corretiva |
|----------|-----------|--------------|------------|---------------|
| Injeção | Temperatura zona 1 | 180 ±5°C | 1x/hora | Ajustar controlador |
| Injeção | Pressão injeção | 80 ±5 bar | 1x/hora | Ajustar válvula |
| Injeção | Peso da peça | 25 ±2 g | 5 un/hora | Regular parâmetros |
| Bobinagem | Resistência DC | 6,5 ±0,3 Ω | 1 un/50 | Ajustar voltas |
| Bobinagem | Tensão do fio | 30 ±5 gf | 1x/hora | Ajustar grampo |
| Colagem | Gramatura de cola | 3 ±0,5 g | 1 un/20 | Regular aplicador |
| Solda | Temperatura ferro | 350 ±20°C | 1x/hora | Ajustar estação |
| Teste | Impedância | 8 ±0,5 Ω | 100% | Reprovar |

### Carta de Controle (CEP)

```
Carta de Controle - Peso do Cone (g)
╔═════════════════════════════════════════════════════════════╗
║ LSE: 29,0 ──────────────────────────────────────────────── ║
║      28,0 │                             │  │              │ ║
║      27,0 │  ●   ●     ●  ●     ●        │              │ ║
║      26,0 │ ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●       │ ║
║ MÉDIA:25,0 │● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ║
║      24,0 │              ●        ●  ●                  │ ║
║      23,0 │                 ●              ●            │ ║
║      22,0 │                                            │ ║
║ LIE: 21,0 ──────────────────────────────────────────────── ║
║         1  2  3  4  5  6  7  8  9  10 11 12 13 14 15     ║
╚═════════════════════════════════════════════════════════════╝
LSE = Limite Superior Especificado (25 + 4,0)
LIE = Limite Inferior Especificado (25 - 4,0)
Média = 25,0 g (OK)
Capacidade: Cp = (29-21)/(6x1,5) = 0,89 (NECESSITA MELHORIA)
```

## 3. Final (Inspeção de Produto Acabado)

### Check-list de Inspeção Final

| Item | Critério | Método | Ação |
|------|----------|--------|------|
| 1. Cone | Sem trincas, deformações | Visual | Rejeitar |
| 2. Surround | Bem colado, sem bolhas | Visual | Rejeitar |
| 3. Spider | Centralizado, bem colado | Visual | Rejeitar |
| 4. Bobina | Sem fio solto | Visual | Rejeitar |
| 5. Gap | Folga uniforme (0,5 mm) | Calibre | Rejeitar |
| 6. Terminal | Bem soldado, sem curtos | Teste elétrico | Rejeitar |
| 7. Basket | Sem amassados, pintura OK | Visual | Rejeitar |
| 8. Cabo | Plug conectado | Teste | Rejeitar |
| 9. Impedância | 8 ±0,5 Ω | Multímetro | Reprovar |
| 10. Polaridade | + no terminal | Teste | Inverter |
| 11. Ruído | Sem chiado, batendo | Teste acústico | Reprovar |
| 12. Rótulo | Código, lote, data | Visual | Recolocar |

### Plano de Amostragem para Testes

| Teste | Frequência | Critério |
|-------|-----------|----------|
| Visual | 100% | Sem defeitos |
| Impedância | 100% | 8 ±0,5 Ω |
| Polaridade | 100% | Correta |
| Curto-circuito | 100% | Resistência infinita |
| THD (Distorção) | 1 un/100 | < 5% |
| Potência RMS | 1 un/500 | | 300W por 2h |
| Resposta em Frequência | 1 un/1000 |
