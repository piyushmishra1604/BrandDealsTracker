import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { type Invoice, invoiceTotal } from "./invoices";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: "#101c40" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  brandName: { fontSize: 20, fontWeight: 700 },
  invoiceTitle: { fontSize: 16, fontWeight: 700, textAlign: "right" },
  muted: { color: "#53668e" },
  sectionTop: { marginTop: 24, borderTopWidth: 1, borderTopColor: "#edf1f8", paddingTop: 16 },
  label: { fontSize: 9, color: "#53668e", marginBottom: 2 },
  bold: { fontWeight: 700 },
  table: { marginTop: 24 },
  tableHeaderRow: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#edf1f8", paddingVertical: 6 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#edf1f8", paddingVertical: 6 },
  colDescription: { flex: 3 },
  colNumber: { flex: 1, textAlign: "right" },
  totalsBlock: { marginTop: 8, alignItems: "flex-end" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", width: 200, marginTop: 4 },
});

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

const formatNumber = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

export function InvoicePdfDocument({ invoice }: { invoice: Invoice }) {
  const total = invoiceTotal(invoice);
  const hasBankDetails = invoice.bankName || invoice.accountHolder || invoice.accountNumber || invoice.ifscOrSwift || invoice.upiId;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.row}>
          <Text style={styles.brandName}>{invoice.senderBrandName || "Your Brand"}</Text>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={[styles.muted, { textAlign: "right" }]}># {invoice.invoiceNumber}</Text>
          </View>
        </View>

        <View style={[styles.row, styles.sectionTop]}>
          <View>
            <Text style={styles.label}>Bill To</Text>
            <Text style={styles.bold}>{invoice.companyName}</Text>
            {invoice.billToAddress && <Text style={[styles.muted, { marginTop: 4 }]}>{invoice.billToAddress}</Text>}
          </View>
          <View>
            <View style={[styles.row, { gap: 24 }]}><Text style={styles.muted}>Issue Date</Text><Text>{formatDate(invoice.issueDate)}</Text></View>
            <View style={[styles.row, { gap: 24, marginTop: 2 }]}><Text style={styles.muted}>Due Date</Text><Text>{formatDate(invoice.dueDate)}</Text></View>
            <View style={[styles.row, { gap: 24, marginTop: 2 }]}><Text style={styles.muted}>Currency</Text><Text>{invoice.currency}</Text></View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colDescription, styles.muted]}>Description</Text>
            <Text style={[styles.colNumber, styles.muted]}>Qty</Text>
            <Text style={[styles.colNumber, styles.muted]}>Rate ({invoice.currency})</Text>
            <Text style={[styles.colNumber, styles.muted]}>Amount ({invoice.currency})</Text>
          </View>
          {invoice.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colNumber}>{item.quantity}</Text>
              <Text style={styles.colNumber}>{formatNumber(item.rate)}</Text>
              <Text style={styles.colNumber}>{formatNumber(item.quantity * item.rate)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}><Text style={styles.muted}>Subtotal</Text><Text>{formatNumber(total)}</Text></View>
          <View style={styles.totalsRow}><Text style={styles.bold}>Total ({invoice.currency})</Text><Text style={styles.bold}>{formatNumber(total)}</Text></View>
        </View>

        {hasBankDetails && <View style={styles.sectionTop}>
          <Text style={styles.bold}>Payment Details</Text>
          {invoice.bankName && <Text style={[styles.muted, { marginTop: 2 }]}>Bank: {invoice.bankName}</Text>}
          {invoice.accountHolder && <Text style={styles.muted}>Account Holder: {invoice.accountHolder}</Text>}
          {invoice.accountNumber && <Text style={styles.muted}>Account Number: {invoice.accountNumber}</Text>}
          {invoice.ifscOrSwift && <Text style={styles.muted}>IFSC/SWIFT: {invoice.ifscOrSwift}</Text>}
          {invoice.upiId && <Text style={styles.muted}>UPI ID: {invoice.upiId}</Text>}
        </View>}

        <View style={styles.sectionTop}>
          <Text style={styles.bold}>From</Text>
          <Text style={{ marginTop: 2 }}>{invoice.senderName}</Text>
          {invoice.senderAddress && <Text style={styles.muted}>{invoice.senderAddress}</Text>}
          {invoice.senderEmail && <Text style={styles.muted}>{invoice.senderEmail}</Text>}
        </View>

        {invoice.notes && <View style={styles.sectionTop}>
          <Text style={styles.bold}>Notes</Text>
          <Text style={[styles.muted, { marginTop: 2 }]}>{invoice.notes}</Text>
        </View>}
      </Page>
    </Document>
  );
}
