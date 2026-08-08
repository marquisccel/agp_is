import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { fmtAngka } from '@/lib/format';
import type { PurchaseDTO } from '@/types/purchase';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 12, fontFamily: 'Helvetica' },
  header: { borderBottom: '2 solid #0891b2', paddingBottom: 10, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 10, color: '#64748b', marginTop: 4 },
  section: { marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  label: { color: '#64748b' },
  value: { fontWeight: 'bold', color: '#0f172a' },
  table: { width: '100%', borderTop: '1 solid #e2e8f0', marginTop: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottom: '1 solid #e2e8f0', padding: 8, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', borderBottom: '1 solid #e2e8f0', padding: 8 },
  col1: { width: '40%' },
  col2: { width: '20%', textAlign: 'right' },
  col3: { width: '20%', textAlign: 'right' },
  col4: { width: '20%', textAlign: 'right' },
  totalSection: { marginTop: 20, paddingTop: 10, borderTop: '2 solid #e2e8f0' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 5 },
  totalLabel: { width: '55%', textAlign: 'right', paddingRight: 20, color: '#64748b' },
  totalValue: { width: '25%', textAlign: 'right', fontWeight: 'bold', fontSize: 12 },
  qrContainer: { marginTop: 40, alignItems: 'center' },
  qrImage: { width: 100, height: 100, marginBottom: 10 },
  footerText: { fontSize: 8, color: '#94a3b8', textAlign: 'center' }
});

export default function NotaPDF({ purchase, qrCodeUrl }: { purchase: PurchaseDTO, qrCodeUrl: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>NOTA PEMBELIAN PET</Text>
          <Text style={styles.subtitle}>{purchase.nomor_nota || 'DRAFT'}</Text>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Tanggal:</Text>
            <Text style={styles.value}>{new Date(purchase.approvedAt || purchase.createdAt).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Lapak:</Text>
            <Text style={styles.value}>{purchase.supplier.nama}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Metode Timbangan:</Text>
            <Text style={styles.value}>{purchase.metode_pembayaran_terpilih}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Item / SKU</Text>
            <Text style={styles.col2}>Berat (KG)</Text>
            <Text style={styles.col3}>Harga/KG</Text>
            <Text style={styles.col4}>Subtotal</Text>
          </View>
          
          {purchase.items.map((item, i) => {
            const billedWeight = purchase.metode_pembayaran_terpilih === "TIMBANGAN_LAPAK" ? (item.berat_lapak ?? item.berat_final_item) : item.berat_final_item;
            return (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.col1}>{item.sku_name}</Text>
                <Text style={styles.col2}>{fmtAngka(billedWeight || 0)}</Text>
                <Text style={styles.col3}>Rp {item.harga_per_kg.toLocaleString('id-ID')}</Text>
                <Text style={styles.col4}>Rp {item.subtotal.toLocaleString('id-ID')}</Text>
              </View>
            )
          })}
        </View>

        {/* Returs Table (If any) */}
        {purchase.returs && purchase.returs.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>Potongan / Retur:</Text>
            {purchase.returs.map((retur, i) => (
              <View key={i} style={[styles.row, { fontSize: 10 }]}>
                <Text style={{ width: '40%' }}>- {retur.sku_name} ({retur.alasan})</Text>
                <Text style={{ width: '60%', textAlign: 'right', color: '#ef4444' }}>
                  Retur: {fmtAngka(retur.berat_retur)} KG | Potongan: Rp {retur.potongan_nilai.toLocaleString('id-ID')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>Rp {(purchase.total_nilai_sebelum_retur || 0).toLocaleString('id-ID')}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Potongan/Retur:</Text>
            <Text style={[styles.totalValue, { color: '#ef4444' }]}>- Rp {(purchase.total_potongan_retur || 0).toLocaleString('id-ID')}</Text>
          </View>
          {(purchase.potongan_sampah || 0) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                {`Potongan Sampah (${fmtAngka(purchase.berat_potongan_sampah || 0)} KG @ Rp ${purchase.harga_potongan_sampah?.toLocaleString('id-ID')})`}
              </Text>
              <Text style={[styles.totalValue, { color: '#ef4444' }]}>- Rp {(purchase.potongan_sampah || 0).toLocaleString('id-ID')}</Text>
            </View>
          )}
          {(purchase.potongan_susut || 0) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                {`Potongan Susut (${fmtAngka(purchase.berat_potongan_susut || 0)} KG @ Rp ${purchase.harga_potongan_susut?.toLocaleString('id-ID')})`}
              </Text>
              <Text style={[styles.totalValue, { color: '#ef4444' }]}>- Rp {(purchase.potongan_susut || 0).toLocaleString('id-ID')}</Text>
            </View>
          )}
          {(purchase.potongan_air || 0) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                {`Potongan Air (${fmtAngka(purchase.berat_potongan_air || 0)} KG @ Rp ${purchase.harga_potongan_air?.toLocaleString('id-ID')})`}
              </Text>
              <Text style={[styles.totalValue, { color: '#ef4444' }]}>- Rp {(purchase.potongan_air || 0).toLocaleString('id-ID')}</Text>
            </View>
          )}
          {(purchase.potongan_karung || 0) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                {`Potongan Karung (${fmtAngka(purchase.berat_potongan_karung || 0)} KG @ Rp ${purchase.harga_potongan_karung?.toLocaleString('id-ID')})`}
              </Text>
              <Text style={[styles.totalValue, { color: '#ef4444' }]}>- Rp {(purchase.potongan_karung || 0).toLocaleString('id-ID')}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Gunakan DP:</Text>
            <Text style={[styles.totalValue, { color: '#ef4444' }]}>- Rp {(purchase.dp_yang_digunakan || 0).toLocaleString('id-ID')}</Text>
          </View>
          <View style={[styles.totalRow, { marginTop: 10, paddingTop: 10, borderTop: '1 solid #e2e8f0' }]}>
            <Text style={[styles.totalLabel, { color: '#0f172a', fontWeight: 'bold' }]}>TOTAL DIBAYAR:</Text>
            <Text style={[styles.totalValue, { fontSize: 18, color: '#0891b2' }]}>Rp {(purchase.total_dibayar || 0).toLocaleString('id-ID')}</Text>
          </View>
        </View>

        {/* QR Code */}
        {qrCodeUrl && (
          <View style={styles.qrContainer}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop, this isn't an HTML <img> */}
            <Image src={qrCodeUrl} style={styles.qrImage} />
            <Text style={styles.footerText}>Scan untuk verifikasi keaslian nota digital.</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}
