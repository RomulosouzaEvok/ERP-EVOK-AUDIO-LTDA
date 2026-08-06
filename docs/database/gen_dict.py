#!/usr/bin/env python3
"""
Gera docs/database/04-DICIONARIO_DADOS.md por introspecção real do
PostgreSQL local (nao le migrations/models — reflete o banco tal como
esta rodando). Ver instrucoes completas em docs/database/03-MODELO_FISICO.md.

Pre-requisito: rodar os dois comandos psql que geram
_columns_raw.psv / _constraints_raw.psv (ver 03-MODELO_FISICO.md) antes
de chamar este script. Uso, a partir da raiz do repo:

    python docs/database/gen_dict.py
"""
import collections
import io
import os

ROOT = os.path.dirname(os.path.abspath(__file__)) + os.sep

# ---- descricoes de negocio curadas (atualizar ao criar tabela nova) ----
TABLE_DESC = {
 "users": "Usuários do sistema (login, papel global, perfil de acesso configurável).",
 "customers": "[LEGADO, ainda em uso paralelo a `clients`] Clientes vinculados a `sales`/`accounts_receivable`.",
 "clients": "Clientes (schema mais novo) — usado por `customer_price_lists`, `service_orders`.",
 "product_categories": "Categorias do schema `products` legado (não confundir com `item_categorias`).",
 "products": "[LEGADO — coexiste com `items`] Catálogo de produtos original (SKU, preço, estoque, Thiele-Small). Ainda referenciado por `sales`, `purchase_order_items`, `production_orders`.",
 "items": "Item Mestre Canônico (novo núcleo, UUID) — 12 colunas críticas de MRP, nunca alteradas por extensões.",
 "item_detalhes_comerciais": "Extensão 1:1 obrigatória de `items` — preço, NCM/CEST, peso, localização, desenho.",
 "item_especificacoes_tecnicas": "Extensão 1:1 opcional de `items` — 13 parâmetros Thiele-Small (JSONB) e família técnica.",
 "item_categorias": "Categorias do novo modelo `items` (N:1).",
 "item_estruturas": "BOM (estrutura de produto) do modelo `items` — hierarquia multi-nível, componentes, perdas %.",
 "item_suppliers": "Catálogo N:N item × fornecedor (preço de referência, lead time, MOQ, preferencial).",
 "inventory_movements": "Movimentações de estoque (entrada/saída/ajuste/transferência), dual-read `product_id`/`item_id`.",
 "inventory_counts": "Contagem cíclica de inventário (cabeçalho) — depósito, atribuição (pool/funcionário), departamento.",
 "inventory_count_items": "Itens de uma contagem cíclica — saldo esperado vs contado, dual-read `product_id`/`item_id`.",
 "warehouses": "Depósitos físicos cadastráveis (ex.: INSUMOS, ACABADOS, LABORATORIO).",
 "product_warehouse_stock": "Saldo de produto POR depósito — soma deve bater com `products.quantity` (invariante).",
 "warehouse_transfers": "Solicitação de transferência de saldo entre depósitos, com aprovação de gestor.",
 "lot_controls": "Rastreabilidade de lotes (matéria-prima e produto acabado) — inclui quarentena de qualidade.",
 "lotes": "[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `lot_controls`.",
 "serial_numbers": "Rastreabilidade por número de série de produto acabado.",
 "numeros_serie": "[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `serial_numbers`.",
 "suppliers": "Fornecedores (cadastro, avaliação manual `rating` + calculada `quality_score`).",
 "fornecedores": "[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `suppliers`.",
 "purchase_requisitions": "Requisição de Compra — origem obrigatória de toda cadeia de suprimentos (rastreabilidade P0).",
 "purchase_requisition_items": "Itens de uma requisição de compra.",
 "requisicoes_compra": "[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `purchase_requisitions`.",
 "requisicao_compra_items": "[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `purchase_requisition_items`.",
 "purchase_orders": "Pedido de Compra — origem em Requisição, ciclo pending→approved→sent→partial→received.",
 "purchase_order_items": "Itens de um Pedido de Compra, com quantidade recebida e status.",
 "purchase_receipts": "Registros de recebimento físico de um Pedido de Compra.",
 "entradas_nf": "[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `purchase_receipts`.",
 "entradas_nf_items": "[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `purchase_receipts`.",
 "rfqs": "Cotação/RFQ multi-fornecedor (cabeçalho) — avulsa ou originada de requisição de compra.",
 "rfq_items": "Itens de uma RFQ.",
 "rfq_suppliers": "Fornecedores convidados a cotar em uma RFQ.",
 "rfq_quotes": "Cotações recebidas por item/fornecedor (mapa comparativo, adjudicação).",
 "sales": "Vendas — ciclo quote→confirmed→partially_invoiced→invoiced→shipped.",
 "sale_items": "Itens de uma venda, com `invoiced_quantity` acumulada (faturamento parcial).",
 "customer_price_lists": "Tabela de preços negociados por par cliente × produto, com vigência opcional.",
 "accounts_receivable": "Contas a Receber — origem em vendas, controle de inadimplência.",
 "accounts_payable": "Contas a Pagar — manual ou automática (pós-recebimento de compra), com centro de custo opcional.",
 "cost_centers": "Centros de Custo — usados para agrupar contas a pagar/receber em relatórios.",
 "bank_statements": "Extrato bancário OFX importado (um registro por arquivo).",
 "bank_statement_entries": "Lançamentos individuais do extrato OFX, com sugestão/baixa de match contra AP/AR.",
 "employees": "Funcionários (RH) — vinculados a um usuário e departamento.",
 "departments": "Departamentos organizacionais (21 no organograma).",
 "production_orders": "Ordem de Produção (OP) — planned→released→in_progress→completed, vínculo com venda.",
 "ordens_producao": "[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `production_orders`.",
 "production_order_tracking": "Apontamento de produção por etapa (operador, quantidade boa/refugo, início/fim).",
 "production_routes": "Rota de manufatura de um produto (sequência de operações).",
 "production_route_steps": "Etapa de uma rota de manufatura (setup, cycle time, centro de trabalho).",
 "production_downtimes": "Paradas de máquina/centro de trabalho, categorizadas — alimenta cálculo de OEE.",
 "production_lot_consumptions": "Consumo de lotes específicos por uma OP (FEFO).",
 "production_cost_settings": "Configuração singleton de custeio (taxa de overhead, taxa de mão-de-obra de fallback).",
 "work_centers": "Centro de trabalho (capacidade finita) — máquinas, eficiência, custo por hora.",
 "work_center_shifts": "Turnos de operação de um centro de trabalho, por dia da semana.",
 "bill_of_materials": "BOM do schema `products` legado (cabeçalho).",
 "bill_of_material_items": "Componentes de uma BOM legada, dual-read `product_id`/`item_id`.",
 "mrp_ordens_planejadas": "Ordens planejadas geradas pelo MRP (RASCUNHO/APROVADA), origem para OP ou requisição.",
 "product_cost_ledgers": "Ledger de custo real ponderado por produto (compra/produção/material/mão-de-obra/overhead/ajuste).",
 "engineering_projects": "Projetos de Engenharia/P&D (PDP: concept→design→prototype→testing→homologation→production).",
 "product_drawings": "Desenhos técnicos de um produto (revisão, tipo, aprovação).",
 "acoustic_test_results": "Resultados de teste acústico (Thiele-Small, THD, potência etc.), com débito de amostra destrutiva.",
 "non_conformities": "Não-conformidades (RNC) de qualidade — pode bloquear lote e realimentar `quality_score` do fornecedor.",
 "maintenance_orders": "Ordens de manutenção de ativos.",
 "assets": "Patrimônio — ativos com QR Code, depreciação, responsável e departamento.",
 "service_orders": "Ordens de serviço (assistência técnica pós-venda).",
 "access_profiles": "Perfis de acesso configuráveis por área (RBAC granular). **Achado de nomenclatura (auditoria 2026-08-06):** colunas `nome`/`descricao` em português, único par PT nesta tabela — nome da tabela, demais colunas (`allowed_warehouses`, `active`, `created_at`/`updated_at`) e a tabela filha `access_profile_permissions` (`module`, `level`) são 100% em inglês. Não é bug funcional (aplicação/model já refletem exatamente isso), mas é uma inconsistência de convenção isolada — registrada aqui, sem correção automática nesta rodada (exigiria migration + ajuste de model/frontend, fora do escopo de reconferência).",
 "access_profile_permissions": "Matriz módulo × nível (operate/approve) de um perfil de acesso.",
 "company_fiscal_config": "Configuração fiscal do emitente (singleton) — razão social, CNPJ, dados de NF-e.",
 "audit_logs": "Log de auditoria de alterações em dados sensíveis (schema em uso).",
 "auditoria_eventos": "[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `audit_logs`.",
 "webhook_events": "Eventos recebidos de integrações externas (ex.: n8n) — idempotência e histórico de payloads.",
 "webhooks_eventos": "[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `webhook_events`.",
 "movimentos_estoque": "[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `inventory_movements`.",
 "usuarios": "[ÓRFÃ/DEPRECATED] Equivalente em português nunca adotado — usar `users`.",
 "migracao_bom_log": "[ÓRFÃ/DEPRECATED] Log técnico da migração Product→Item, sem uso em código vivo.",
 "migracao_categoria_map": "[ÓRFÃ/DEPRECATED] Mapa de migração de categorias, sem uso em código vivo.",
 "migracao_product_item_map": "[ÓRFÃ/DEPRECATED] Mapa de migração Product→Item, sem uso em código vivo.",
 "import_processes": "Processo de Importação/COMEX (UC-19) — cabeçalho: número `IMP-<ano>-XXXX`, fornecedor internacional (reutiliza `suppliers`, sem cadastro dedicado), status de acompanhamento (draft→shipped→arrived→customs_cleared→received, ou cancelled), câmbio (`exchange_rate`) e despesas em BRL (frete/seguro/outras) usadas no rateio pro-rata do valor aduaneiro entre os itens. Sem integração Siscomex/NCM (alíquotas informadas manualmente).",
 "import_process_items": "Itens de um Processo de Importação — quantidade, valor FOB unitário em moeda estrangeira, alíquotas de II/IPI/PIS/COFINS/ICMS informadas manualmente pelo Analista de Comex, e os valores calculados (`ImportTaxCalculator`): valor aduaneiro rateado, tributos (II/IPI/PIS/COFINS/ICMS \"por dentro\") e custo unitário nacionalizado final — usado na entrada de estoque. FK para `items` (núcleo canônico), não para `products` legado.",
}

