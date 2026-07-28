# Expedição - Módulo Logística

## Processo de Expedição

```
1. PEDIDO FATURADO
   ├── NF-e autorizada
   └── Ordem de separação emitida
        │
        ▼
2. SEPARAÇÃO (PICKING)
   ├── Localizar produto no estoque PA
   ├── Conferir código e lote
   └── Separar quantidade do pedido
        │
        ▼
3. EMBALAGEM
   ├── Embalagem individual (caixa/filme)
   ├── Caixa master (quantidade padrão)
   ├── Identificação (rótulo, código de barras)
   └── Paletização
        │
        ▼
4. CONFERÊNCIA
   ├── Conferir volumes x NF
   ├── Pesar volumes
   └── Romaneio de carga
        │
        ▼
5. CARREGAMENTO
   ├── Acondicionar no veículo
   ├── Lacre
   └── Assinatura do motorista
        │
        ▼
6. ENTREGA
   ├── Rastreamento
   └── Comprovante de entrega
```

### Padrões de Embalagem

| Produto | Caixa | Unid/Caixa | Caixa Master | Unid/Palete |
|---------|-------|------------|-------------|-------------|
| Auto-falante 12" | 425x330x180mm | 1 | 6 un | 120 |
| Auto-falante 15" | 480x380x200mm | 1 | 4 un | 80 |
| Tweeter | 200x150x100mm | 10 | 10 caixas | 1.000 |
| Mid-range | 280x220x150mm | 1 | 8 un | 200 |
