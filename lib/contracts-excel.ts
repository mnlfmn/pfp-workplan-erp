import { strToU8, zipSync } from "fflate";

export type ContractExportPayment = {
  sequence: number;
  label: string;
  dueDate: string;
  transferDate: string;
  deliverable: string;
  percentage: number;
  amountMnt: number;
  foreignAmountMinor: number;
  paid: boolean;
  fundingSplit: string;
};

export type ContractExportFunding = {
  budgetLine: string;
  activityCode: string;
  activityTitle: string;
  activityLevel: string;
  amountMnt: number;
  paidMnt: number;
  commitmentMnt: number;
};

export type ContractExportItem = {
  contractNumber: string;
  status: string;
  budgetLine: string;
  activityCode: string;
  activityTitle: string;
  activityLevel: string;
  torName: string;
  providerName: string;
  providerType: string;
  startDate: string;
  endDate: string;
  currency: "MNT" | "USD";
  foreignAmountMinor: number;
  exchangeRateMnt: number;
  amountMnt: number;
  paidMnt: number;
  commitmentMnt: number;
  updatedAt: string;
  updatedBy: string;
  transferredFromYear: number;
  fundingAllocations: ContractExportFunding[];
  payments: ContractExportPayment[];
};

type Options = { year: number; contracts: ContractExportItem[] };

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function column(index: number) {
  let current = index;
  let result = "";
  while (current > 0) {
    current -= 1;
    result = String.fromCharCode(65 + (current % 26)) + result;
    current = Math.floor(current / 26);
  }
  return result;
}

function excelDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000 + 25_569);
}

function textCell(address: string, value: unknown, style = 1) {
  return `<c r="${address}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function numberCell(address: string, value: number, style = 2) {
  return `<c r="${address}" s="${style}" t="n"><v>${Number.isFinite(value) ? value : 0}</v></c>`;
}

function dateCell(address: string, value: string) {
  const serial = excelDate(value);
  return serial === null ? textCell(address, "", 1) : numberCell(address, serial, 3);
}

type SheetCell = {
  type: "text" | "number" | "currency" | "percentage" | "date";
  value: string | number;
};

function sheetXml(headers: string[], rows: SheetCell[][], widths: number[]) {
  const lastRow = Math.max(1, rows.length + 1);
  const lastColumn = column(headers.length);
  const headerCells = headers
    .map((header, index) => textCell(`${column(index + 1)}1`, header, 4))
    .join("");
  const dataRows = rows.map((row, rowIndex) => {
    const cells = row.map((cell, cellIndex) => {
      const address = `${column(cellIndex + 1)}${rowIndex + 2}`;
      if (cell.type === "currency") return numberCell(address, Number(cell.value), 2);
      if (cell.type === "number") return numberCell(address, Number(cell.value), 5);
      if (cell.type === "percentage") return numberCell(address, Number(cell.value), 6);
      if (cell.type === "date") return dateCell(address, String(cell.value));
      return textCell(address, cell.value, 1);
    });
    return `<row r="${rowIndex + 2}" ht="32" customHeight="1">${cells.join("")}</row>`;
  });
  const cols = widths
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  <sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${cols}</cols>
  <sheetData><row r="1" ht="34" customHeight="1">${headerCells}</row>${dataRows.join("")}</sheetData>
  <autoFilter ref="A1:${lastColumn}${lastRow}"/>
  <pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="9"/>
</worksheet>`;
}