DEPRECATED = {t for t, d in TABLE_DESC.items() if "ÓRFÃ/DEPRECATED" in d}


def _skip(line):
    return line.startswith("table_name|") or line.startswith("(") or line.endswith("rows)")


# ---- carrega colunas ----
cols = collections.OrderedDict()
with io.open(ROOT + "_columns_raw.psv", encoding="utf-8") as f:
    for line in f:
        line = line.rstrip("\n")
        if not line.strip() or _skip(line):
            continue
        parts = line.split("|", 5)
        if len(parts) < 5:
            continue
        table, pos, col, tipo, nullable = parts[0], parts[1], parts[2], parts[3], parts[4]
        default = parts[5] if len(parts) > 5 else ""
        cols.setdefault(table, []).append({"col": col, "tipo": tipo, "nullable": nullable, "default": default})

# ---- carrega constraints ----
pk = collections.defaultdict(set)
fk = collections.defaultdict(dict)  # table -> col -> (ftable, fcol)
uq = collections.defaultdict(set)
with io.open(ROOT + "_constraints_raw.psv", encoding="utf-8") as f:
    for line in f:
        line = line.rstrip("\n")
        if not line.strip() or _skip(line):
            continue
        parts = line.split("|")
        if len(parts) < 6:
            continue
        table, col, ctype, ftable, fcol, cname = parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]
        if ctype == "PRIMARY KEY":
            pk[table].add(col)
        elif ctype == "FOREIGN KEY":
            fk[table][col] = (ftable, fcol)
        elif ctype == "UNIQUE":
            uq[table].add(col)

