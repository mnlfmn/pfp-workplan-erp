import { strToU8, zipSync } from "fflate";

type ExportStatus =
  | "completed"
  | "in_progress"
  | "delayed"
  | "on_hold"
  | "not_started"
  | "not_reported";

export type WorkplanExportItem = {
  id: string;
  parentId?: string;
  kind: "activity" | "subactivity";
  code: string;
  title: string;
  priority: string;
  goal: string;
  workstream: string;
  progressNote: string;
  owner: string;
  executor: string;
  startDate: string;
  endDate: string;
  status: ExportStatus;
  progress: number;
};

type WorkplanExportOptions = {
  year: number;
  items: WorkplanExportItem[];
};

const statusLabels: Record<ExportStatus, string> = {
  completed: "Дууссан",
  in_progress: "Хийгдэж байгаа",
  delayed: "Хойшилсон",
  on_hold: "Түр зогссон",
  not_started: "Эхлээгүй",
  not_reported: "Мэдээлээгүй",
};

const statusStyles: Record<ExportStatus, number> = {
  completed: 12,
  in_progress: 13,
  delayed: 14,
  on_hold: 15,
  not_started: 16,
  not_reported: 16,
};

function xmlEscape(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index: number) {
  let value = index;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function excelDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const milliseconds = Date.UTC(year, month - 1, day);
  return Math.floor(milliseconds / 86400000 + 25569);
}

function textCell(address: string, value: string, style: number) {
  const safe = xmlEscape(value ?? "");
  return `<c r="${address}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${safe}</t></is></c>`;
}

function numberCell(address: string, value: number, style: number) {
  return `<c r="${address}" s="${style}" t="n"><v>${Number.isFinite(value) ? value : 0}</v></c>`;
}

function blankCell(address: string, style: number) {
  return `<c r="${address}" s="${style}"/>`;
}

function estimateRowHeight(item: WorkplanExportItem) {
  const textLength = Math.max(
    item.title.length,
    item.progressNote.length,
    item.owner.length,
    item.executor.length,
  );
  const base = item.kind === "activity" ? 46 : 36;
  return Math.min(126, Math.max(base, base + Math.ceil(textLength / 150) * 13));
}

function makeDataRow(item: WorkplanExportItem, rowNumber: number, subIndex: number) {
  const isMain = item.kind === "activity";
  const isAlternate = !isMain && subIndex % 2 === 1;
  const textStyle = isMain ? 3 : isAlternate ? 5 : 4;
  const hiddenStyle = isMain ? 18 : isAlternate ? 19 : 17;
  const dateStyle = isMain ? 6 : isAlternate ? 8 : 7;
  const percentStyle = isMain ? 9 : isAlternate ? 11 : 10;
  const cells: string[] = [];

  const hiddenValues = [
    item.id,
    isMain ? "Main Activity" : "Sub-activity",
    item.parentId ?? "",
    item.priority,
    item.goal,
    item.workstream,
  ];
  hiddenValues.forEach((value, index) => {
    cells.push(textCell(`${columnName(index + 1)}${rowNumber}`, value, hiddenStyle));
  });

  cells.push(textCell(`G${rowNumber}`, item.code, textStyle));
  cells.push(textCell(`H${rowNumber}`, item.title, textStyle));
  cells.push(textCell(`I${rowNumber}`, item.progressNote, textStyle));
  cells.push(textCell(`J${rowNumber}`, item.owner, textStyle));
  cells.push(textCell(`K${rowNumber}`, item.executor, textStyle));

  const start = excelDate(item.startDate);
  const end = excelDate(item.endDate);
  cells.push(start === null ? blankCell(`L${rowNumber}`, dateStyle) : numberCell(`L${rowNumber}`, start, dateStyle));
  cells.push(end === null ? blankCell(`M${rowNumber}`, dateStyle) : numberCell(`M${rowNumber}`, end, dateStyle));
  cells.push(textCell(`N${rowNumber}`, statusLabels[item.status], statusStyles[item.status]));
  cells.push(numberCell(`O${rowNumber}`, Math.max(0, Math.min(100, item.progress)) / 100, percentStyle));

  return `<row r="${rowNumber}" ht="${estimateRowHeight(item)}" customHeight="1"${isMain ? "" : ' outlineLevel="1"'}>${cells.join("")}</row>`;
}

