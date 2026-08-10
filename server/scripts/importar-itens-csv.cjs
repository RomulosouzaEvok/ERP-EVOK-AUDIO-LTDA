'use strict';

/**
 * Carrega o cadastro mestre de itens a partir de um CSV, criando cada item
 * pela **API real** (`POST /api/items`) — não por `INSERT` direto.
 *
 * ## Por que pela API, e não direto no banco
 *
 * `INSERT` direto pula validação de payload, regra de unicidade de código,
 * RBAC e log de auditoria. É exatamente a classe de defeito descrita em
 * `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`:
 * o dado entra, o typecheck passa, e o sistema quebra no primeiro uso real.
 * Carregando pela API, a carga inicial **é** a prova de escrita real que o
 * critério de aceite exige — 327 escritas bem-sucedidas contra o PostgreSQL.
 *
 * ## Formato do CSV
 *
 * Separador `;` (padrão do Excel em português), UTF-8, sem aspas — as
 * descrições contêm `"` de polegada (`12" SW700X`), que quebrariam um parser
 * com aspas. Nenhum campo pode conter `;`.
 *
 * Colunas consumidas: `codigo`, `descricao`, `tipo`, `unidade`, `status`,
 * `custo_padrao`, `estoque_atual`, `estoque_seguranca`, `lote_minimo`,
 * `lead_time_dias`.
 *
 * As demais colunas (`codigo_legado`, `referencia_legado`, `unidade_sugerida`,
 * `revisar`, `motivo_revisao`) são para conferência humana e **não são
 * enviadas** — `createItemSchema` é `.strict()` e rejeitaria o payload.
 *
 * ## Uso
 *
 * ```bash
 * cd server
 * # 1. simula: valida o arquivo inteiro, não grava nada
 * node scripts/importar-itens-csv.cjs ../docs/carga-inicial/insumos-materia-prima.csv
 *
 * # 2. grava de verdade
 * node scripts/importar-itens-csv.cjs ../docs/carga-inicial/insumos-materia-prima.csv --confirmar
 * ```
 *
 * Credenciais e endereço da API por variável de ambiente (padrão entre
 * parênteses):
 * `API_URL` (`http://localhost:5000`), `IMPORT_EMAIL`, `IMPORT_PASSWORD`.
 *
 * O usuário precisa do módulo `produtos` no nível `operate` (Engenharia do
 * Produto e Almoxarifado têm; ver `scripts/seed-usuarios-departamentos.cjs`).
 *
 * ## Reexecução
 *
 * É seguro rodar de novo: item cujo código já existe responde 409 e é contado
 * como `JA EXISTIA`, não como erro. Assim uma carga interrompida no meio
 * continua de onde parou.
 *
 * ## Limite de requisições
 *
 * `app.ts` aplica 300 requisições por 15 minutos por IP (`apiLimiter`). Uma
 * carga de 327 itens **estoura** esse teto — foi o que aconteceu na primeira
 * execução real: 300 criados e 27 recusados com HTTP 429. O limite está
 * correto (é defesa contra abuso) e não deve ser afrouxado por causa de uma
 * carga pontual; quem se adapta é o script, esperando a janela reabrir.
 *
 * @module scripts/importar-itens-csv
 */

const fs = require('fs');
const path = require('path');

const serverDir = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(serverDir, '.env') });

