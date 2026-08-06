/**
 * Card de um departamento no painel de TV. Texto grande, legível a
 * distância ("10-foot UI"). Departamentos sem nenhuma demanda aberta ficam
 * visualmente mais discretos (menor contraste), mas continuam na grade —
 * o objetivo é que quem olha de longe bata o olho rápido em quem TEM
 * demanda pendente.
 */

import { StyleSheet, Text, View } from 'react-native';

import type { DepartmentDemand } from '../api/types';

interface MetricConfig {
  key: keyof Pick<
    DepartmentDemand,
    'open_production_orders' | 'open_purchase_requisitions' | 'open_inventory_counts'
  >;
  label: string;
  icon: string;
  color: string;
}

const METRICS: MetricConfig[] = [
  { key: 'open_production_orders', label: 'Ordens de Produção', icon: '⚙️', color: '#38BDF8' },
  { key: 'open_purchase_requisitions', label: 'Requisições de Compra', icon: '📦', color: '#FBBF24' },
  { key: 'open_inventory_counts', label: 'Contagens de Inventário', icon: '🔢', color: '#34D399' },
];

interface DepartmentCardProps {
  demand: DepartmentDemand;
}

export default function DepartmentCard({ demand }: DepartmentCardProps) {
  const total =
    demand.open_production_orders.count +
    demand.open_purchase_requisitions.count +
    demand.open_inventory_counts.count;
  const hasDemand = total > 0;

  return (
    <View style={[styles.card, !hasDemand && styles.cardIdle]}>
      <Text style={[styles.departmentName, !hasDemand && styles.textIdle]} numberOfLines={2}>
        {demand.department_name}
      </Text>

      <View style={styles.metricsRow}>
        {METRICS.map((metric) => {
          const group = demand[metric.key];
          return (
            <View key={metric.key} style={styles.metricBlock}>
              <Text
                style={[
                  styles.metricValue,
                  { color: hasDemand && group.count > 0 ? metric.color : '#64748B' },
                ]}
              >
                {metric.icon} {group.count}
              </Text>
              <Text style={[styles.metricLabel, !hasDemand && styles.textIdle]} numberOfLines={2}>
                {metric.label}
              </Text>
              {group.items.length > 0 ? (
                <View style={styles.itemsPreview}>
                  {group.items.slice(0, 3).map((item) => (
                    <Text key={item.id} style={styles.itemPreviewText} numberOfLines={1}>
                      {item.reference}
                      {item.due_date ? ` · ${item.due_date}` : ''}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    margin: 10,
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 220,
  },
  cardIdle: {
    backgroundColor: '#151E2E',
    borderColor: '#1E293B',
    opacity: 0.55,
  },
  departmentName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  textIdle: {
    color: '#94A3B8',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricBlock: {
    flex: 1,
    alignItems: 'flex-start',
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '900',
  },
  metricLabel: {
    fontSize: 13,
    color: '#CBD5E1',
    marginTop: 4,
  },
  itemsPreview: {
    marginTop: 8,
  },
  itemPreviewText: {
    fontSize: 11,
    color: '#64748B',
  },
});