function worksheetXml({ year, items }: WorkplanExportOptions) {
  const title = `Өнө Мөнхийн Монгол БХБСХ-ийн ${year} оны ажлын төлөвлөгөөний гүйцэтгэл`;
  const headers = [
    "UID",
    "Level",
    "Parent_UID",
    "Ач холбогдол",
    "Зорилго",
    "Ажлын чиглэл",
    "No.",
    "Хэрэгжүүлэх арга хэмжээ",
    "Гүйцэтгэлийн шинэчлэл, тэмдэглэл",
    "Хариуцаж буй ажилтан",
    "Гүйцэтгэгч",
    "Эхлэх хугацаа",
    "Дуусах хугацаа",
    "Статус",
    "Гүйцэтгэл %",
  ];

  const titleCells = Array.from({ length: 15 }, (_, index) => {
    const address = `${columnName(index + 1)}1`;
    return index === 6 ? textCell(address, title, 1) : blankCell(address, 1);
  }).join("");
  const headerCells = headers
    .map((header, index) => textCell(`${columnName(index + 1)}3`, header, 2))
    .join("");

  let subIndex = 0;
  const dataRows = items.map((item, index) => {
    if (item.kind === "activity") subIndex = 0;
    else subIndex += 1;
    return makeDataRow(item, index + 4, subIndex);
  });
  const lastRow = Math.max(3, items.length + 3);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetPr><outlinePr summaryBelow="1" summaryRight="1"/></sheetPr>
  <dimension ref="A1:O${lastRow}"/>
  <sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="3" topLeftCell="G4" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="G4" sqref="G4"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18" outlineLevelRow="1"/>
  <cols>
    <col min="1" max="1" width="16" hidden="1" customWidth="1"/>
    <col min="2" max="2" width="18" hidden="1" customWidth="1"/>
    <col min="3" max="3" width="18" hidden="1" customWidth="1"/>
    <col min="4" max="4" width="14" hidden="1" customWidth="1"/>
    <col min="5" max="5" width="14" hidden="1" customWidth="1"/>
    <col min="6" max="6" width="24" hidden="1" customWidth="1"/>
    <col min="7" max="7" width="14" customWidth="1"/>
    <col min="8" max="8" width="52" customWidth="1"/>
    <col min="9" max="9" width="66" customWidth="1"/>
    <col min="10" max="10" width="24" customWidth="1"/>
    <col min="11" max="11" width="24" customWidth="1"/>
    <col min="12" max="13" width="14" customWidth="1"/>
    <col min="14" max="14" width="18" customWidth="1"/>
    <col min="15" max="15" width="13" customWidth="1"/>
  </cols>
  <sheetData>
    <row r="1" ht="28" customHeight="1">${titleCells}</row>
    <row r="2" ht="8" customHeight="1"/>
    <row r="3" ht="62" customHeight="1">${headerCells}</row>
    ${dataRows.join("\n    ")}
  </sheetData>
  <autoFilter ref="G3:O${lastRow}"/>
  <mergeCells count="1"><mergeCell ref="G1:O1"/></mergeCells>
  <pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="9"/>
</worksheet>`;
}

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2"><numFmt numFmtId="164" formatCode="m/d/yy"/><numFmt numFmtId="165" formatCode="0%"/></numFmts>
  <fonts count="3">
    <font><sz val="10"/><name val="Arial"/><family val="2"/></font>
    <font><b/><sz val="10"/><name val="Arial"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/><family val="2"/></font>
  </fonts>
  <fills count="8">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF092F68"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD9EAF2"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE7E6E6"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFC6EFCE"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFE699"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF4CCCC"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FF7F8C8D"/></left><right style="thin"><color rgb="FF7F8C8D"/></right><top style="thin"><color rgb="FF7F8C8D"/></top><bottom style="thin"><color rgb="FF7F8C8D"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="20">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="1" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="165" fontId="1" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;

function workbookFiles(options: WorkplanExportOptions) {
  const now = new Date().toISOString();
  return {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`),
    "docProps/app.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>PFP Workplan Monitor</Application><AppVersion>1.0</AppVersion></Properties>`),
    "docProps/core.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>PFP ${options.year} Workplan Progress</dc:title><dc:creator>PFP Workplan Monitor</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr date1904="0"/><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews><sheets><sheet name="WORKPLAN PROGRESS" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029"/></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "xl/styles.xml": strToU8(stylesXml),
    "xl/worksheets/sheet1.xml": strToU8(worksheetXml(options)),
  };
}

export function createWorkplanExcelBlob(options: WorkplanExportOptions) {
  const bytes = zipSync(workbookFiles(options), { level: 6 });
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function downloadWorkplanExcel(options: WorkplanExportOptions) {
  const blob = createWorkplanExcelBlob(options);
  const generatedDate = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const fileName = `PFP_Workplan_Progress_${options.year}_${generatedDate}.xlsx`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
