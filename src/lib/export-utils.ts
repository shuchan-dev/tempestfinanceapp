/**
 * Transaction Export Utilities
 * Supports multiple formats: CSV, JSON, QIF, OFX
 */
import type { TransactionData } from "@/types";
import * as XLSX from "xlsx";

export interface ExportOptions {
  format: "csv" | "json" | "qif" | "ofx";
  dateRange?: {
    from: Date;
    to: Date;
  };
  includeTransfers?: boolean;
}

/**
 * Export transactions to CSV format
 */
export function exportToCSV(
  transactions: TransactionData[],
  fileName: string = "transactions.csv",
): void {
  // CSV header
  const headers = [
    "Date",
    "Type",
    "Category",
    "Account",
    "Description",
    "Amount",
    "Balance",
    "Status",
  ];

  // CSV rows
  const rows = transactions.map((tx) => [
    new Date(tx.date).toLocaleDateString("id-ID"),
    tx.type,
    tx.category?.name || "-",
    tx.account?.name || "-",
    tx.description || "-",
    tx.amount,
    "-", // Balance not tracked per transaction
    tx.isSynced ? "Synced" : "Pending",
  ]);

  // Convert to CSV string
  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains comma
          const str = String(cell);
          return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(","),
    )
    .join("\n");

  // Download
  downloadFile(csv, fileName, "text/csv");
}

/**
 * Export transactions to JSON format
 */
export function exportToJSON(
  transactions: TransactionData[],
  fileName: string = "transactions.json",
): void {
  const json = JSON.stringify(transactions, null, 2);
  downloadFile(json, fileName, "application/json");
}

/**
 * Export transactions to QIF format (Quicken Interchange Format)
 * Compatible with many accounting software
 */
export function exportToQIF(
  transactions: TransactionData[],
  fileName: string = "transactions.qif",
): void {
  let qif = "";

  // Transaction data
  for (const tx of transactions) {
    const date = new Date(tx.date);
    const qifDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`; // M/D/YYYY
    
    qif += "!Type:Bank\n";
    qif += `D${qifDate}\n`; // Date
    qif += `T${tx.type === "EXPENSE" ? "-" : ""}${tx.amount}\n`; // Amount (negative for expenses)
    qif += `P${tx.description || tx.category?.name || "Transaction"}\n`; // Description/Payee
    qif += `L${tx.category?.name || "Uncategorized"}\n`; // Category
    qif += "^\n";
  }

  downloadFile(qif, fileName, "application/x-qif");
}

/**
 * Export transactions to OFX format (Open Financial Exchange)
 * Compatible with most banking and accounting software
 */
export function exportToOFX(
  transactions: TransactionData[],
  fileName: string = "transactions.ofx",
  accountName: string = "Tempest Finance",
): void {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[-:T]/g, "").split(".")[0]; // YYYYMMDDHHMMSS
  const txnList = transactions
    .map((tx) => {
      const txDate = new Date(tx.date)
        .toISOString()
        .split("T")[0]
        .replace(/-/g, "");
      const amount = tx.type === "EXPENSE" ? -tx.amount : tx.amount;
      return `    <STMTTRN>
      <TRNTYPE>${tx.type === "EXPENSE" ? "DEBIT" : "CREDIT"}</TRNTYPE>
      <DTPOSTED>${txDate}</DTPOSTED>
      <TRNAMT>${amount}</TRNAMT>
      <FITID>${tx.id}</FITID>
      <NAME>${tx.category?.name || "Transaction"}</NAME>
      <MEMO>${tx.description || "-"}</MEMO>
    </STMTTRN>`;
    })
    .join("\n");

  const ofx = `OFXHEADER:100
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEFORMAT:NO
NEWFILEFORMAT:YES
<OFX>
<SIGNONMSGSRSV1>
  <SONRS>
    <STATUS>
      <CODE>0
      <SEVERITY>INFO
    </STATUS>
    <DTSERVER>${dateStr}
    <LANGUAGE>ENG
  </SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
  <STMTTRS>
    <CURDEF>IDR
    <BANKTRANLIST>
      <DTSTART>${dateStr}
      <DTEND>${dateStr}
${txnList}
    </BANKTRANLIST>
    <LEDGERBAL>
      <BALAMT>0.00
      <DTASOF>${dateStr}
    </LEDGERBAL>
  </STMTTRS>
</BANKMSGSRSV1>
</OFX>`;

  downloadFile(ofx, fileName, "application/x-ofx");
}

/**
 * Export transactions to true Excel (.xlsx) format using xlsx library
 */
export function exportToExcel(
  transactions: TransactionData[],
  fileName: string = "transactions.xlsx",
): void {
  const data = transactions.map((tx) => ({
    Date: new Date(tx.date).toLocaleDateString("id-ID"),
    Type: tx.type,
    Category: tx.category?.name || "-",
    Account: tx.account?.name || "-",
    Description: tx.description || "-",
    Amount: tx.amount,
    Status: tx.isSynced ? "Synced" : "Pending",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
  
  // Custom column widths
  const wscols = [
    {wch: 12}, // Date
    {wch: 10}, // Type
    {wch: 15}, // Category
    {wch: 15}, // Account
    {wch: 30}, // Description
    {wch: 15}, // Amount
    {wch: 10}, // Status
  ];
  worksheet['!cols'] = wscols;

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper to trigger file download
 */
function downloadFile(
  content: string,
  fileName: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate default export file name with current date
 */
export function getExportFileName(
  format: "csv" | "json" | "qif" | "ofx" | "xlsx",
): string {
  const date = new Date().toLocaleDateString("id-ID").replace(/\//g, "-");
  const ext =
    {
      csv: "csv",
      json: "json",
      qif: "qif",
      ofx: "ofx",
      xlsx: "xlsx",
    }[format] || format;
  return `transactions_${date}.${ext}`;
}
