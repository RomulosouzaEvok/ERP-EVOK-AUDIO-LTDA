# Setup do Módulo Fiscal (NF-e) — ERP EVOK ÁUDIO

**Data:** 2026-07-31

## O que foi implementado

- **Motor de cálculo tributário simplificado** (`TaxCalculationService`):
  CFOP (produção própria vs. revenda, intra/interestadual), ICMS
  (CST/CSOSN conforme CRT do emitente), IPI (placeholder NT), PIS/COFINS
  (conforme regime do emitente: Simples/Presumido/Real).
- **Arquitetura plugável de provedor de NF-e** (`NfeProviderPort`):
  - `MockNfeProvider` — autorização simulada instantânea, usado por
    padrão (`nfe_provider = 'mock'`). **Nunca tem validade fiscal real.**
  - `FocusNfeProvider` — adapter real para a API da Focus NFe.
  - `ENotasProvider` — adapter real para a API da eNotas.
- **Fluxo completo de emissão de venda**: `POST /api/sales/:id/nfe`
  (emitir), `GET /api/sales/:id/nfe` (consultar/reconciliar status),
  `POST /api/sales/:id/nfe/cancel` (cancelar). `status: 'invoiced'` agora
  só é setado automaticamente quando a NF-e é de fato autorizada — não
  pode mais ser setado manualmente via `PUT /api/sales/:id/status`.
- **NF-e de entrada (compra)**: `POST /api/purchases/:id/nfe` registra
  manualmente a chave de acesso (validada com dígito verificador real) e
  opcionalmente um XML anexado — **não consome a NF-e diretamente da
  SEFAZ** (isso exigiria configurar Manifestação do Destinatário/DFe, um
  fluxo adicional separado).
- **Configuração fiscal da empresa**: `GET`/`PUT /api/fiscal/config`
  (somente admin) — dados do emitente (CNPJ, IE, endereço, CRT) e
  série/numeração da NF-e.
- **Webhook de status assíncrono**: `POST /api/webhooks/focus-nfe`,
  protegido por segredo compartilhado (`FOCUS_NFE_WEBHOOK_SECRET`) — nunca
  aplica o payload recebido diretamente, sempre reconsulta o status real
  na API do provedor.

## ⚠️ O que NÃO está pronto para produção ainda

1. **Alíquotas de ICMS são padrão por estado** — não cobre Substituição
   Tributária, benefícios fiscais, convênios específicos, DIFAL para
   consumidor final não contribuinte, nem alíquotas diferenciadas por
   NCM. **Um contador/tributarista deve validar o cálculo antes da
   primeira emissão real.**
2. **IPI está zerado por padrão** — não há tabela de alíquotas por NCM
   cadastrada no catálogo de produtos hoje.
3. **Payload dos adapters Focus NFe/eNotas foi montado com base em
   documentação pública conhecida, não testado contra a API real** (não
   há acesso à internet neste ambiente de desenvolvimento para validar
   contra a documentação atual). **Antes da primeira emissão em
   homologação real, valide o payload contra a documentação vigente:**
   - Focus NFe: https://focusnfe.com.br/doc/
   - eNotas: https://docs.enotasgw.com.br/

## Passos para habilitar emissão real

### 1. Escolher e contratar um provedor
- **Focus NFe** ou **eNotas** (ambos oferecem sandbox de homologação
  gratuito sem custo, plano pago só para produção).

### 2. Cadastrar o certificado digital A1
- O certificado (.pfx) é enviado **diretamente no painel do provedor
  escolhido** (Focus NFe ou eNotas) — o ERP nunca manipula o arquivo do
  certificado diretamente.

### 3. Configurar variáveis de ambiente (`server/.env`)
```bash
# Focus NFe
FOCUS_NFE_TOKEN=<token da conta>
FOCUS_NFE_ENVIRONMENT=homologacao   # trocar para "producao" só depois de validar
FOCUS_NFE_WEBHOOK_SECRET=<gerar um segredo aleatorio forte>

# OU eNotas
ENOTAS_API_KEY=<api key da conta>
ENOTAS_EMPRESA_ID=<id da empresa cadastrada na eNotas>
```

### 4. Cadastrar os dados fiscais da empresa
```
PUT /api/fiscal/config
{
  "legal_name": "...", "cnpj": "...", "ie": "...", "crt": "3",
  "cep": "...", "street": "...", "number": "...", "neighborhood": "...",
  "city": "...", "city_ibge_code": "...", "state": "...",
  "nfe_series": 1,
  "nfe_environment": "homologacao",
  "nfe_provider": "focus_nfe"
}
```
O `city_ibge_code` (código IBGE do município) é obrigatório para a NF-e
e pode ser consultado em https://servicodados.ibge.gov.br/api/docs/localidades.

### 5. Emitir NF-e de teste em homologação
- Confirmar uma venda (`status: 'confirmed'`) e chamar
  `POST /api/sales/:id/nfe`. Em homologação, a NF-e não tem valor fiscal
  — é seguro testar o fluxo completo.

### 6. Validar com um contador antes de trocar para produção
- Revisar as alíquotas calculadas (ICMS/PIS/COFINS) contra o regime real
  da empresa e os produtos vendidos.
- Só então trocar `nfe_environment` para `producao` em
  `PUT /api/fiscal/config` e `FOCUS_NFE_ENVIRONMENT=producao` no `.env`.

## Testes automatizados
- `server/tests/unit/tax-calculation-service.test.ts` — motor de cálculo tributário.
- `server/tests/unit/nfe-access-key-validator.test.ts` — validação de chave de acesso.
- `server/tests/integration/sale-nfe-issuance.test.ts` — fluxo completo real (emissão, consulta, dupla-emissão bloqueada, cancelamento), usando o provedor mock (não requer credenciais).
