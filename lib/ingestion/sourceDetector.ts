// Source Detection Engine: Detects file type, structure, encoding, delimiter, sheets, and integrity

import { SourceMetadata, TableSpec } from '@/lib/types';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export function detectSource(file: File | { name: string; size: number; content?: string | ArrayBuffer }): SourceMetadata {
  const fileName = file.name;
  const fileSize = file.size;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const warnings: string[] = [];

  let sourceType: 'csv' | 'xlsx' | 'json' | 'parquet' = 'csv';
  let mimeType = 'text/csv';

  if (ext === 'xlsx' || ext === 'xls') {
    sourceType = 'xlsx';
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else if (ext === 'csv' || ext === 'txt') {
    sourceType = 'csv';
    mimeType = 'text/csv';
  } else if (ext === 'json') {
    sourceType = 'json';
    mimeType = 'application/json';
    warnings.push('JSON source will be parsed into flat tabular representation.');
  }

  return {
    sourceType,
    fileName,
    fileSize,
    mimeType,
    rowCount: 0,
    colCount: 0,
    hasHeader: true,
    warnings,
    status: 'valid'
  };
}

export interface IngestResult {
  metadata: SourceMetadata;
  rows: Record<string, any>[];
  columns: string[];
  rawContent: string;
  sheets?: { name: string; rowCount: number; colCount: number }[];
}

export function parseCSVString(csvContent: string, fileName: string = 'data.csv'): IngestResult {
  const trimmed = csvContent.trim();
  if (!trimmed) {
    throw new Error('The provided CSV content is empty.');
  }

  // Detect delimiter
  const firstLines = trimmed.split('\n').slice(0, 5).join('\n');
  const delimiters = [',', ';', '\t', '|'];
  let bestDelimiter = ',';
  let maxCols = 0;

  for (const d of delimiters) {
    const testParse = Papa.parse(firstLines, { delimiter: d });
    if (testParse.data && testParse.data[0]) {
      const colCount = (testParse.data[0] as string[]).length;
      if (colCount > maxCols) {
        maxCols = colCount;
        bestDelimiter = d;
      }
    }
  }

  const parseResult = Papa.parse(trimmed, {
    header: true,
    delimiter: bestDelimiter,
    skipEmptyLines: 'greedy',
    dynamicTyping: false
  });

  const rawRows = (parseResult.data || []) as Record<string, any>[];
  let columns = (parseResult.meta.fields || []).map(c => String(c || '').trim()).filter(Boolean);

  // If no fields found in header, infer columns from first data row or fallback
  if (columns.length === 0 && rawRows.length > 0) {
    columns = Object.keys(rawRows[0]).filter(Boolean);
  }
  if (columns.length === 0) {
    columns = ['Column_1'];
  }

  const firstCol = columns[0];
  const cleanRows = rawRows.filter(r => r && (r[firstCol] !== undefined && r[firstCol] !== null && String(r[firstCol]).trim() !== ''));

  const finalRows = cleanRows.length > 0 ? cleanRows : (rawRows.length > 0 ? rawRows : [{ [columns[0]]: 'Sample' }]);

  const metadata: SourceMetadata = {
    sourceType: 'csv',
    fileName,
    fileSize: csvContent.length,
    mimeType: 'text/csv',
    rowCount: finalRows.length,
    colCount: columns.length,
    delimiter: bestDelimiter,
    encoding: 'UTF-8',
    hasHeader: true,
    warnings: parseResult.errors.map(e => `Row ${e.row}: ${e.message}`),
    status: parseResult.errors.length > 5 ? 'warning' : 'valid'
  };

  return {
    metadata,
    rows: finalRows,
    columns,
    rawContent: csvContent
  };
}

export interface IngestResult {
  metadata: SourceMetadata;
  rows: Record<string, any>[];
  columns: string[];
  rawContent: string;
  sheets?: { name: string; rowCount: number; colCount: number }[];
  tables?: TableSpec[];
}

export function parseExcelBuffer(buffer: ArrayBuffer, fileName: string = 'workbook.xlsx'): IngestResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames || [];

  if (!sheetNames.length) {
    throw new Error('Excel workbook contains no sheets.');
  }

  const sheetsInfo: { name: string; rowCount: number; colCount: number }[] = [];
  const parsedTables: TableSpec[] = [];

  for (const name of sheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;

    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { raw: false, defval: '' });
    const colSet = new Set<string>();

    // Decode rows and sanitize field names
    const sanitizedRows = rawRows.map(r => {
      const cleanRow: Record<string, any> = {};
      for (const [k, v] of Object.entries(r)) {
        const cleanKey = String(k || '').trim();
        if (!cleanKey) continue;
        colSet.add(cleanKey);

        // Check if value is an Excel serial number in a date-named column
        if (typeof v === 'number' && /^(date|launchdate|opendate|created|timestamp)$/i.test(cleanKey) && v >= 25000 && v <= 70000) {
          const jsDate = new Date((v - 25569) * 86400 * 1000);
          cleanRow[cleanKey] = jsDate.toISOString().split('T')[0];
        } else if (typeof v === 'string' && /^\d{5}$/.test(v) && /^(date|launchdate|opendate|created|timestamp)$/i.test(cleanKey)) {
          const numV = parseInt(v, 10);
          if (numV >= 25000 && numV <= 70000) {
            const jsDate = new Date((numV - 25569) * 86400 * 1000);
            cleanRow[cleanKey] = jsDate.toISOString().split('T')[0];
          } else {
            cleanRow[cleanKey] = v;
          }
        } else {
          cleanRow[cleanKey] = v;
        }
      }
      return cleanRow;
    });

    const columns = Array.from(colSet);
    sheetsInfo.push({ name, rowCount: sanitizedRows.length, colCount: columns.length });

    if (sanitizedRows.length > 0 && columns.length > 0) {
      parsedTables.push({
        tableName: name,
        columns,
        rows: sanitizedRows
      });
    }
  }

  // Choose the primary/fact table (highest row count or sheet named Fact...)
  let activeTable = parsedTables[0];
  if (parsedTables.length > 1) {
    const factMatch = parsedTables.find(t => /^fact/i.test(t.tableName));
    if (factMatch) {
      activeTable = factMatch;
    } else {
      activeTable = [...parsedTables].sort((a, b) => b.rows.length - a.rows.length)[0];
    }
  }

  const defaultRows = activeTable ? activeTable.rows : [{ Column_1: 'Sample' }];
  const defaultCols = activeTable ? activeTable.columns : ['Column_1'];
  const activeSheetName = activeTable ? activeTable.tableName : sheetNames[0];

  const activeSheet = workbook.Sheets[activeSheetName] || workbook.Sheets[sheetNames[0]];
  const csvRepresentation = activeSheet ? XLSX.utils.sheet_to_csv(activeSheet) : '';

  const metadata: SourceMetadata = {
    sourceType: 'xlsx',
    fileName,
    fileSize: buffer.byteLength,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sheets: sheetNames,
    activeSheet: activeSheetName,
    tables: parsedTables,
    rowCount: defaultRows.length,
    colCount: defaultCols.length,
    hasHeader: true,
    warnings: sheetNames.length > 1 ? [`Workbook contains ${sheetNames.length} sheets (${parsedTables.map(t => `${t.tableName}: ${t.rows.length} rows`).join(', ')}).`] : [],
    status: 'valid'
  };

  return {
    metadata,
    rows: defaultRows,
    columns: defaultCols,
    rawContent: csvRepresentation,
    sheets: sheetsInfo,
    tables: parsedTables
  };
}
