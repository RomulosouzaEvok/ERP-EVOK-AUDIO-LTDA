-- 01_schema.sql
-- Schema limpo PostgreSQL/Hostinger para ERP Evok Audio.
-- Banco 100% isolado: nao criar FDW, dblink, linked server ou conexoes ao ERP antigo.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE item_tipo AS ENUM ('MATERIA_PRIMA', 'SUBCONJUNTO', 'PRODUTO_ACABADO');
CREATE TYPE item_status AS ENUM ('ATIVO', 'INATIVO', 'BLOQUEADO');
CREATE TYPE movimento_tipo AS ENUM ('ENTRADA_NF', 'BAIXA_PRODUCAO', 'REQUISICAO_MATERIAL', 'AJUSTE', 'RESERVA', 'LIBERACAO_RESERVA');
CREATE TYPE ordem_status AS ENUM ('RASCUNHO', 'APROVADA', 'EM_EXECUCAO', 'CONCLUIDA', 'CANCELADA');
CREATE TYPE origem_mrp AS ENUM ('PEDIDO_VENDA', 'PREVISAO', 'ORDEM_PRODUCAO', 'MANUAL');

CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(160) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  papel VARCHAR(60) NOT NULL DEFAULT 'operator',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social VARCHAR(180) NOT NULL,
  cnpj VARCHAR(20) UNIQUE,
  email VARCHAR(180),
  telefone VARCHAR(40),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(80) NOT NULL UNIQUE,
  descricao VARCHAR(240) NOT NULL,
  tipo item_tipo NOT NULL,
  unidade VARCHAR(12) NOT NULL,
  status item_status NOT NULL DEFAULT 'ATIVO',
  estoque_atual NUMERIC(18,6) NOT NULL DEFAULT 0,
  estoque_reservado NUMERIC(18,6) NOT NULL DEFAULT 0,
  estoque_seguranca NUMERIC(18,6) NOT NULL DEFAULT 0,
  lote_minimo NUMERIC(18,6) NOT NULL DEFAULT 0,
  lead_time_dias INTEGER NOT NULL DEFAULT 0,
  custo_padrao NUMERIC(18,6) NOT NULL DEFAULT 0,
  fornecedor_padrao_id UUID REFERENCES fornecedores(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_items_quantidades CHECK (
    estoque_atual >= 0
    AND estoque_reservado >= 0
    AND estoque_seguranca >= 0
    AND lote_minimo >= 0
    AND lead_time_dias >= 0
  )
);

CREATE TABLE item_estruturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_pai_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  item_componente_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  quantidade NUMERIC(18,6) NOT NULL,
  perda_percentual NUMERIC(9,6) NOT NULL DEFAULT 0,
  nivel INTEGER NOT NULL DEFAULT 1,
  sequencia INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  revisao VARCHAR(20) NOT NULL DEFAULT '00',
  observacoes TEXT,
  criado_por UUID REFERENCES usuarios(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_item_estruturas_quantidade CHECK (quantidade > 0 AND perda_percentual >= 0),
  CONSTRAINT ck_item_estruturas_sem_auto_referencia CHECK (item_pai_id <> item_componente_id),
  CONSTRAINT uq_item_estruturas_ativa UNIQUE (item_pai_id, item_componente_id, revisao)
);

CREATE TABLE lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  codigo_lote VARCHAR(100) NOT NULL,
  quantidade NUMERIC(18,6) NOT NULL DEFAULT 0,
  validade DATE,
  origem VARCHAR(80),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, codigo_lote),
  CONSTRAINT ck_lotes_quantidade CHECK (quantidade >= 0)
);