# ---- escreve markdown ----
out = io.StringIO()
out.write("# Dicionário de Dados — ERP EVOK ÁUDIO\n\n")
out.write(
    "> Gerado por introspecção real do PostgreSQL 16 local (`information_schema`), "
    "não a partir de leitura de código — reflete o schema efetivamente aplicado "
    "pelas migrations no momento da geração. Ver "
    "`docs/database/03-MODELO_FISICO.md` para o DDL completo "
    "(`pg_dump --schema-only`) e o comando exato usado para regenerar este arquivo.\n\n"
)
out.write(
    "Legenda: **PK** = chave primária, **FK → tabela.coluna** = chave estrangeira, "
    "**UQ** = unique constraint (isolada ou parte de composta), coluna `Nulo?` indica "
    "se a coluna aceita `NULL`.\n\n"
)
out.write(
    "Tabelas marcadas **[ÓRFÃ/DEPRECATED]** fazem parte do schema-fantasma em "
    "português (schema-fantasma nunca adotado pelo app real, `COMMENT ON TABLE` "
    "aplicado em 2026-08-06) e **não devem ser usadas em código novo** — ver "
    "`docs/DATABASE.md` seção \"Tabelas órfãs do schema-fantasma em português\".\n\n"
)
out.write("---\n\n")