const API_URL = (process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');

/** Quantas vezes o script espera a janela do rate limiter reabrir, por item. */
const MAX_ESPERAS = 20;

/** Espera (segundos) quando a API não informa `Retry-After`. */
const ESPERA_PADRAO_S = 60;

/** Campos aceitos por `createItemSchema` (que é `.strict()`). */
const CAMPOS_TEXTO = ['codigo', 'descricao', 'tipo', 'unidade', 'status'];
const CAMPOS_NUMERO = ['custo_padrao', 'estoque_atual', 'estoque_seguranca', 'lote_minimo', 'lead_time_dias'];

/**
 * Lê o CSV `;`-separado, sem tratamento de aspas (ver cabeçalho).
 * @param {string} caminho
 * @returns {Array<Record<string, string>>}
 */
function lerCsv(caminho) {
  const bruto = fs.readFileSync(caminho, 'utf8').replace(/^﻿/, '');
  const linhas = bruto.split(/\r?\n/).filter((l) => l.trim() !== '');
  const cabecalho = linhas[0].split(';').map((c) => c.trim());

  return linhas.slice(1).map((linha, indice) => {
    const celulas = linha.split(';');
    if (celulas.length !== cabecalho.length) {
      throw new Error(
        `Linha ${indice + 2} tem ${celulas.length} colunas, esperado ${cabecalho.length}. ` +
        'Causa provável: alguma descrição contém ponto-e-vírgula.',
      );
    }
    const registro = {};
    cabecalho.forEach((coluna, i) => { registro[coluna] = (celulas[i] ?? '').trim(); });
    registro.__linha = indice + 2;
    return registro;
  });
}

/**
 * Converte uma linha do CSV no payload de `POST /api/items`.
 * @param {Record<string, string>} registro
 * @returns {Record<string, unknown>}
 */
function montarPayload(registro) {
  const payload = {};
  for (const campo of CAMPOS_TEXTO) {
    if (registro[campo]) payload[campo] = registro[campo];
  }
  for (const campo of CAMPOS_NUMERO) {
    if (registro[campo] !== '' && registro[campo] != null) {
      // vírgula decimal do Excel em português -> ponto
      payload[campo] = Number(String(registro[campo]).replace(',', '.'));
    }
  }
  return payload;
}

/**
 * Confere o que dá para conferir sem chamar a API.
 * @param {Array<Record<string, string>>} registros
 * @returns {string[]} problemas encontrados
 */
function validarLocalmente(registros) {
  const TIPOS = ['MATERIA_PRIMA', 'SUBCONJUNTO', 'PRODUTO_ACABADO', 'USO_E_CONSUMO', 'ATIVO_IMOBILIZADO'];
  const STATUS = ['ATIVO', 'INATIVO', 'BLOQUEADO'];
  const problemas = [];
  const vistos = new Map();

  for (const r of registros) {
    const onde = `linha ${r.__linha} (${r.codigo || 'sem codigo'})`;
    if (!r.codigo) problemas.push(`${onde}: codigo vazio`);
    if (!r.descricao) problemas.push(`${onde}: descricao vazia`);
    if (r.codigo && r.codigo.length > 80) problemas.push(`${onde}: codigo passa de 80 caracteres`);
    if (r.descricao && r.descricao.length > 240) problemas.push(`${onde}: descricao passa de 240 caracteres`);
    if (!TIPOS.includes(r.tipo)) problemas.push(`${onde}: tipo "${r.tipo}" invalido`);
    if (r.status && !STATUS.includes(r.status)) problemas.push(`${onde}: status "${r.status}" invalido`);
    if (!r.unidade) problemas.push(`${onde}: unidade vazia`);
    if (r.unidade && r.unidade.length > 12) problemas.push(`${onde}: unidade passa de 12 caracteres`);

    if (r.codigo) {
      if (vistos.has(r.codigo)) {
        problemas.push(`${onde}: codigo repetido (ja aparece na linha ${vistos.get(r.codigo)})`);
      } else {
        vistos.set(r.codigo, r.__linha);
      }
    }
  }
  return problemas;
}

/**
 * Autentica e devolve o token JWT.
 * @returns {Promise<string>}
 */
async function autenticar() {
  const email = process.env.IMPORT_EMAIL;
  const password = process.env.IMPORT_PASSWORD;
  if (!email || !password) {
    throw new Error('Defina IMPORT_EMAIL e IMPORT_PASSWORD (usuario com permissao produtos:operate).');
  }

  const resposta = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok || !corpo?.data?.token) {
    throw new Error(`Login falhou (HTTP ${resposta.status}): ${JSON.stringify(corpo)}`);
  }
  return corpo.data.token;
}

