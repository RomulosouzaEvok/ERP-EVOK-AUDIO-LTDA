import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { Search } from 'lucide-react';

import * as traceabilityApi from '@/api/traceability';
import { extractApiErrorMessage } from '@/api/httpClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/** `FE6`: consulta de rastreabilidade por item (histórico de movimentos/lotes). */
export default function TraceabilityPage() {
  const [itemId, setItemId] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (id: number) => traceabilityApi.getItemTraceability(id),
    onError: (err) => setError(extractApiErrorMessage(err, 'Item inválido ou sem histórico.')),
  });

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const id = Number(itemId);
    if (!id || id <= 0) {
      setError('Informe um ID de item válido.');
      return;
    }
    mutation.mutate(id);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Search className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Rastreabilidade</h1>
          <p className="text-sm text-muted-foreground">Consulte o histórico completo de movimentos e lotes de um item.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar por item</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex items-end gap-2" onSubmit={handleSearch}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="itemId">ID do produto</Label>
              <Input id="itemId" value={itemId} onChange={(event) => setItemId(event.target.value)} className="w-40" />
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Buscando...' : 'Buscar'}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {mutation.data && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Movimento</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mutation.data.map((event, index) => (
                  <TableRow key={index}>
                    <TableCell>{event.criado_em ? new Date(event.criado_em).toLocaleString('pt-BR') : '-'}</TableCell>
                    <TableCell>{event.tipo}</TableCell>
                    <TableCell>{event.movimento_tipo ?? '-'}</TableCell>
                    <TableCell className="text-right tabular-nums">{event.quantidade}</TableCell>
                    <TableCell className="font-mono text-xs">{event.codigo_lote ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {event.origem_tabela} {event.origem_id ? `#${event.origem_id}` : ''}
                    </TableCell>
                  </TableRow>
                ))}
                {mutation.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum evento encontrado para este item.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
