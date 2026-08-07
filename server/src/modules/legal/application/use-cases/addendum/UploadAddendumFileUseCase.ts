/**
 * Caso de uso: upload/substituição do arquivo (PDF do aditivo
 * assinado/digitalizado), cobrindo o fluxo do endpoint
 * `POST /api/legal/contract-addendums/:id/file`. Mesmo padrão de
 * `UploadContractFileUseCase`.
 *
 * @module modules/legal/application/use-cases/addendum/UploadAddendumFileUseCase
 */

const { uploadFile, deleteFile } = require('../../../../../services/uploadService');
const { NotFoundError, ValidationError } = require('../../../../../errors');

const ADDENDUM_ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

interface UploadAddendumFileInput {
  addendumRepository: { findAddendumById: (id: number) => Promise<any>; updateAddendum: (id: number, data: Record<string, unknown>) => Promise<any> };
  id: number;
  file: { originalname: string; mimetype: string; size: number; buffer?: Buffer } | undefined;
}

class UploadAddendumFileUseCase {
  async execute({ addendumRepository, id, file }: UploadAddendumFileInput) {
    if (!file) {
      throw new ValidationError('Arquivo é obrigatório (campo "file").');
    }

    const addendum = await addendumRepository.findAddendumById(id);
    if (!addendum) {
      throw new NotFoundError('Aditivo contratual não encontrado.');
    }

    const result = await uploadFile(file, {
      allowedExtensions: ADDENDUM_ALLOWED_EXTENSIONS,
      subfolder: 'legal-contract-addendums',
    });

    const previousFilePath = addendum.file_path;
    await addendumRepository.updateAddendum(id, { file_path: result.path });

    if (previousFilePath && previousFilePath !== result.path) {
      try {
        deleteFile(previousFilePath);
      } catch {
        // Falha ao remover o arquivo antigo não deve derrubar a operação.
      }
    }

    return addendumRepository.findAddendumById(id);
  }
}

export = UploadAddendumFileUseCase;
