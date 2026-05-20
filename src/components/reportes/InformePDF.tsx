import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { calcTotalesCorredor } from '../../lib/formulas';
import { formatFecha } from '../../lib/dateUtils';
import type { Corredor, RegistroDiario, Semana } from '../../types';

Font.register({
  family: 'Helvetica',
  fonts: [{ src: 'Helvetica' }, { src: 'Helvetica-Bold', fontWeight: 'bold' }],
});

const NAVY = '#1a3a5c';
const WHITE = '#ffffff';
const GRAY = '#f5f5f5';
const BLACK = '#000000';

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 8, padding: 24, color: BLACK },
  header: { backgroundColor: NAVY, padding: 10, marginBottom: 10 },
  headerTitle: { color: WHITE, fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  headerSub: { color: WHITE, fontSize: 9, textAlign: 'center', marginTop: 2 },
  sectionTitle: {
    backgroundColor: NAVY,
    color: WHITE,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 6,
    paddingRight: 6,
    fontWeight: 'bold',
    fontSize: 9,
    marginTop: 8,
    marginBottom: 2,
  },
  table: { border: '1 solid #cccccc' },
  th: {
    backgroundColor: NAVY,
    color: WHITE,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 4,
    paddingRight: 4,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 7,
    flex: 1,
    borderRight: '0.5 solid #ffffff',
  },
  td: {
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
    textAlign: 'center',
    fontSize: 7,
    flex: 1,
    borderRight: '0.5 solid #cccccc',
    borderBottom: '0.5 solid #cccccc',
  },
  tdLabel: {
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
    fontSize: 7,
    flex: 1.4,
    borderRight: '0.5 solid #cccccc',
    borderBottom: '0.5 solid #cccccc',
  },
  row: { flexDirection: 'row' },
  totalRow: { flexDirection: 'row', backgroundColor: GRAY, fontWeight: 'bold' },
  footer: { marginTop: 16, fontSize: 8 },
});

interface Props {
  semana: Semana;
  corredores: Corredor[];
  registros: RegistroDiario[];
}

function getRegistrosDe(corredor: Corredor, registros: RegistroDiario[]): RegistroDiario[] {
  return registros
    .filter((r) => r.corredor_id === corredor.id)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function SeccionI({ corredor, regs }: { corredor: Corredor; regs: RegistroDiario[] }) {
  const totales = calcTotalesCorredor(regs);

  return (
    <View>
      <Text style={s.sectionTitle}>
        SECCIÓN I — KILÓMETROS Y SERVICIOS · {corredor.codigo} {corredor.nombre}
      </Text>
      <View style={s.table}>
        <View style={s.row}>
          {['Fecha', 'Kms Prog.', 'Kms Ejec.', 'Kms Efect.', 'Pasajeros', 'Serv. Prog.', 'Serv. Ejec.', 'Serv. Punt.'].map(
            (h) => (
              <Text key={h} style={s.th}>
                {h}
              </Text>
            )
          )}
        </View>
        {regs.map((r) => (
          <View key={r.fecha} style={s.row}>
            <Text style={s.tdLabel}>{formatFecha(r.fecha)}</Text>
            <Text style={s.td}>{r.kms_programados ?? '—'}</Text>
            <Text style={s.td}>{r.kms_ejecutados ?? '—'}</Text>
            <Text style={s.td}>{r.kms_efectivos ?? '—'}</Text>
            <Text style={s.td}>{r.total_pasajeros ?? '—'}</Text>
            <Text style={s.td}>{r.servicios_programados ?? '—'}</Text>
            <Text style={s.td}>{r.servicios_ejecutados ?? '—'}</Text>
            <Text style={s.td}>{r.servicios_puntuales ?? '—'}</Text>
          </View>
        ))}
        <View style={s.totalRow}>
          <Text style={s.tdLabel}>TOTAL</Text>
          <Text style={s.td}>{totales.kms_programados}</Text>
          <Text style={s.td}>{totales.kms_ejecutados}</Text>
          <Text style={s.td}>{totales.kms_efectivos}</Text>
          <Text style={s.td}>{totales.total_pasajeros}</Text>
          <Text style={s.td}>{totales.servicios_programados}</Text>
          <Text style={s.td}>{totales.servicios_ejecutados}</Text>
          <Text style={s.td}>{totales.servicios_puntuales}</Text>
        </View>
      </View>
    </View>
  );
}

function SeccionII({ corredor, regs }: { corredor: Corredor; regs: RegistroDiario[] }) {
  const totales = calcTotalesCorredor(regs);

  return (
    <View>
      <Text style={s.sectionTitle}>
        SECCIÓN II — INDICADORES · {corredor.codigo} {corredor.nombre}
      </Text>
      <View style={s.table}>
        <View style={s.row}>
          {['Fecha', 'IcA', 'IcK', 'IcD', 'IC', 'IP', 'IE', 'ICS'].map((h) => (
            <Text key={h} style={s.th}>
              {h}
            </Text>
          ))}
        </View>
        {regs.map((r) => (
          <View key={r.fecha} style={s.row}>
            <Text style={s.tdLabel}>{formatFecha(r.fecha)}</Text>
            <Text style={s.td}>{r.ica?.toFixed(2) ?? '—'}</Text>
            <Text style={s.td}>{r.ick?.toFixed(2) ?? '—'}</Text>
            <Text style={s.td}>{r.icd?.toFixed(2) ?? '—'}</Text>
            <Text style={s.td}>{r.ic?.toFixed(2) ?? '—'}</Text>
            <Text style={s.td}>{r.ip?.toFixed(2) ?? '—'}</Text>
            <Text style={s.td}>{r.ie?.toFixed(2) ?? '—'}</Text>
            <Text style={s.td}>{r.ics?.toFixed(2) ?? '—'}</Text>
          </View>
        ))}
        <View style={s.totalRow}>
          <Text style={s.tdLabel}>PROM</Text>
          <Text style={s.td}>{totales.ica_prom.toFixed(2)}</Text>
          <Text style={s.td}>{totales.ick_prom.toFixed(2)}</Text>
          <Text style={s.td}>{totales.icd_prom.toFixed(2)}</Text>
          <Text style={s.td}>{totales.ic_prom.toFixed(2)}</Text>
          <Text style={s.td}>{totales.ip_prom.toFixed(2)}</Text>
          <Text style={s.td}>{totales.ie_prom.toFixed(2)}</Text>
          <Text style={s.td}>{totales.ics_prom.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}

export function InformePDF({ semana, corredores, registros }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <Text style={s.headerTitle}>
            SEMANA OPERACIONAL {semana.numero_semana} — PERIODO {semana.periodo}
          </Text>
          <Text style={s.headerSub}>Corredores Interoperables del Gran Santo Domingo · INTRANT / SITPSD</Text>
          <Text style={s.headerSub}>
            Del {semana.fecha_inicio} al {semana.fecha_fin}
          </Text>
        </View>

        {corredores.map((corredor) => {
          const regs = getRegistrosDe(corredor, registros);
          return (
            <View key={corredor.id} wrap={false}>
              <SeccionI corredor={corredor} regs={regs} />
              <SeccionII corredor={corredor} regs={regs} />
            </View>
          );
        })}

        <View style={s.footer}>
          {semana.validado_por && <Text>Revisado y validado por: {semana.validado_por}</Text>}
          {semana.observaciones && <Text style={{ marginTop: 4 }}>Observaciones: {semana.observaciones}</Text>}
        </View>
      </Page>
    </Document>
  );
}
