// src/components/reportes/ResumenMensualPDF.tsx
import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { getICSColor } from '../../lib/formulas';
import type { FilaResumen } from '../../hooks/useResumenMensual';

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
  table: { border: '1 solid #cccccc', marginTop: 8 },
  row: { flexDirection: 'row' },
  totalRow: { flexDirection: 'row', backgroundColor: GRAY, fontWeight: 'bold' },
  th: {
    backgroundColor: NAVY, color: WHITE,
    paddingTop: 3, paddingBottom: 3, paddingLeft: 4, paddingRight: 4,
    fontWeight: 'bold', textAlign: 'center', fontSize: 7, flex: 1,
    borderRight: '0.5 solid #ffffff',
  },
  thWide: {
    backgroundColor: NAVY, color: WHITE,
    paddingTop: 3, paddingBottom: 3, paddingLeft: 4, paddingRight: 4,
    fontWeight: 'bold', fontSize: 7, flex: 2,
    borderRight: '0.5 solid #ffffff',
  },
  td: {
    paddingTop: 2, paddingBottom: 2, paddingLeft: 4, paddingRight: 4,
    textAlign: 'center', fontSize: 7, flex: 1,
    borderRight: '0.5 solid #cccccc', borderBottom: '0.5 solid #cccccc',
  },
  tdWide: {
    paddingTop: 2, paddingBottom: 2, paddingLeft: 4, paddingRight: 4,
    fontSize: 7, flex: 2,
    borderRight: '0.5 solid #cccccc', borderBottom: '0.5 solid #cccccc',
  },
});

function n2(v: number): string { return v.toFixed(2); }
function n0(v: number): string { return Math.round(v).toLocaleString('es-DO'); }

interface Props {
  periodo: number;
  filas: FilaResumen[];
}

export function ResumenMensualPDF({ periodo, filas }: Props) {
  const ICS_HEADERS = ['IcA', 'IcK', 'IcD', 'IC', 'IP', 'IE', 'ICS'];

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <Text style={s.headerTitle}>RESUMEN MENSUAL DE OPERACIÓN</Text>
          <Text style={s.headerSub}>Período {periodo} — INTRANT · Dirección de Movilidad Sostenible</Text>
        </View>

        {/* Sección I */}
        <Text style={{ fontWeight: 'bold', fontSize: 9, marginBottom: 4 }}>
          SECCIÓN I — KILÓMETROS Y SERVICIOS
        </Text>
        <View style={s.table}>
          <View style={s.row}>
            <Text style={s.thWide}>Corredor</Text>
            {['Kms Prog.','Kms Ejec.','Kms Efect.','Pasajeros','S. Prog.','S. Ejec.','S. Punt.'].map(h => (
              <Text key={h} style={s.th}>{h}</Text>
            ))}
          </View>
          {filas.map(({ corredor, totales }) => (
            <View key={corredor.id} style={s.row}>
              <Text style={s.tdWide}>{corredor.codigo} — {corredor.nombre}</Text>
              <Text style={s.td}>{n0(totales.kms_programados)}</Text>
              <Text style={s.td}>{n0(totales.kms_ejecutados)}</Text>
              <Text style={s.td}>{n0(totales.kms_efectivos)}</Text>
              <Text style={s.td}>{n0(totales.total_pasajeros)}</Text>
              <Text style={s.td}>{n0(totales.servicios_programados)}</Text>
              <Text style={s.td}>{n0(totales.servicios_ejecutados)}</Text>
              <Text style={s.td}>{n0(totales.servicios_puntuales)}</Text>
            </View>
          ))}
        </View>

        {/* Sección II */}
        <Text style={{ fontWeight: 'bold', fontSize: 9, marginTop: 12, marginBottom: 4 }}>
          SECCIÓN II — INDICADORES (PROMEDIO)
        </Text>
        <View style={s.table}>
          <View style={s.row}>
            <Text style={s.thWide}>Corredor</Text>
            {ICS_HEADERS.map(h => <Text key={h} style={s.th}>{h}</Text>)}
          </View>
          {filas.map(({ corredor, totales }) => (
            <View key={corredor.id} style={s.row}>
              <Text style={s.tdWide}>{corredor.codigo} — {corredor.nombre}</Text>
              <Text style={s.td}>{n2(totales.ica_prom)}</Text>
              <Text style={s.td}>{n2(totales.ick_prom)}</Text>
              <Text style={s.td}>{n2(totales.icd_prom)}</Text>
              <Text style={s.td}>{n2(totales.ic_prom)}</Text>
              <Text style={s.td}>{n2(totales.ip_prom)}</Text>
              <Text style={s.td}>{n2(totales.ie_prom)}</Text>
              <Text style={{ ...s.td, color: getICSColor(totales.ics_prom) }}>{n2(totales.ics_prom)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
