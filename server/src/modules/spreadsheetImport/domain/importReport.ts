/**
 * Tipos do relatório de importação de planilha de cadastro.
 *
 * O relatório é o produto principal deste módulo: quem preenche a planilha
 * não lê log de servidor nem stack trace, então **toda** recusa precisa
 * dizer, em português, o arquivo, a linha, a coluna e o motivo.
 *
 * @module modules/spreadsheetImport/domain/importReport
 */

/** Arquivo de origem de uma linha do relatório. */
export type ArquivoPlanilha = 'produtos' | 'estrutura';

/** Desfecho de uma linha da planilha. */
export type SituacaoLinha = 'criado' | 'atualizado' | 'sem_alteracao' | 'recusado';

/** Uma recusa ou um aviso, sempre ancorado em arquivo + linha. */
export interface OcorrenciaImportacao {
  /** Arquivo onde a ocorrência foi detectada. */
  arquivo: ArquivoPlanilha;
  /**
   * Número da linha **como o Excel mostra**: 1 é o cabeçalho, os dados
   * começam em 2. Usar o índice do array aqui seria pedir para o usuário
   * procurar a linha errada.
   */
  linha: number;
  /** Coluna envolvida, quando a ocorrência é de uma célula específica. */
  coluna?: string;
  /** Código/chave da linha, para localizar mesmo depois de reordenar a planilha. */
  chave?: string;
  /** Explicação em português, endereçada a quem preencheu a planilha. */
  mensagem: string;
}

/** Desfecho consolidado de uma linha de dados. */
export interface LinhaProcessada {
  arquivo: ArquivoPlanilha;
  linha: number;
  chave: string;
  situacao: SituacaoLinha;
  /** Avisos que não impedem a gravação (ex.: NCM em branco). */
  avisos: string[];
}

/** Contagens do cabeçalho do relatório. */
export interface ResumoImportacao {
  produtos_criados: number;
  produtos_atualizados: number;
  produtos_sem_alteracao: number;
  estruturas_criadas: number;
  estruturas_sem_alteracao: number;
  linhas_recusadas: number;
  total_avisos: number;
}

/** Relatório completo devolvido pela simulação e pela gravação. */
export interface RelatorioImportacao {
  /** `simulacao` não grava nada; `gravacao` grava se não houver erro. */
  modo: 'simulacao' | 'gravacao';
  /** `true` somente quando houve escrita efetiva no banco. */
  gravado: boolean;
  /** Nome dos arquivos recebidos, para o registro de auditoria. */
  arquivos: { produtos?: string; estrutura?: string };
  resumo: ResumoImportacao;
  /** Se tiver ao menos um item, **nada foi gravado**. */
  erros: OcorrenciaImportacao[];
  avisos: OcorrenciaImportacao[];
  linhas: LinhaProcessada[];
}

/**
 * Cria um resumo zerado.
 *
 * @returns Resumo com todos os contadores em zero.
 */
export function resumoVazio(): ResumoImportacao {
  return {
    produtos_criados: 0,
    produtos_atualizados: 0,
    produtos_sem_alteracao: 0,
    estruturas_criadas: 0,
    estruturas_sem_alteracao: 0,
    linhas_recusadas: 0,
    total_avisos: 0,
  };
}
