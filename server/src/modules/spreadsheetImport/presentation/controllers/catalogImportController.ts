/**
 * Controller da importação de cadastro por planilha.
 *
 * Interpreta o `multipart/form-data`, delega toda a regra ao use case e
 * devolve sempre o **mesmo relatório**, tanto no sucesso quanto na recusa —
 * quem preencheu a planilha precisa da lista de linhas nos dois casos.
 *
 * @module modules/spreadsheetImport/presentation/controllers/catalogImportController
 */

import type { NextFunction, Request, Response } from 'express';
import type { RelatorioImportacao } from '../../domain/importReport';

const { logAction } = require('../../../../services/auditLogService');
const SequelizeCatalogImportRepository = require('../../infrastructure/sequelize/SequelizeCatalogImportRepository');
const ImportCatalogSpreadsheetUseCase = require('../../application/use-cases/ImportCatalogSpreadsheetUseCase');
const { descreverColunas, gerarModeloEstrutura, gerarModeloProdutos } = require('../../application/gerarModelosCsv');
const { CAMPO_ARQUIVO_ESTRUTURA, CAMPO_ARQUIVO_PRODUTOS } = require('../../domain/catalogSpreadsheetSchema');

const repository = new SequelizeCatalogImportRepository();

/** Requisição autenticada: `req.user` é populado por `authenticate`. */
type AuthenticatedRequest = Request & { user: { id: number } };

/** Formato dos arquivos entregues pelo `multer.fields`. */
type ArquivosRecebidos = Record<string, { originalname: string; buffer: Buffer }[] | undefined>;

/**
 * Extrai um arquivo do payload multipart.
 *
 * @param req - Requisição.
 * @param campo - Nome do campo esperado.
 * @returns Nome e conteúdo, ou `undefined` se o campo não veio.
 */
function arquivo(req: Request, campo: string): { nome: string; buffer: Buffer } | undefined {
  const arquivos = (req as unknown as { files?: ArquivosRecebidos }).files;
  const enviado = arquivos?.[campo]?.[0];
  if (!enviado) return undefined;
  return { nome: enviado.originalname, buffer: enviado.buffer };
}

/**
 * Executa a importação (simulação ou gravação) e responde com o relatório.
 *
 * @param req - Requisição autenticada com os arquivos.
 * @param res - Resposta.
 * @param next - Próximo middleware (erros inesperados).
 * @param modo - `simulacao` não grava; `gravacao` grava se não houver erro.
 */
async function executar(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
  modo: 'simulacao' | 'gravacao',
): Promise<void> {
  try {
    const useCase = new ImportCatalogSpreadsheetUseCase(repository);
    const relatorio: RelatorioImportacao = await useCase.execute({
      arquivoProdutos: arquivo(req, CAMPO_ARQUIVO_PRODUTOS),
      arquivoEstrutura: arquivo(req, CAMPO_ARQUIVO_ESTRUTURA),
      // Anti-spoofing (remediação 3.1 da auditoria de 2026-08-02): quem
      // importou vem SEMPRE do JWT, nunca do corpo da requisição.
      usuarioId: req.user.id,
      modo,
    });

    const houveErro = relatorio.erros.length > 0;

    if (relatorio.gravado) {
      logAction(req, {
        action: 'import',
        entityType: 'CatalogImport',
        entityDescription: `Importação de cadastro por planilha (${relatorio.arquivos.produtos ?? '-'} / ${relatorio.arquivos.estrutura ?? '-'})`,
        newValues: { resumo: relatorio.resumo, arquivos: relatorio.arquivos },
        description:
          `${relatorio.resumo.produtos_criados} produto(s) criado(s), `
          + `${relatorio.resumo.produtos_atualizados} atualizado(s), `
          + `${relatorio.resumo.estruturas_criadas} estrutura(s) criada(s).`,
        success: !houveErro,
      });
    }

    if (!houveErro) {
      res.status(200).json({ success: true, data: relatorio });
      return;
    }

    if (relatorio.gravado) {
      // Produtos entraram, uma estrutura falhou depois do commit: é parcial e
      // precisa aparecer como tal, não como sucesso.
      res.status(207).json({
        success: false,
        error: 'O cadastro foi gravado, mas a criação das estruturas parou no meio. Veja o relatório e importe de novo depois de corrigir.',
        data: relatorio,
      });
      return;
    }

    res.status(422).json({
      success: false,
      error:
        `A planilha foi recusada: ${relatorio.erros.length} problema(s) encontrado(s). `
        + 'Nada foi gravado. Corrija as linhas indicadas no relatório e envie de novo.',
      data: relatorio,
    });
  } catch (erro) {
    next(erro);
  }
}

/**
 * `POST /api/catalog-import/simulacao` — confere a planilha e devolve o
 * relatório **sem gravar nada**.
 *
 * @param req - Requisição autenticada.
 * @param res - Resposta.
 * @param next - Próximo middleware.
 * @returns Promise resolvida quando a resposta é enviada.
 */
exports.simular = (req: AuthenticatedRequest, res: Response, next: NextFunction) => executar(req, res, next, 'simulacao');

/**
 * `POST /api/catalog-import` — confere e, se tudo estiver certo, grava o
 * cadastro e as estruturas.
 *
 * @param req - Requisição autenticada.
 * @param res - Resposta.
 * @param next - Próximo middleware.
 * @returns Promise resolvida quando a resposta é enviada.
 */
exports.importar = (req: AuthenticatedRequest, res: Response, next: NextFunction) => executar(req, res, next, 'gravacao');

/**
 * `GET /api/catalog-import/modelos/produtos.csv` — baixa o modelo de
 * cadastro, já preenchido com o exemplo do alto-falante.
 *
 * @param _req - Requisição (não usada).
 * @param res - Resposta com o CSV como anexo.
 * @returns void
 */
exports.modeloProdutos = (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="produtos.csv"');
  res.send(gerarModeloProdutos());
};

/**
 * `GET /api/catalog-import/modelos/estrutura.csv` — baixa o modelo de
 * estrutura, já preenchido com o exemplo de dois níveis.
 *
 * @param _req - Requisição (não usada).
 * @param res - Resposta com o CSV como anexo.
 * @returns void
 */
exports.modeloEstrutura = (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="estrutura.csv"');
  res.send(gerarModeloEstrutura());
};

/**
 * `GET /api/catalog-import/modelos` — descreve as colunas dos dois arquivos
 * (para a tela montar a ajuda sem duplicar texto).
 *
 * @param _req - Requisição (não usada).
 * @param res - Resposta JSON.
 * @returns void
 */
exports.descreverModelos = (_req: Request, res: Response) => {
  res.json({ success: true, data: descreverColunas() });
};
