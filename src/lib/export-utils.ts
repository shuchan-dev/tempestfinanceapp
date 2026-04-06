/**
 * Transaction Export Utilities
 * Supports multiple formats: CSV, JSON, QIF, OFX
 */

import type { TransactionData } from "@/types";

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
    qif += "!Type:Bank\n";
    qif += `^${tx.date.toString()}\n`; // Date
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
 * Export transactions to Excel-compatible format
 * Creates an HTML table that Excel can open and format
 */
export function exportToExcel(
  transactions: TransactionData[],
  fileName: string = "transactions.xls",
): void {
  const tableRows = transactions
    .map(
      (tx) =>
        `<tr>
      <td>${new Date(tx.date).toLocaleDateString("id-ID")}</td>
      <td>${tx.type}</td>
      <td>${tx.category?.name || "-"}</td>
      <td>${tx.account?.name || "-"}</td>
      <td>${tx.description || "-"}</td>
      <td style="text-align: right;">${tx.amount.toLocaleString("id-ID")}</td>
      <td>${tx.isSynced ? "Synced" : "Pending"}</td>
    </tr>`,
    )
    .join("\n");

  const html = `<html>
  <head>
    <meta charset="UTF-8">
    <title>Tempest Finance - Transactions Export</title>
    <style>
      body { font-family: Arial, sans-serif; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #4CAF50; color: white; font-weight: bold; }
      tr:nth-child(even) { background-color: #f2f2f2; }
    </style>
  </head>
  <body>
    <h2>Tempest Finance - Transaction Report</h2>
    <p>Exported on: ${new Date().toLocaleString("id-ID")}</p>
    <p>Total Transactions: ${transactions.length}</p>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Category</th>
          <th>Account</th>
          <th>Description</th>
          <th>Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
${tableRows}
      </tbody>
    </table>
  </body>
</html>`;

  downloadFile(html, fileName, "application/vnd.ms-excel");
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
      xlsx: "xls",
    }[format] || format;
  return `transactions_${date}.${ext}`;
}
