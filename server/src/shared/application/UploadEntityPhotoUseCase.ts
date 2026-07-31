/**
 * Use case genérico de upload de foto para qualquer entidade que exponha
 * um repositório com `findById(id)` e `update(id, data)` (Product, Asset,
 * etc.) — evita duplicar a mesma lógica de validação/upload/limpeza do
 * arquivo antigo em cada módulo.
 *
 * @module shared/application/UploadEntityPhotoUseCase
 */

const { uploadFile, deleteFile } = require('../../services/uploadService');
const { NotFoundError, ValidationError } = require('../../errors');

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

interface UploadEntityPhotoInput {
  repository: { findById: (id: number | string) => Promise<any>; update: (id: number | string, data: Record<string, unknown>) => Promise<unknown> };
  id: number | string;
  file: { originalname: string; mimetype: string; size: number; buffer?: Buffer } | undefined;
  subfolder: string;
  entityLabel: string;
}

class UploadEntityPhotoUseCase {
  async execute({ repository, id, file, subfolder, entityLabel }: UploadEntityPhotoInput) {
    if (!file) {
      throw new ValidationError('Arquivo de foto é obrigatório (campo "photo").');
    }

    const entity = await repository.findById(id);
    if (!entity) {
      throw new NotFoundError(`${entityLabel} não encontrado(a).`);
    }

    const result = await uploadFile(file as any, {
      allowedMimes: IMAGE_MIMES,
      allowedExtensions: IMAGE_EXTENSIONS,
      subfolder,
    });

    const previousPhotoPath = entity.photo_path;
    await repository.update(id, { photo_path: result.path });

    if (previousPhotoPath && previousPhotoPath !== result.path) {
      try {
        deleteFile(previousPhotoPath);
      } catch {
        // Falha ao remover a foto antiga nao deve derrubar a operacao —
        // o novo caminho ja foi persistido com sucesso; o arquivo antigo
        // orfao pode ser limpo depois por rotina de manutencao.
      }
    }

    return { photo_path: result.path, entity: await repository.findById(id) };
  }
}

module.exports = UploadEntityPhotoUseCase;