CREATE TABLE numeros_serie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  numero_serie VARCHAR(120) NOT NULL UNIQUE,
  status VARCHAR(40) NOT NULL DEFAULT 'DISPONIVEL',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE requisicoes_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(60) NOT NULL UNIQUE,
  solicitante_id UUID REFERENCES usuarios(id),
  status ordem_status NOT NULL DEFAULT 'RASCUNHO',
  origem VARCHAR(80) NOT NULL DEFAULT 'ENGENHARIA',
  observacoes TEXT,
  aprovado_por UUID REFERENCES usuarios(id),
  aprovado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE requisicao_compra_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicao_id UUID NOT NULL REFERENCES requisicoes_compra(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  quantidade NUMERIC(18,6) NOT NULL,
  data_necessidade DATE NOT NULL,
  observacoes TEXT,
  CONSTRAINT ck_req_items_quantidade CHECK (quantidade > 0)
);

CREATE TABLE entradas_nf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID REFERENCES fornecedores(id),
  numero_nf VARCHAR(80) NOT NULL,
  chave_acesso VARCHAR(80),
  recebido_por UUID REFERENCES usuarios(id),
  recebido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fornecedor_id, numero_nf)
);

CREATE TABLE entradas_nf_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrada_nf_id UUID NOT NULL REFERENCES entradas_nf(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  lote_id UUID REFERENCES lotes(id),
  quantidade NUMERIC(18,6) NOT NULL,
  custo_unitario NUMERIC(18,6) NOT NULL DEFAULT 0,
  CONSTRAINT ck_nf_items_quantidade CHECK (quantidade > 0)
);

CREATE TABLE ordens_producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(60) NOT NULL UNIQUE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  quantidade_planejada NUMERIC(18,6) NOT NULL,
  quantidade_produzida NUMERIC(18,6) NOT NULL DEFAULT 0,
  status ordem_status NOT NULL DEFAULT 'RASCUNHO',
  data_inicio TIMESTAMPTZ,
  data_fim TIMESTAMPTZ,
  criado_por UUID REFERENCES usuarios(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_op_quantidades CHECK (quantidade_planejada > 0 AND quantidade_produzida >= 0)
);

CREATE TABLE movimentos_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  lote_id UUID REFERENCES lotes(id),
  tipo movimento_tipo NOT NULL,
  quantidade NUMERIC(18,6) NOT NULL,
  saldo_antes NUMERIC(18,6) NOT NULL,
  saldo_depois NUMERIC(18,6) NOT NULL,
  origem_tabela VARCHAR(80) NOT NULL,
  origem_id UUID NOT NULL,
  usuario_id UUID REFERENCES usuarios(id),
  observacoes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_movimentos_quantidade CHECK (quantidade > 0),
  CONSTRAINT ck_movimentos_saldo CHECK (saldo_antes >= 0 AND saldo_depois >= 0)
);

CREATE TABLE mrp_ordens_planejadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  origem origem_mrp NOT NULL,
  origem_id UUID,
  necessidade_bruta NUMERIC(18,6) NOT NULL,
  estoque_disponivel NUMERIC(18,6) NOT NULL,
  necessidade_liquida NUMERIC(18,6) NOT NULL,
  quantidade_planejada NUMERIC(18,6) NOT NULL,
  data_necessidade DATE NOT NULL,
  data_liberacao DATE NOT NULL,
  status ordem_status NOT NULL DEFAULT 'RASCUNHO',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_mrp_quantidades CHECK (
    necessidade_bruta >= 0
    AND estoque_disponivel >= 0
    AND necessidade_liquida >= 0
    AND quantidade_planejada > 0
  ),
  CONSTRAINT uq_mrp_sem_duplicidade UNIQUE (item_id, origem, origem_id, data_necessidade)
);

CREATE TABLE webhooks_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provedor VARCHAR(60) NOT NULL,
  evento VARCHAR(120) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'RECEBIDO',
  resposta JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  processado_em TIMESTAMPTZ
);

CREATE TABLE auditoria_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade VARCHAR(80) NOT NULL,
  entidade_id UUID NOT NULL,
  acao VARCHAR(80) NOT NULL,
  usuario_id UUID REFERENCES usuarios(id),
  antes JSONB,
  depois JSONB,
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
