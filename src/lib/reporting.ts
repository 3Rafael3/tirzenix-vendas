import type { Settings } from "@/lib/types";

export type ReportCell = string | number;

export interface ReportSheet {
  name: string;
  columns: string[];
  rows: ReportCell[][];
}

export interface ReportSummaryCard {
  label: string;
  value: string;
  tone?: "gold" | "silver" | "emerald" | "rose";
}

export interface PdfReportPayload {
  title: string;
  subtitle: string;
  generatedAt: string;
  settings: Settings;
  summary: ReportSummaryCard[];
  sheets: ReportSheet[];
  insights?: string[];
}

const XML_NS =
  'xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40"';

function xmlEscape(value: ReportCell) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sheetName(name: string) {
  return name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Relatorio";
}

function cellType(value: ReportCell) {
  return typeof value === "number" && Number.isFinite(value) ? "Number" : "String";
}

function rowXml(cells: ReportCell[], style = "Data") {
  return `<Row>${cells
    .map(
      (cell) =>
        `<Cell ss:StyleID="${style}"><Data ss:Type="${cellType(cell)}">${xmlEscape(
          cell
        )}</Data></Cell>`
    )
    .join("")}</Row>`;
}

export function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportExcelWorkbook(filename: string, sheets: ReportSheet[]) {
  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook ${XML_NS}>
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Author>Tirzenix</Author>
    <Created>${new Date().toISOString()}</Created>
  </DocumentProperties>
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Aptos" ss:Size="11" ss:Color="#1f2937"/>
    </Style>
    <Style ss:ID="Title">
      <Font ss:FontName="Aptos Display" ss:Size="18" ss:Bold="1" ss:Color="#7A5530"/>
    </Style>
    <Style ss:ID="Header">
      <Interior ss:Color="#16161D" ss:Pattern="Solid"/>
      <Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#FBE6B6"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D4A574"/>
      </Borders>
    </Style>
    <Style ss:ID="Data">
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E7E5E4"/>
      </Borders>
    </Style>
  </Styles>
  ${sheets
    .map(
      (sheet) => `<Worksheet ss:Name="${xmlEscape(sheetName(sheet.name))}">
    <Table>
      ${sheet.columns
        .map((column) => {
          const width = Math.min(Math.max(column.length * 7 + 24, 90), 190);
          return `<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`;
        })
        .join("")}
      ${rowXml([sheet.name], "Title")}
      <Row/>
      ${rowXml(sheet.columns, "Header")}
      ${sheet.rows.map((row) => rowXml(row)).join("")}
    </Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <FreezePanes/>
      <FrozenNoSplit/>
      <SplitHorizontal>3</SplitHorizontal>
      <TopRowBottomPane>3</TopRowBottomPane>
      <ActivePane>2</ActivePane>
    </WorksheetOptions>
  </Worksheet>`
    )
    .join("")}
</Workbook>`;

  downloadBlob(
    "\ufeff" + workbook,
    filename.endsWith(".xls") ? filename : `${filename}.xls`,
    "application/vnd.ms-excel;charset=utf-8"
  );
}

function summaryTone(tone: ReportSummaryCard["tone"]) {
  if (tone === "emerald") return "#34d399";
  if (tone === "rose") return "#fda4af";
  if (tone === "silver") return "#e5e7eb";
  return "#fbe6b6";
}

function chunkRows(rows: ReportCell[][], columnCount: number) {
  const rowsPerPage = columnCount >= 16 ? 10 : columnCount >= 12 ? 14 : columnCount >= 8 ? 18 : 24;
  const chunks: ReportCell[][][] = [];
  for (let i = 0; i < rows.length; i += rowsPerPage) {
    chunks.push(rows.slice(i, i + rowsPerPage));
  }
  return chunks.length ? chunks : [[]];
}

function tableDensity(columnCount: number) {
  if (columnCount >= 16) return "density-ultra";
  if (columnCount >= 12) return "density-dense";
  if (columnCount >= 8) return "density-compact";
  return "density-normal";
}

function statCard(card: ReportSummaryCard) {
  return `<div class="metric-card">
    <div class="metric-label">${htmlEscape(card.label)}</div>
    <div class="metric-value" style="color:${summaryTone(card.tone)}">${htmlEscape(card.value)}</div>
  </div>`;
}

function renderTable(sheet: ReportSheet, rows: ReportCell[][]) {
  return `<div class="table-wrap ${tableDensity(sheet.columns.length)}">
    <table>
      <thead><tr>${sheet.columns.map((c) => `<th>${htmlEscape(c)}</th>`).join("")}</tr></thead>
      <tbody>${rows
        .map(
          (row) =>
            `<tr>${sheet.columns
              .map((_, index) => `<td>${htmlEscape(String(row[index] ?? ""))}</td>`)
              .join("")}</tr>`
        )
        .join("")}</tbody>
    </table>
  </div>`;
}

export function openPdfReport(payload: PdfReportPayload) {
  const { settings, title, subtitle, generatedAt, summary, sheets, insights } = payload;
  const logo = settings.brand.logo
    ? `<img class="logo-img" src="${settings.brand.logo}" alt="${htmlEscape(settings.brand.name)}" />`
    : `<div class="logo-fallback">${htmlEscape(settings.brand.name.slice(0, 2).toUpperCase())}</div>`;
  const pages: string[] = [];

  const pageHeader = (eyebrow: string, pageTitle: string, pageSubtitle = subtitle) => `
    <header class="report-header">
      <div class="brand">
        ${logo}
        <div>
          <div class="brand-title">${htmlEscape(settings.brand.name)}</div>
          <div class="brand-sub">${htmlEscape(settings.brand.tagline || "Controle de vendas")}</div>
        </div>
      </div>
      <div class="meta">
        <span>${htmlEscape(eyebrow)}</span>
        <strong>${htmlEscape(generatedAt)}</strong>
      </div>
    </header>
    <section class="title-block">
      <div>
        <p class="eyebrow">${htmlEscape(eyebrow)}</p>
        <h1>${htmlEscape(pageTitle)}</h1>
        <p class="subtitle">${htmlEscape(pageSubtitle)}</p>
      </div>
    </section>`;

  pages.push(`
    <section class="pdf-page cover-page">
      ${pageHeader("Resumo executivo", title)}
      <div class="metrics-grid">${summary.map(statCard).join("")}</div>
      ${
        insights?.length
          ? `<div class="insight-grid">${insights
              .map((insight) => `<div class="insight">${htmlEscape(insight)}</div>`)
              .join("")}</div>`
          : ""
      }
      <div class="executive-band">
        <div>
          <span>Relatório SaaS</span>
          <strong>Dados consolidados para decisão</strong>
        </div>
        <div>
          <span>Conteúdo</span>
          <strong>${sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0)} registros · ${sheets.length} seção(ões)</strong>
        </div>
      </div>
      <footer class="page-footer">
        <span>${htmlEscape(settings.brand.name)} · relatório profissional</span>
        <span>Página 1</span>
      </footer>
    </section>`);

  let pageNumber = 2;
  sheets.forEach((sheet) => {
    const chunks = chunkRows(sheet.rows, sheet.columns.length);
    chunks.forEach((rows, index) => {
      pages.push(`
        <section class="pdf-page data-page">
          ${pageHeader(
            index === 0 ? "Dados detalhados" : "Continuação",
            sheet.name,
            `${subtitle} · ${sheet.rows.length} registro(s)`
          )}
          ${renderTable(sheet, rows)}
          <footer class="page-footer">
            <span>${htmlEscape(sheet.name)}${chunks.length > 1 ? ` · bloco ${index + 1}/${chunks.length}` : ""}</span>
            <span>Página ${pageNumber}</span>
          </footer>
        </section>`);
      pageNumber += 1;
    });
  });

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${htmlEscape(title)}</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; }
    html { background: #07070a; }
    body {
      margin: 0;
      color: #f7f1e8;
      background: #07070a;
      font-family: Inter, Aptos, Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pdf-page {
      width: 297mm;
      height: 210mm;
      padding: 9mm 10mm 8mm;
      overflow: hidden;
      position: relative;
      background:
        radial-gradient(circle at 8% 0%, rgba(212,165,116,.18), transparent 34%),
        radial-gradient(circle at 92% 8%, rgba(52,211,153,.08), transparent 30%),
        linear-gradient(135deg, #121018 0%, #07070a 58%, #0b0907 100%);
      page-break-after: always;
      box-shadow: inset 0 0 0 1px rgba(212,165,116,.18);
    }
    .pdf-page::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image: linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.014) 1px, transparent 1px);
      background-size: 18px 18px;
      opacity: .55;
    }
    .pdf-page > * { position: relative; z-index: 1; }
    .report-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; border-bottom: 1px solid rgba(212,165,116,.32); padding-bottom: 8px; }
    .brand { display: flex; align-items: center; gap: 14px; }
    .logo-img, .logo-fallback { width: 42px; height: 42px; border-radius: 999px; object-fit: cover; border: 1px solid rgba(212,165,116,.48); background: #0a0a0d; display: grid; place-items: center; color: #fbe6b6; font-weight: 800; font-size: 12px; }
    .brand-title { color: #fbe6b6; font-size: 14px; font-weight: 800; letter-spacing: .04em; }
    .brand-sub { color: #b9b3aa; font-size: 8.5px; margin-top: 2px; }
    .meta { color: #a8a29e; font-size: 8.5px; text-align: right; display: grid; gap: 2px; }
    .meta strong { color: #d6d3d1; }
    .title-block { margin: 9px 0 9px; display: flex; justify-content: space-between; gap: 16px; }
    .eyebrow { margin: 0 0 3px; color: #d4a574; font-size: 8px; text-transform: uppercase; letter-spacing: .18em; font-weight: 800; }
    h1 { margin: 0; font-size: 21px; line-height: 1.05; color: #fffaf0; letter-spacing: -.02em; }
    .subtitle { margin: 3px 0 0; color: #b9b3aa; font-size: 9.2px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 11px 0; }
    .metric-card { min-height: 25mm; border: 1px solid rgba(212,165,116,.24); background: rgba(16,16,22,.82); border-radius: 9px; padding: 9px 10px; }
    .metric-label { color: #a8a29e; font-size: 7.5px; text-transform: uppercase; letter-spacing: .14em; font-weight: 800; }
    .metric-value { margin-top: 8px; font-size: 21px; line-height: 1; font-weight: 900; font-variant-numeric: tabular-nums; }
    .insight-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 7px; margin: 10px 0; }
    .insight { border-left: 3px solid #d4a574; background: rgba(212,165,116,.09); padding: 8px 10px; color: #ddd6cc; font-size: 9.2px; line-height: 1.35; border-radius: 0 7px 7px 0; }
    .executive-band { margin-top: 11px; min-height: 38mm; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; align-items: stretch; }
    .executive-band > div { border: 1px solid rgba(212,165,116,.22); border-radius: 12px; background: linear-gradient(135deg, rgba(212,165,116,.12), rgba(255,255,255,.025)); padding: 14px; display: flex; flex-direction: column; justify-content: center; }
    .executive-band span { color: #a8a29e; font-size: 8px; text-transform: uppercase; letter-spacing: .16em; font-weight: 800; }
    .executive-band strong { color: #fffaf0; font-size: 18px; margin-top: 7px; }
    .table-wrap { border: 1px solid rgba(212,165,116,.26); border-radius: 9px; overflow: hidden; background: rgba(7,7,10,.86); }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; color: #ece7de; }
    th { background: #141219; color: #fbe6b6; text-transform: uppercase; letter-spacing: .06em; text-align: left; border-bottom: 1px solid rgba(212,165,116,.52); vertical-align: middle; overflow-wrap: anywhere; }
    td { border-bottom: 1px solid rgba(212,165,116,.13); vertical-align: top; color: #e7e5e4; overflow-wrap: anywhere; word-break: break-word; }
    tr:nth-child(even) td { background: rgba(255,255,255,.035); }
    .density-normal th, .density-normal td { font-size: 8.4px; padding: 6px 7px; line-height: 1.25; }
    .density-compact th, .density-compact td { font-size: 7.2px; padding: 5px 5px; line-height: 1.18; }
    .density-dense th, .density-dense td { font-size: 6.15px; padding: 4px 4px; line-height: 1.12; }
    .density-ultra th, .density-ultra td { font-size: 5.25px; padding: 3px 3px; line-height: 1.08; letter-spacing: 0; }
    .page-footer { position: absolute; left: 10mm; right: 10mm; bottom: 6mm; color: #8b857d; font-size: 8px; display: flex; justify-content: space-between; border-top: 1px solid rgba(212,165,116,.22); padding-top: 5px; }
    @media print {
      html, body { width: 297mm; min-height: 210mm; background: #07070a !important; }
      .pdf-page { width: 297mm; height: 210mm; break-after: page; page-break-after: always; }
      .pdf-page:last-child { break-after: auto; page-break-after: auto; }
      .no-print { display: none !important; }
      table, tr, td, th { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${pages.join("")}
  <script>
    window.addEventListener("load", () => setTimeout(() => window.print(), 250));
  </script>
</body>
</html>`;

  const reportWindow = window.open("", "_blank", "width=1100,height=820");
  if (!reportWindow) return false;
  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
  return true;
}
