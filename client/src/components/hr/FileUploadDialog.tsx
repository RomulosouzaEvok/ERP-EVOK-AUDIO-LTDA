import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DidacticAlert } from '@/components/DidacticAlert';
import type { DidacticError } from '@/lib/translateApiError';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

/**
 * Dialog reutilizável de upload de documento — mesmo padrão multipart
 * `rhFileUpload.single('file')` usado por todo o módulo RH
 * (`server/src/modules/rh/presentation/routes/rh.ts`: `POST
 * /employee-documents`, `POST /termination-processes/:id/trct`).
 *
 * Genérico o bastante para ser reaproveitado por Admissão (documentos do
 * checklist já cadastrado) e Demissão (ASO demissional — RF-RH-020/030 — e
 * TRCT — RF-RH-021): a tela chamadora injeta os campos extras via
 * `children` (render prop com o valor do arquivo atual) e decide o que
 * fazer com o arquivo em `onSubmit`.
 *
 * `fileRequired=false` permite confirmar sem arquivo (ex.: TRCT — o
 * endpoint aceita `{ paid: true }` sozinho, sem novo anexo).
 */
export function FileUploadDialog({
  open,
  title,
  description,
  fileRequired = true,
  accept = '.pdf,.jpg,.jpeg,.png',
  error,
  isPending,
  submitLabel = 'Enviar',
  onClose,
  onSubmit,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  fileRequired?: boolean;
  accept?: string;
  error: DidacticError | null;
  isPending: boolean;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (file: File | null) => void;
  children?: React.ReactNode;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [localError, setLocalError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setFile(null);
      setLocalError(null);
    }
  }, [open]);

  const handleSubmit = () => {
    if (fileRequired && !file) {
      setLocalError('Selecione um arquivo (PDF ou imagem).');
      return;
    }
    setLocalError(null);
    onSubmit(file);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {children}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hr-file-upload">Arquivo{fileRequired ? ' *' : ' (opcional)'}</Label>
            <input
              id="hr-file-upload"
              type="file"
              accept={accept}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm file:mr-3 file:rounded-sm file:border-0 file:bg-brand/10 file:px-2 file:py-1 file:text-xs file:font-medium file:text-brand"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">Formatos aceitos: PDF, JPG ou PNG.</p>
            {localError && <p className="text-sm text-destructive">{localError}</p>}
          </div>
        </div>

        {error && <DidacticAlert error={error} />}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Enviando...' : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