const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="4"><numFmt numFmtId="164" formatCode="#,##0 [$₮-mn-MN]"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd"/><numFmt numFmtId="166" formatCode="#,##0.00"/><numFmt numFmtId="167" formatCode="0%"/></numFmts>
  <fonts count="3"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts>
  <fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF4F7F2"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0C3B2D"/></patternFill></fill></fills>
  <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD7DED5"/></left><right style="thin"><color rgb="FFD7DED5"/></right><top style="thin"><color rgb="FFD7DED5"/></top><bottom style="thin"><color rgb="FFD7DED5"/></bottom><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="7">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf>
    <xf numFmtId="165" fontId="0" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="166" fontId="0" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf>
    <xf numFmtId="167" fontId="0" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function workbookFiles(options: Options) {
  const contractHeaders = ["Contract number", "Status", "Budget line", "Workplan code", "Activity / sub-activity", "Level", "Terms of Reference", "Service provider", "Provider type", "Start date", "End date", "Currency", "Signed foreign amount", "Exchange rate MNT", "Contract amount MNT", "Paid expenditure MNT", "Outstanding commitment MNT", "Payments", "Transferred from year", "Last updated", "Updated by"];
  const contractRows = options.contracts.map((item) => [
    { type: "text" as const, value: item.contractNumber }, { type: "text" as const, value: item.status }, { type: "text" as const, value: item.budgetLine }, { type: "text" as const, value: item.activityCode }, { type: "text" as const, value: item.activityTitle }, { type: "text" as const, value: item.activityLevel }, { type: "text" as const, value: item.torName }, { type: "text" as const, value: item.providerName }, { type: "text" as const, value: item.providerType }, { type: "date" as const, value: item.startDate }, { type: "date" as const, value: item.endDate }, { type: "text" as const, value: item.currency }, { type: "number" as const, value: item.foreignAmountMinor / 100 }, { type: "number" as const, value: item.exchangeRateMnt }, { type: "currency" as const, value: item.amountMnt }, { type: "currency" as const, value: item.paidMnt }, { type: "currency" as const, value: item.commitmentMnt }, { type: "number" as const, value: item.payments.length }, { type: "number" as const, value: item.transferredFromYear }, { type: "date" as const, value: item.updatedAt }, { type: "text" as const, value: item.updatedBy },
  ]);
  const paymentHeaders = ["Contract number", "Terms of Reference", "Service provider", "Payment no.", "Payment label", "Due date", "Exact transfer date", "Deliverable", "Share %", "Currency", "Foreign amount", "Amount MNT", "Budget line split", "Payment status"];
  const paymentRows = options.contracts.flatMap((item) => item.payments.map((payment) => [
    { type: "text" as const, value: item.contractNumber }, { type: "text" as const, value: item.torName }, { type: "text" as const, value: item.providerName }, { type: "number" as const, value: payment.sequence }, { type: "text" as const, value: payment.label }, { type: "date" as const, value: payment.dueDate }, { type: "date" as const, value: payment.transferDate }, { type: "text" as const, value: payment.deliverable }, { type: "percentage" as const, value: payment.percentage / 100 }, { type: "text" as const, value: item.currency }, { type: "number" as const, value: payment.foreignAmountMinor / 100 }, { type: "currency" as const, value: payment.amountMnt }, { type: "text" as const, value: payment.fundingSplit }, { type: "text" as const, value: payment.paid ? "Paid" : "Unpaid" },
  ]));
  const fundingHeaders = ["Contract number", "Terms of Reference", "Budget line", "Workplan code", "Activity / sub-activity", "Level", "Contract allocation MNT", "Paid expenditure MNT", "Outstanding commitment MNT"];
  const fundingRows = options.contracts.flatMap((item) => item.fundingAllocations.map((allocation) => [
    { type: "text" as const, value: item.contractNumber }, { type: "text" as const, value: item.torName }, { type: "text" as const, value: allocation.budgetLine }, { type: "text" as const, value: allocation.activityCode }, { type: "text" as const, value: allocation.activityTitle }, { type: "text" as const, value: allocation.activityLevel }, { type: "currency" as const, value: allocation.amountMnt }, { type: "currency" as const, value: allocation.paidMnt }, { type: "currency" as const, value: allocation.commitmentMnt },
  ]));
  const now = new Date().toISOString();
  return {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`),
    "docProps/core.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>PFP ${options.year} Contract Register</dc:title><dc:creator>PFP ERP System</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="CONTRACT REGISTER" sheetId="1" r:id="rId1"/><sheet name="PAYMENT SCHEDULE" sheetId="2" r:id="rId2"/><sheet name="BUDGET LINE ALLOCATION" sheetId="3" r:id="rId3"/></sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "xl/styles.xml": strToU8(styles),
    "xl/worksheets/sheet1.xml": strToU8(sheetXml(contractHeaders, contractRows, [18, 14, 22, 16, 44, 15, 48, 28, 22, 13, 13, 11, 17, 17, 20, 20, 23, 11, 18, 15, 26])),
    "xl/worksheets/sheet2.xml": strToU8(sheetXml(paymentHeaders, paymentRows, [18, 48, 28, 12, 20, 13, 18, 48, 11, 11, 16, 20, 42, 14])),
    "xl/worksheets/sheet3.xml": strToU8(sheetXml(fundingHeaders, fundingRows, [18, 48, 26, 18, 48, 16, 23, 23, 25])),
  };
}

export function downloadContractsExcel(options: Options) {
  const bytes = zipSync(workbookFiles(options), { level: 6 });
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `PFP_Contract_Register_${options.year}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
