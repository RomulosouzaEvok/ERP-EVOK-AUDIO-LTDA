/**
 * Caso de uso: upload/substituição do arquivo de um material de divulgação,
 * cobrindo o fluxo do endpoint `POST /api/marketing/materials/:id/file`.
 *
 * Diferente de `UploadEntityPhotoUseCase` (compartilhado, usado por
 * Product/Asset): materiais de marketing não são só imagens (podem ser PDF,
 * vídeo, apresentação), então este caso de uso usa `uploadService.uploadFile`
 * diretamente com uma lista de extensões mais ampla, em vez de reutilizar o
 * helper genérico (que é fixado em `IMAGE_MIMES`/campo `photo_path`).
 *
 * `allowedMimes` é deixado vazio propositalmente na chamada a `uploadFile`:
 * o mapa de magic bytes de `Validators.FILE_MAGIC_BYTES`
 * (`server/src/utils/validators.ts`) só reconhece png/jpeg/gif/webp/pdf/xml/
 * json — não tem assinatura para vídeo (mp4/mov) nem para os formatos de
 * apresentação/documento do Office. Passar `allowedMimes` vazio faz a
 * validação de magic bytes não bloquear esses tipos (ver
 * `Validators.validateFileMagic`), mantendo a extensão como o filtro
 * primário para esses casos — decisão consciente, documentada aqui para não
 * ser "corrigida" por engano em uma auditoria futura.
 *
 * @module modules/marketing/application/use-cases/material/UploadMaterialFileUseCase
 */

const { uploadFile, deleteFile } = require('../../../../../services/uploadService');
const { NotFoundError, ValidationError } = require('../../../../../errors');

const MATERIAL_ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf',
  '.mp4', '.mov',
  '.ppt', '.pptx', '.doc', '.docx',
];

interface UploadMaterialFileInput {
  materialRepository: { findMaterialById: (id: number) => Promise<any>; updateMaterial: (id: number, data: Record<string, unknown>) => Promise<any> };
  id: number;
  file: { originalname: string; mimetype: string; size: number; buffer?: Buffer } | undefined;
}

class UploadMaterialFileUseCase {
  async execute({ materialRepository, id, file }: UploadMaterialFileInput) {
    if (!file) {
      throw new ValidationError('Arquivo é obrigatório (campo "file").');
    }

    const material = await materialRepository.findMaterialById(id);
    if (!material) {
      throw new NotFoundError('Material não encontrado.');
    }

    const result = await uploadFile(file, {
      allowedExtensions: MATERIAL_ALLOWED_EXTENSIONS,
      subfolder: 'marketing-materials',
    });

    const previousFilePath = material.file_path;
    await materialRepository.updateMaterial(id, { file_path: result.path });

    if (previousFilePath && previousFilePath !== result.path) {
      try {
        deleteFile(previousFilePath);
      } catch {
        // Falha ao remover o arquivo antigo não deve derrubar a operação —
        // o novo caminho já foi persistido com sucesso (mesmo padrão de
        // UploadEntityPhotoUseCase).
      }
    }

    return materialRepository.findMaterialById(id);
  }
}

export = UploadMaterialFileUseCase;
