import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface QrCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Busca o QR Code em PNG (ex.: `() => getProductQrCode(id)`). */
  fetchQrCode: () => Promise<{ qrDataUrl?: string; qrCodeData: string }>;
  queryKey: unknown[];
}

/** Diálogo genérico de exibição/impressão de QR Code (produto ou ativo). */
export function QrCodeDialog({ open, onOpenChange, title, fetchQrCode, queryKey }: QrCodeDialogProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: fetchQrCode,
    enabled: open,
  });

  const handlePrint = () => {
    if (!data?.qrDataUrl) return;
    const printWindow = window.open('', '_blank', 'width=400,height=500');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>${title}</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;padding:24px;">
          <img src="${data.qrDataUrl}" style="width:240px;height:240px;" />
          <p style="margin-top:12px;font-size:14px;">${title}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col items-center gap-3">
        <DialogHeader>
          <DialogTitle>QR Code — {title}</DialogTitle>
        </DialogHeader>
        {isLoading && <p className="text-sm text-muted-foreground">Gerando QR Code...</p>}
        {isError && <p className="text-sm text-destructive">Não foi possível gerar o QR Code.</p>}
        {data?.qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.qrDataUrl} alt={`QR Code de ${title}`} className="size-56" />
        )}
        <DialogFooter>
          <Button onClick={handlePrint} disabled={!data?.qrDataUrl}>
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