async function main() {
  const caminho = process.argv[2];
  const confirmado = process.argv.includes('--confirmar');

  if (!caminho) {
    console.error('Uso: node scripts/importar-itens-csv.cjs <arquivo.csv> [--confirmar]');
    process.exit(1);
  }

  const registros = lerCsv(path.resolve(process.cwd(), caminho));
  console.log(`Arquivo: ${caminho}`);
  console.log(`Linhas de dado: ${registros.length}\n`);

  const problemas = validarLocalmente(registros);
  if (problemas.length > 0) {
    console.error(`VALIDACAO REPROVOU — ${problemas.length} problema(s):\n`);
    problemas.slice(0, 40).forEach((p) => console.error(`  - ${p}`));
    if (problemas.length > 40) console.error(`  ... e mais ${problemas.length - 40}.`);
    console.error('\nNada foi enviado. Corrija o CSV e rode de novo.');
    process.exit(1);
  }
  console.log('Validacao local: OK (codigos unicos, tipos e tamanhos validos).');

  const paraRevisar = registros.filter((r) => r.revisar === 'SIM');
  if (paraRevisar.length > 0) {
    console.log(`\nAVISO: ${paraRevisar.length} itens estao marcados revisar=SIM no CSV.`);
    console.log('Eles SERAO carregados assim mesmo — a marca e para conferencia humana depois.');
  }

  if (!confirmado) {
    console.log('\n>>> SIMULACAO. Nada foi gravado.');
    console.log('>>> Para gravar de verdade, rode de novo com --confirmar');
    return;
  }

  const token = await autenticar();
  console.log(`\nAutenticado em ${API_URL}. Enviando ${registros.length} itens...\n`);

  const resultado = { criados: 0, jaExistiam: 0, falhas: [] };

  for (const registro of registros) {
    const payload = montarPayload(registro);
    let resposta;
    let tentativasDeEspera = 0;

    // Repete enquanto o rate limiter estiver fechado. `MAX_ESPERAS` limita a
    // paciência para o script não ficar preso indefinidamente se a API estiver
    // recusando por outro motivo que também devolva 429.
    for (;;) {
      try {
        resposta = await fetch(`${API_URL}/api/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      } catch (erro) {
        resposta = null;
        resultado.falhas.push({ linha: registro.__linha, codigo: registro.codigo, motivo: `rede: ${erro.message}` });
        break;
      }

      if (resposta.status !== 429 || tentativasDeEspera >= MAX_ESPERAS) break;

      tentativasDeEspera += 1;
      const segundos = Number(resposta.headers.get('retry-after')) || ESPERA_PADRAO_S;
      console.log(
        `  limite da API atingido em ${registro.codigo} — aguardando ${segundos}s ` +
        `(espera ${tentativasDeEspera}/${MAX_ESPERAS})...`,
      );
      await new Promise((resolver) => setTimeout(resolver, segundos * 1000));
    }

    if (!resposta) continue;

    if (resposta.status === 409) {
      resultado.jaExistiam += 1;
      continue;
    }
    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => '');
      resultado.falhas.push({
        linha: registro.__linha,
        codigo: registro.codigo,
        motivo: `HTTP ${resposta.status}: ${corpo.slice(0, 300)}`,
      });
      continue;
    }

    resultado.criados += 1;
    if (resultado.criados % 50 === 0) console.log(`  ... ${resultado.criados} criados`);
  }

  console.log('\n--- RESULTADO ---');
  console.log(`  Criados:      ${resultado.criados}`);
  console.log(`  Ja existiam:  ${resultado.jaExistiam}`);
  console.log(`  Falharam:     ${resultado.falhas.length}`);

  if (resultado.falhas.length > 0) {
    console.log('\nFalhas:');
    resultado.falhas.forEach((f) => console.log(`  - linha ${f.linha} ${f.codigo}: ${f.motivo}`));
    process.exitCode = 1;
  }
}

main().catch((erro) => {
  console.error('\nERRO:', erro.message);
  process.exit(1);
});
