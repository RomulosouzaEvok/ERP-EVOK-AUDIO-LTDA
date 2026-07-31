import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

import * as auditLogsApi from '@/api/auditLogs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/** `FE6`: log de auditoria (somente leitura, admin), filtrável por entidade. */
export default function AuditLogsPage() {
  const [entityType, setEntityType] = React.useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', entityType],
    queryFn: () => auditLogsApi.listAuditLogs({ entity_type: entityType || undefined, limit: 50 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Log de auditoria</h1>

      <Input
        placeholder="Filtrar por tipo de entidade (ex.: Sale, Product, User)..."
        value={entityType}
        onChange={(event) => setEntityType(event.target.value)}
        className="max-w-sm"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Entidade</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Resultado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={6}>Carregando...</TableCell>
            </TableRow>
          )}
          {data?.data.map((log) => (
            <TableRow key={log.id}>
              <TableCell>{new Date(log.createdAt).toLocaleString('pt-BR')}</TableCell>
              <TableCell>{log.user_name ?? '-'}</TableCell>
              <TableCell>{log.action}</TableCell>
              <TableCell>
                {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
              </TableCell>
              <TableCell>{log.description ?? log.entity_description ?? '-'}</TableCell>
              <TableCell>
                <Badge variant={log.success ? 'success' : 'destructive'}>{log.success ? 'Sucesso' : 'Falha'}</Badge>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhum evento encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