tables = sorted(t for t in cols.keys() if t != "SequelizeMeta")
out.write("## Índice de tabelas (" + str(len(tables)) + ")\n\n")
for t in tables:
    tag = " `[DEPRECATED]`" if t in DEPRECATED else ""
    out.write(f"- [`{t}`](#{t.replace('_', '')}){tag}\n")
out.write("\n---\n\n")

for t in tables:
    tag = " `[DEPRECATED]`" if t in DEPRECATED else ""
    out.write(f"## `{t}`{tag}\n\n")
    desc = TABLE_DESC.get(
        t,
        "_Descrição de negócio não catalogada nesta rodada — ver model Sequelize "
        "correspondente ou `docs/DATABASE.md`._",
    )
    out.write(desc + "\n\n")
    out.write("| Coluna | Tipo | Nulo? | Default | Chave |\n")
    out.write("|---|---|---|---|---|\n")
    for c in cols[t]:
        col = c["col"]
        tipo = c["tipo"]
        nullable = "NÃO" if c["nullable"] == "NO" else "sim"
        default = c["default"].strip()
        if default.startswith("nextval"):
            default = "auto-increment"
        if len(default) > 40:
            default = default[:37] + "..."
        keys = []
        if col in pk.get(t, set()):
            keys.append("**PK**")
        if col in fk.get(t, {}):
            ftable, fcol = fk[t][col]
            keys.append(f"FK → `{ftable}.{fcol}`")
        if col in uq.get(t, set()):
            keys.append("UQ")
        keystr = ", ".join(keys) if keys else "-"
        out.write(f"| `{col}` | {tipo} | {nullable} | {default or '-'} | {keystr} |\n")
    out.write("\n")

with io.open(ROOT + "04-DICIONARIO_DADOS.md", "w", encoding="utf-8") as f:
    f.write(out.getvalue())

print("OK —", len(tables), "tabelas documentadas em 04-DICIONARIO_DADOS.md")
