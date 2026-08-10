/**
 * Caso de uso da importação de cadastro por planilha
 * (`POST /api/catalog-import` e `POST /api/catalog-import/simulacao`).
 *
 * ## Ordem de execução, e por que ela é essa
 *
 * 1. **Valida tudo, sem escrever nada.** Inclui as regras que
 *    `BomService.createBOM` só descobriria durante a gravação. Se sobrar um
 *    erro sequer, o caso de uso devolve o relatório e **não abre transação**.
 * 2. **Grava produtos e itens numa única transação.** As N linhas entram ou
 *    saem juntas — é o que impede a planilha de 300 linhas parar na 300 com
 *    299 gravadas.
 * 3. **Cria as estruturas chamando `BomService.createBOM`.** O serviço abre a
 *    própria transação e não aceita uma de fora; por isso ele só é chamado
 *    depois do commit do passo 2 (dentro da transação, ele não enxergaria os
 *    produtos recém-criados e recusaria tudo com "produto não encontrado").
 *    O serviço **não** é alterado por este módulo — ele é o dono da regra de
 *    estrutura, incluindo o versionamento que marca a revisão anterior como
 *    substituída.
 *
 * ### Risco residual, explicitamente assumido
 *
 * Entre o passo 2 e o fim do passo 3 existe uma janela em que uma queda de
 * banco deixaria os produtos gravados e parte das estruturas não. Como o
 * passo 1 já reprovou tudo que é erro de dado, o que resta nessa janela é
 * falha de infraestrutura — e a importação é idempotente por código, então
 * reimportar o mesmo arquivo conclui o que faltou sem duplicar nada. O
 * relatório sempre diz quais estruturas foram criadas.
 *
 * @module modules/spreadsheetImport/application/use-cases/ImportCatalogSpreadsheetUseCase
 */

import type { Transaction } from 'sequelize';
import type { ICatalogImportRepository } from '../../domain/repositories/CatalogImportRepository';
import type { LinhaProcessada, OcorrenciaImportacao, RelatorioImportacao } from '../../domain/importReport';
import { resumoVazio } from '../../domain/importReport';
import { validarPlanilhaCadastro, type PlanoEstrutura } from '../validation/validarPlanilhaCadastro';

const UseCase = require('../../../../shared/application/UseCase');
const { sequelize } = require('../../../../config/database');
const { ValidationError } = require('../../../../errors');
const BomService = require('../../../../services/bomService');

/** Entrada de {@link ImportCatalogSpreadsheetUseCase.execute}. */
export interface ImportCatalogSpreadsheetInput {
  /** Conteúdo de `produtos.csv`, quando enviado. */
  arquivoProdutos?: { nome: string; buffer: Buffer };
  /** Conteúdo de `estrutura.csv`, quando enviado. */
  arquivoEstrutura?: { nome: string; buffer: Buffer };
  /**
   * Id do usuário autenticado, **sempre** vindo de `req.user.id`.
   *
   * Nunca aceito do corpo da requisição: é a regra P0 de anti-spoofing de
   * identidade da auditoria de 2026-08-02 (remediação 3.1). Ele vira o
   * `created_by` das estruturas criadas.
   */
  usuarioId: number;
  /** `simulacao` valida e devolve o relatório sem tocar no banco. */
  modo: 'simulacao' | 'gravacao';
}

/**
 * Importa (ou apenas confere) as planilhas de cadastro de insumos, produtos e
 * estrutura.
 */
class ImportCatalogSpreadsheetUseCase extends UseCase<ImportCatalogSpreadsheetInput, RelatorioImportacao> {
  private readonly repository: ICatalogImportRepository;

  /**
   * @param repository - Porta de persistência da importação.
   */
  constructor(repository: ICatalogImportRepository) {
    super();
    this.repository = repository;
  }

