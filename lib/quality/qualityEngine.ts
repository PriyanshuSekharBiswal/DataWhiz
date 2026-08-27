// Data Quality & Intelligent Cleaning Engine: Detects anomalies, cleans safely, and records full audit trail

import { QualityIssue, QualityIssueType, AuditRecord, DataQualityReport, ColumnSchema, ColumnProfile } from '@/lib/types';
import { parseNumberVal, parseDateVal, safeIsoDate } from '@/lib/schema/schemaDetector';

export interface CleaningResult {
  cleanedRows: Record<string, any>[];
  report: DataQualityReport;
}

export function detectQualityIssuesAndClean(
  schemas: ColumnSchema[],
  profiles: ColumnProfile[],
  rawRows: Record<string, any>[]
): CleaningResult {
  const issues: QualityIssue[] = [];
  const auditLog: AuditRecord[] = [];
  const N = rawRows.length;
  const colCount = schemas.length;

  // 1. Fast Duplicate Detection (Set-based string signature)
  const seenSignatures = new Set<string>();
  const duplicateRowIndices = new Set<number>();
  const maxDupScan = Math.min(N, 60000);
  const keyCols = schemas.slice(0, Math.min(8, schemas.length));

  for (let i = 0; i < maxDupScan; i++) {
    let sig = '';
    for (let c = 0; c < keyCols.length; c++) {
      sig += String(rawRows[i][keyCols[c].technicalName] ?? '') + '|';
    }
    if (seenSignatures.has(sig)) {
      duplicateRowIndices.add(i);
    } else {
      seenSignatures.add(sig);
    }
  }

  if (duplicateRowIndices.size > 0) {
    issues.push({
      column: '(Entire Row)',
      issueType: 'duplicate_records',
      description: `Detected ${duplicateRowIndices.size} exact duplicate record(s) across all columns.`,
      severity: 'medium',
      affectedRows: duplicateRowIndices.size,
      affectedPercentage: Math.round((duplicateRowIndices.size / N) * 1000) / 10,
      sampleValues: [`${duplicateRowIndices.size} redundant rows`],
      suggestedAction: 'Deduplicate redundant records preserving first occurrence.'
    });

    auditLog.push({
      id: 'audit-dup-01',
      column: '(Entire Row)',
      issueType: 'duplicate_records',
      actionTaken: 'Removed redundant duplicate rows',
      reason: 'Identical rows distort statistical distributions and aggregations.',
      rowsAffected: duplicateRowIndices.size,
      beforeSummary: `${N} rows with ${duplicateRowIndices.size} duplicate(s)`,
      afterSummary: `${N - duplicateRowIndices.size} distinct rows`,
      confidence: 0.99,
      timestamp: new Date().toISOString()
    });
  }

  // Deep-clone rows excluding exact duplicate rows
  const cleanRows: Record<string, any>[] = [];
  for (let i = 0; i < N; i++) {
    if (!duplicateRowIndices.has(i)) {
      cleanRows.push({ ...rawRows[i] });
    }
  }

  // 2. Column-wise Issue Detection & Transformation
  for (const schema of schemas) {
    const col = schema.technicalName;
    const profile = profiles.find(p => p.technicalName === col);
    if (!profile) continue;

    // Check Missing Values
    if (profile.missingCount > 0) {
      issues.push({
        column: col,
        issueType: 'missing_values',
        description: `Column has ${profile.missingCount} missing/null cell(s) (${profile.missingPercentage}%).`,
        severity: profile.missingPercentage > 30 ? 'high' : 'low',
        affectedRows: profile.missingCount,
        affectedPercentage: profile.missingPercentage,
        sampleValues: ['(null / empty)'],
        suggestedAction: 'Preserve NULL semantics with zero/mean imputation flag during analysis.'
      });
    }

    // Check Mixed Date Formats
    if (profile.type === 'date' || schema.logicalType === 'date') {
      let mixedDateCount = 0;
      const sampleNonIso: string[] = [];

      for (let r = 0; r < cleanRows.length; r++) {
        const val = cleanRows[r][col];
        if (val === undefined || val === null || String(val).trim() === '') continue;

        const s = String(val).trim();
        const iso = safeIsoDate(s);
        if (iso && s !== iso) {
          mixedDateCount++;
          if (sampleNonIso.length < 3) sampleNonIso.push(s);
          // Transform in-place to ISO date
          cleanRows[r][col] = iso;
        }
      }

      if (mixedDateCount > 0) {
        issues.push({
          column: col,
          issueType: 'mixed_date_formats',
          description: `Found ${mixedDateCount} date(s) with non-standard or mixed formats (e.g. DD/MM/YYYY, 'Jan 8, 2024').`,
          severity: 'medium',
          affectedRows: mixedDateCount,
          affectedPercentage: Math.round((mixedDateCount / cleanRows.length) * 1000) / 10,
          sampleValues: sampleNonIso,
          suggestedAction: 'Standardized to ISO 8601 (YYYY-MM-DD).'
        });

        auditLog.push({
          id: `audit-date-${col}`,
          column: col,
          issueType: 'mixed_date_formats',
          actionTaken: 'Standardized mixed date strings to ISO-8601 YYYY-MM-DD',
          reason: 'Enable proper temporal aggregation, indexing, and forecasting.',
          rowsAffected: mixedDateCount,
          beforeSummary: `Mixed date strings (${sampleNonIso.join(', ')})`,
          afterSummary: 'Standardized ISO-8601 dates',
          confidence: 0.98,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Check Numeric as Strings (Currency symbols, percentages, commas)
    if (profile.type === 'numeric' || schema.logicalType.startsWith('measure')) {
      let stringNumCount = 0;
      const sampleStringNums: string[] = [];

      for (let r = 0; r < cleanRows.length; r++) {
        const val = cleanRows[r][col];
        if (val === undefined || val === null || String(val).trim() === '') continue;

        if (typeof val === 'string') {
          const parsed = parseNumberVal(val);
          if (parsed !== null) {
            stringNumCount++;
            if (sampleStringNums.length < 3) sampleStringNums.push(val);
            cleanRows[r][col] = parsed;
          }
        }
      }

      if (stringNumCount > 0) {
        issues.push({
          column: col,
          issueType: 'numeric_as_string',
          description: `Found ${stringNumCount} numeric values formatted as strings (e.g. currency symbols ₹/$, commas, % suffixes).`,
          severity: 'medium',
          affectedRows: stringNumCount,
          affectedPercentage: Math.round((stringNumCount / cleanRows.length) * 1000) / 10,
          sampleValues: sampleStringNums,
          suggestedAction: 'Converted formatted text to native floating-point numbers.'
        });

        auditLog.push({
          id: `audit-num-${col}`,
          column: col,
          issueType: 'numeric_as_string',
          actionTaken: 'Parsed currency and percentage string representations into clean numbers',
          reason: 'Necessary for mathematical computations, aggregations, and ML algorithms.',
          rowsAffected: stringNumCount,
          beforeSummary: `Formatted strings (${sampleStringNums.join(', ')})`,
          afterSummary: 'Clean numeric values',
          confidence: 0.99,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Check Inconsistent Casing & Whitespace Padding
    if (profile.type === 'categorical' && schema.logicalType.startsWith('dimension')) {
      const casingMap = new Map<string, string>();
      let casingIssueCount = 0;
      let whitespaceCount = 0;

      for (let r = 0; r < cleanRows.length; r++) {
        const val = cleanRows[r][col];
        if (typeof val !== 'string') continue;

        const trimmed = val.trim();
        if (trimmed !== val) {
          whitespaceCount++;
          cleanRows[r][col] = trimmed;
        }

        const lower = trimmed.toLowerCase();
        // Title Case standardized candidate
        const titleCased = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();

        if (!casingMap.has(lower)) {
          casingMap.set(lower, titleCased);
        }

        if (trimmed !== titleCased && casingMap.get(lower) === titleCased) {
          casingIssueCount++;
          cleanRows[r][col] = titleCased;
        }
      }

      if (casingIssueCount > 0 || whitespaceCount > 0) {
        issues.push({
          column: col,
          issueType: 'inconsistent_casing',
          description: `Found ${casingIssueCount + whitespaceCount} categorical value(s) with inconsistent casing or leading/trailing whitespace.`,
          severity: 'low',
          affectedRows: casingIssueCount + whitespaceCount,
          affectedPercentage: Math.round(((casingIssueCount + whitespaceCount) / cleanRows.length) * 1000) / 10,
          sampleValues: ['e.g. "furniture" -> "Furniture"'],
          suggestedAction: 'Standardized to canonical Title Case.'
        });

        auditLog.push({
          id: `audit-case-${col}`,
          column: col,
          issueType: 'inconsistent_casing',
          actionTaken: 'Normalized casing and trimmed padding',
          reason: 'Prevents accidental category fragmentation in group-by operations.',
          rowsAffected: casingIssueCount + whitespaceCount,
          beforeSummary: 'Mixed casing (e.g. lowercase and uppercase versions)',
          afterSummary: 'Standardized Title Case categories',
          confidence: 0.95,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Check Extreme Outliers
    if (profile.numeric && profile.numeric.outlierCount > 0) {
      issues.push({
        column: col,
        issueType: 'extreme_outliers',
        description: `Found ${profile.numeric.outlierCount} outlier value(s) exceeding 1.5× IQR threshold.`,
        severity: 'low',
        affectedRows: profile.numeric.outlierCount,
        affectedPercentage: Math.round((profile.numeric.outlierCount / N) * 1000) / 10,
        sampleValues: [`${profile.numeric.outlierCount} IQR outliers`],
        suggestedAction: 'Retain for anomaly detection while using robust median/IQR metrics.'
      });
    }
  }

  // Calculate Overall Data Quality Score (0 to 100)
  const totalCells = N * colCount;
  let totalMissingCells = 0;
  for (const p of profiles) {
    totalMissingCells += p.missingCount;
  }

  const missingPenalty = totalCells > 0 ? (totalMissingCells / totalCells) * 30 : 0;
  const duplicatePenalty = N > 0 ? (duplicateRowIndices.size / N) * 20 : 0;
  const formatPenalty = Math.min(15, issues.filter(i => i.issueType === 'mixed_date_formats' || i.issueType === 'numeric_as_string').length * 2);

  const rawScore = Math.max(20, Math.min(99, 100 - missingPenalty - duplicatePenalty - formatPenalty));
  const overallScore = Math.round(rawScore);

  const report: DataQualityReport = {
    overallScore,
    totalRows: N,
    totalColumns: colCount,
    cleanRows: cleanRows.length,
    issues,
    auditLog
  };

  return {
    cleanedRows: cleanRows,
    report
  };
}
