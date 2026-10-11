import { strToU8, zipSync } from "fflate";

import type { MelIndicator, MelResult } from "@/components/mel-module";
import { indicatorActivityKeys } from "@/lib/mel-links";
import type { TeamMember } from "@/lib/team-members";

type ActivityOption = { id: string; code?: string; uid?: string; title: string };
type Cell = { type: "text" | "number" | "date" | "percentage"; value: string | number };

type Options = {
  year: number;
  period: MelResult["period"];
  indicators: MelIndicator[];
  results: MelResult[];
  teamMembers: TeamMember[];
  activities: ActivityOption[];
};

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

function textCell(address: string, value: unknown, style = 1) {
  return `<c r="${address}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function numberCell(address: string, value: number, style = 2) {
  return `<c r="${address}" s="${style}" t="n"><v>${Number.isFinite(value) ? value : 0}</v></c>`;
}

function excelDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000 + 25_569);
}

function sheetXml(headers: string[], rows: Cell[][], widths: number[]) {
  const lastRow = Math.max(1, rows.length + 1);
  const lastColumn = column(headers.length);
  const headerCells = headers.map((header, index) => textCell(`${column(index + 1)}1`, header, 4)).join("");
  const dataRows = rows.map((row, rowIndex) => {
    const cells = row.map((cell, cellIndex) => {
      const address = `${column(cellIndex + 1)}${rowIndex + 2}`;
      if (cell.type === "number") return numberCell(address, Number(cell.value), 2);
      if (cell.type === "percentage") return numberCell(address, Number(cell.value), 5);
      if (cell.type === "date") {
        const serial = excelDate(String(cell.value));
        return serial === null ? textCell(address, "") : numberCell(address, serial, 3);
      }
      return textCell(address, cell.value);
    });
    return `<row r="${rowIndex + 2}" ht="30" customHeight="1">${cells.join("")}</row>`;
  });
  const cols = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastColumn}${lastRow}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${cols}</cols><sheetData><row r="1" ht="34" customHeight="1">${headerCells}</row>${dataRows.join("")}</sheetData><autoFilter ref="A1:${lastColumn}${lastRow}"/><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`;
}

const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="0.0%"/></numFmts><fonts count="3"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF4F7F2"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0C3B2D"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD7DED5"/></left><right style="thin"><color rgb="FFD7DED5"/></right><top style="thin"><color rgb="FFD7DED5"/></top><bottom style="thin"><color rgb="FFD7DED5"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf><xf numFmtId="164" fontId="0" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="165" fontId="0" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

function workbookFiles(options: Options) {
  const memberName = (id: string) => options.teamMembers.find((item) => item.id === id)?.name ?? "";
  const activityName = (ids: string) =>
    indicatorActivityKeys(ids)
      .map((id) => options.activities.find((activity) => activity.id === id))
      .filter((item): item is ActivityOption => Boolean(item))
      .map((item) => `${item.code || item.uid} · ${item.title}`)
      .join("; ");
  const indicatorHeaders = ["Code", "Indicator", "Definition", "Unit", "Level", "Frequency", "Goal", "Linked main activities", "Responsible person", "Data source", "Active", "Baseline", "Baseline year", "Annual target", "End target", "Updated at", "Updated by"];
  const indicatorRows: Cell[][] = options.indicators.map((item) => [
    { type: "text", value: item.code }, { type: "text", value: item.name }, { type: "text", value: item.definition }, { type: "text", value: item.unit }, { type: "text", value: item.level }, { type: "text", value: item.reportingFrequency }, { type: "text", value: item.goal }, { type: "text", value: activityName(item.activityKey) }, { type: "text", value: memberName(item.responsibleMemberId) }, { type: "text", value: item.dataSource }, { type: "text", value: item.active ? "Active" : "Inactive" }, { type: "number", value: item.baselineValue ?? 0 }, { type: "number", value: item.baselineYear ?? 0 }, { type: "number", value: item.annualTarget ?? 0 }, { type: "number", value: item.endTarget ?? 0 }, { type: "date", value: item.updatedAt }, { type: "text", value: item.updatedBy },
  ]);
  const resultHeaders = ["Indicator code", "Indicator", "Period", "Target", "Actual", "% achieved", "Delivery status", "Workflow status", "Progress explanation", "Evidence reference", "Entered at", "Entered by", "Updated at", "Updated by", "Submitted at", "Submitted by", "Reviewed at", "Reviewed by", "Approved at", "Approved by", "Review comment"];
  const resultRows: Cell[][] = options.results.map((result) => {
    const indicator = options.indicators.find((item) => item.id === result.indicatorId);
    const target = indicator?.annualTarget ?? null;
    const achieved = target && target !== 0 ? result.actualValue / target : 0;
    const delivery = target === null ? "No target" : achieved >= 0.9 ? "On track" : achieved >= 0.7 ? "Needs attention" : "Off track";
    return [
      { type: "text", value: indicator?.code ?? "" }, { type: "text", value: indicator?.name ?? "" }, { type: "text", value: result.period }, { type: "number", value: target ?? 0 }, { type: "number", value: result.actualValue }, { type: "percentage", value: achieved }, { type: "text", value: delivery }, { type: "text", value: result.workflowStatus }, { type: "text", value: result.note }, { type: "text", value: result.evidenceReference }, { type: "date", value: result.enteredAt }, { type: "text", value: result.enteredBy }, { type: "date", value: result.updatedAt }, { type: "text", value: result.updatedBy }, { type: "date", value: result.submittedAt }, { type: "text", value: result.submittedBy }, { type: "date", value: result.reviewedAt }, { type: "text", value: result.reviewedBy }, { type: "date", value: result.approvedAt }, { type: "text", value: result.approvedBy }, { type: "text", value: result.reviewComment },
    ];
  });
  const now = new Date().toISOString();
  return {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`),
    "docProps/core.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>PFP ${options.year} MEL Indicator Register</dc:title><dc:creator>PFP ERP System</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="INDICATORS" sheetId="1" r:id="rId1"/><sheet name="RESULTS" sheetId="2" r:id="rId2"/></sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "xl/styles.xml": strToU8(styles),
    "xl/worksheets/sheet1.xml": strToU8(sheetXml(indicatorHeaders, indicatorRows, [12, 38, 46, 14, 12, 14, 14, 48, 22, 30, 11, 12, 12, 14, 14, 16, 24])),
    "xl/worksheets/sheet2.xml": strToU8(sheetXml(resultHeaders, resultRows, [14, 38, 10, 12, 12, 12, 16, 16, 45, 38, 16, 24, 16, 24, 16, 24, 16, 24, 16, 24, 40])),
  };
}

export function downloadMelExcel(options: Options) {
  const bytes = zipSync(workbookFiles(options), { level: 6 });
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `PFP_MEL_Indicators_${options.year}_${options.period}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