  /**
   * Executa a importação.
   *
   * @param input - Arquivos, identidade do importador e modo.
   * @returns Relatório completo (o mesmo formato para sucesso e recusa).
   * @throws {import('../../../../errors').ValidationError} Se nenhum arquivo for enviado.
   */
  async execute(input: ImportCatalogSpreadsheetInput): Promise<RelatorioImportacao> {
    // Enviar só `estrutura` é legítimo (todos os itens já cadastrados), assim
    // como enviar só `produtos`. O que não faz sentido é não enviar nenhum.
    if (!input.arquivoProdutos && !input.arquivoEstrutura) {
      throw new ValidationError(
        'Nenhum arquivo enviado. Envie ao menos "produtos" (cadastro) e, se quiser, "estrutura" (lista de componentes).',
      );
    }

    const relatorio: RelatorioImportacao = {
      modo: input.modo,
      gravado: false,
      arquivos: { produtos: input.arquivoProdutos?.nome, estrutura: input.arquivoEstrutura?.nome },
      resumo: resumoVazio(),
      erros: [],
      avisos: [],
      linhas: [],
    };

    let validacao;
    try {
      validacao = await validarPlanilhaCadastro({
        arquivoProdutos: input.arquivoProdutos?.buffer,
        arquivoEstrutura: input.arquivoEstrutura?.buffer,
        repository: this.repository,
      });
    } catch (erro: unknown) {
      // Falha estrutural de leitura (arquivo vazio, ilegível): vira uma
      // ocorrência de relatório, não um 500 sem explicação.
      relatorio.erros.push({
        arquivo: input.arquivoProdutos ? 'produtos' : 'estrutura',
        linha: 1,
        mensagem: erro instanceof Error ? erro.message : 'Não foi possível ler o arquivo.',
      });
      relatorio.resumo.linhas_recusadas = 1;
      return relatorio;
    }

    relatorio.erros = validacao.erros;
    relatorio.avisos = validacao.avisos;
    relatorio.resumo.linhas_recusadas = validacao.erros.length;
    relatorio.resumo.total_avisos = validacao.avisos.length;

    if (validacao.erros.length > 0) {
      relatorio.linhas = validacao.erros.map<LinhaProcessada>((erro: OcorrenciaImportacao) => ({
        arquivo: erro.arquivo,
        linha: erro.linha,
        chave: erro.chave ?? '',
        situacao: 'recusado',
        avisos: [erro.mensagem],
      }));
      return relatorio;
    }

    // ---- Prévia (simulação): mesmo relatório, sem escrita ----
    for (const plano of validacao.produtos) {
      relatorio.linhas.push({
        arquivo: 'produtos',
        linha: plano.linha,
        chave: plano.codigo,
        situacao: plano.acao === 'criar' ? 'criado' : 'atualizado',
        avisos: plano.avisos,
      });
      if (plano.acao === 'criar') relatorio.resumo.produtos_criados += 1;
      else relatorio.resumo.produtos_atualizados += 1;
    }
    for (const estrutura of validacao.estruturas) {
      relatorio.linhas.push({
        arquivo: 'estrutura',
        linha: estrutura.linhas[0],
        chave: estrutura.codigoProduto,
        situacao: estrutura.acao === 'criar' ? 'criado' : 'sem_alteracao',
        avisos: estrutura.avisos,
      });
      if (estrutura.acao === 'criar') relatorio.resumo.estruturas_criadas += 1;
      else relatorio.resumo.estruturas_sem_alteracao += 1;
    }

    if (input.modo === 'simulacao') {
      return relatorio;
    }

    // ---- Passo 2: produtos + itens, tudo numa transação ----
    const transaction: Transaction = await sequelize.transaction();
    try {
      for (const plano of validacao.produtos) {
        if (plano.produtoId === undefined) {
          await this.repository.criarProduto(plano.produto, transaction);
        } else {
          await this.repository.atualizarProduto(plano.produtoId, plano.produto, transaction);
        }

        if (plano.itemId === undefined) {
          await this.repository.criarItem(plano.item, transaction);
        } else {
          await this.repository.atualizarItem(plano.itemId, plano.item, transaction);
        }
      }
      await transaction.commit();
    } catch (erro: unknown) {
      await transaction.rollback();
      throw erro;
    }

    relatorio.gravado = true;

    // ---- Passo 3: estruturas, via BomService (transação própria dele) ----
    const estruturasACriar = validacao.estruturas.filter((estrutura) => estrutura.acao === 'criar');
    if (estruturasACriar.length > 0) {
      await this.criarEstruturas(estruturasACriar, input.usuarioId, relatorio);
    }

    return relatorio;
  }

  /**
   * Cria as estruturas planejadas delegando a `BomService.createBOM`.
   *
   * @param estruturas - Estruturas a criar, já validadas.
   * @param usuarioId - Autor (de `req.user.id`), gravado em `bill_of_materials.created_by`.
   * @param relatorio - Relatório em construção, atualizado em caso de falha.
   */
  private async criarEstruturas(
    estruturas: PlanoEstrutura[],
    usuarioId: number,
    relatorio: RelatorioImportacao,
  ): Promise<void> {
    const codigos = new Set<string>();
    for (const estrutura of estruturas) {
      codigos.add(estrutura.codigoProduto);
      for (const componente of estrutura.componentes) codigos.add(componente.codigoComponente);
    }
    const produtos = await this.repository.findProdutosByCodigos([...codigos]);

    for (const estrutura of estruturas) {
      try {
        const pai = produtos.get(estrutura.codigoProduto.toUpperCase());
        if (!pai) {
          // Só acontece se alguém apagar o produto entre o passo 2 e o 3.
          throw new Error(`o produto sumiu do cadastro entre a gravação e a criação da estrutura.`);
        }

        const itens = estrutura.componentes.map((componente, posicao) => {
          const filho = produtos.get(componente.codigoComponente.toUpperCase());
          if (!filho) {
            throw new Error(`o componente "${componente.codigoComponente}" não foi encontrado no cadastro.`);
          }
          return {
            component_product_id: filho.id,
            quantity: componente.quantidade,
            unit: componente.unidade ?? filho.unit,
            sequence_order: posicao,
            scrap_percentage: componente.perdaPercentual,
            notes: componente.observacao,
            is_critical: componente.critico,
          };
        });

        await BomService.createBOM({
          product_id: pai.id,
          created_by: usuarioId,
          revision: estrutura.revisao,
          notes: `Importado da planilha de cadastro (${relatorio.arquivos.estrutura ?? 'estrutura.csv'}).`,
          items: itens,
        });
      } catch (erro: unknown) {
        // Interrompe as estruturas restantes e devolve o relatório: quem
        // importou precisa saber exatamente onde parou. Como a importação é
        // idempotente por código, reimportar o mesmo arquivo depois de
        // corrigir termina o serviço sem duplicar nada.
        const mensagem = erro instanceof Error ? erro.message : String(erro);
        relatorio.erros.push({
          arquivo: 'estrutura',
          linha: estrutura.linhas[0],
          chave: estrutura.codigoProduto,
          mensagem:
            `Os produtos foram gravados, mas a estrutura de "${estrutura.codigoProduto}" falhou: ${mensagem} `
            + 'Corrija e importe o arquivo de novo — reimportar não duplica o que já entrou.',
        });
        relatorio.resumo.linhas_recusadas += 1;
        relatorio.resumo.estruturas_criadas = Math.max(0, relatorio.resumo.estruturas_criadas - 1);
        return;
      }
    }
  }
}

module.exports = ImportCatalogSpreadsheetUseCase;
