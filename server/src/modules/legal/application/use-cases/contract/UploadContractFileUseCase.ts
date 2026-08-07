/**
 * Caso de uso: upload/substituição do arquivo (PDF do instrumento
 * assinado/digitalizado) de um contrato, cobrindo o fluxo do endpoint
 * `POST /api/legal/contracts/:id/file`.
 *
 * Mesmo padrão de `UploadMaterialFileUseCase` (módulo Marketing): usa
 * `uploadService.uploadFile` diretamente (não o helper genérico de foto),
 * porque o arquivo de contrato tipicamente é PDF/DOCX, não imagem.
 *
 * @module modules/legal/application/use-cases/contract/UploadContractFileUseCase
 */

const { uploadFile, deleteFile } = require('../../../../../services/uploadService');
const { NotFoundError, ValidationError } = require('../../../../../errors');

const CONTRACT_ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

interface UploadContractFileInput {
  contractRepository: { findContractById: (id: number) => Promise<any>; updateContract: (id: number, data: Record<string, unknown>) => Promise<any> };
  id: number;
  file: { originalname: string; mimetype: string; size: number; buffer?: Buffer } | undefined;
}

class UploadContractFileUseCase {
  async execute({ contractRepository, id, file }: UploadContractFileInput) {
    if (!file) {
      throw new ValidationError('Arquivo é obrigatório (campo "file").');
    }

    const contract = await contractRepository.findContractById(id);
    if (!contract) {
      throw new NotFoundError('Contrato não encontrado.');
    }

    const result = await uploadFile(file, {
      allowedExtensions: CONTRACT_ALLOWED_EXTENSIONS,
      subfolder: 'legal-contracts',
    });

    const previousFilePath = contract.file_path;
    await contractRepository.updateContract(id, { file_path: result.path });

    if (previousFilePath && previousFilePath !== result.path) {
      try {
        deleteFile(previousFilePath);
      } catch {
        // Falha ao remover o arquivo antigo não deve derrubar a operação —
        // o novo caminho já foi persistido com sucesso (mesmo padrão de
        // UploadMaterialFileUseCase/UploadEntityPhotoUseCase).
      }
    }

    return contractRepository.findContractById(id);
  }
}

export = UploadContractFileUseCase;
