// Relationship Detection Engine: Detects foreign keys, cardinality, overlap, and join explosion risks

import { TableRelationship, TableSpec, AnalyticalViewResult } from '@/lib/types';

export function detectRelationships(tables: TableSpec[]): TableRelationship[] {
  const relationships: TableRelationship[] = [];
  if (tables.length < 2) return relationships;

  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      const t1 = tables[i];
      const t2 = tables[j];

      for (const col1 of t1.columns) {
        for (const col2 of t2.columns) {
          const c1Lower = col1.toLowerCase().replace(/[\s_-]+/g, '');
          const c2Lower = col2.toLowerCase().replace(/[\s_-]+/g, '');

          // Check name similarity
          const isNameMatch = c1Lower === c2Lower || c1Lower.endsWith(c2Lower) || c2Lower.endsWith(c1Lower);
          if (!isNameMatch) continue;

          // Check value overlap
          const vals1 = new Set(t1.rows.map(r => String(r[col1] ?? '').trim()).filter(Boolean));
          const vals2 = new Set(t2.rows.map(r => String(r[col2] ?? '').trim()).filter(Boolean));

          if (vals1.size === 0 || vals2.size === 0) continue;

          let intersectionCount = 0;
          for (const v of vals1) {
            if (vals2.has(v)) intersectionCount++;
          }

          const overlap = intersectionCount / Math.min(vals1.size, vals2.size);
          if (overlap < 0.5) continue;

          // Determine cardinality
          const isT1Unique = vals1.size === t1.rows.length;
          const isT2Unique = vals2.size === t2.rows.length;

          let relationshipType: '1:1' | '1:N' | 'N:1' | 'N:M' = 'N:1';
          if (isT1Unique && isT2Unique) relationshipType = '1:1';
          else if (isT1Unique && !isT2Unique) relationshipType = '1:N';
          else if (!isT1Unique && isT2Unique) relationshipType = 'N:1';
          else relationshipType = 'N:M';

          const joinExplosionRisk = relationshipType === 'N:M';
          const referentialIntegrity = intersectionCount === vals2.size || intersectionCount === vals1.size;

          relationships.push({
            sourceTable: t1.tableName,
            sourceColumn: col1,
            targetTable: t2.tableName,
            targetColumn: col2,
            relationshipType,
            overlapPercentage: Math.round(overlap * 100),
            confidence: Math.round((0.7 + overlap * 0.28) * 100) / 100,
            referentialIntegrity,
            joinExplosionRisk,
            validationNote: `Validated key connection between ${t1.tableName}.${col1} and ${t2.tableName}.${col2} (${relationshipType}).`
          });
        }
      }
    }
  }

  return relationships;
}

/**
 * Builds a unified Analytical View from multiple sheets/tables:
 * 1. Relational Star-Schema Join: When sheets have foreign/primary key relationships
 * 2. Homogeneous Sheet Union: When sheets share >= 60% columns (e.g. 2023, 2024, Region_A, Region_B)
 * 3. Independent Disjoint Fallback: Analyzes primary dataset while exposing multi-table context
 */
export function buildAnalyticalView(tables: TableSpec[]): AnalyticalViewResult {
  if (tables.length === 0) {
    return {
      analyticalRows: [],
      mergedColumns: [],
      relationships: [],
      factTable: '',
      dimensionTables: [],
      joinWarnings: ['No tables provided for analytical view construction.']
    };
  }

  if (tables.length === 1) {
    return {
      analyticalRows: tables[0].rows,
      mergedColumns: tables[0].columns,
      relationships: [],
      factTable: tables[0].tableName,
      dimensionTables: [],
      joinWarnings: []
    };
  }

  const relationships = detectRelationships(tables);

  // --------------------------------------------------------------------------
  // STRATEGY 1: Homogeneous Multi-Sheet Union (e.g. Yearly / Regional Partitions)
  // Check if tables share high column similarity (>= 60% identical columns)
  // --------------------------------------------------------------------------
  const allColSets = tables.map(t => new Set(t.columns.map(c => c.toLowerCase().trim())));
  let isHomogeneousUnion = true;
  const baseColSet = allColSets[0];

  for (let i = 1; i < allColSets.length; i++) {
    const curSet = allColSets[i];
    let sharedCount = 0;
    for (const c of curSet) {
      if (baseColSet.has(c)) sharedCount++;
    }
    const overlapRatio = sharedCount / Math.max(1, Math.min(baseColSet.size, curSet.size));
    if (overlapRatio < 0.6) {
      isHomogeneousUnion = false;
      break;
    }
  }

  if (isHomogeneousUnion) {
    // Vertically combine all partition sheets into 1 unified dataset
    const unionColsSet = new Set<string>();
    for (const t of tables) {
      for (const c of t.columns) unionColsSet.add(c);
    }
    unionColsSet.add('Source_Sheet');
    const mergedColumns = Array.from(unionColsSet);

    const analyticalRows: Record<string, any>[] = [];
    for (const t of tables) {
      for (const r of t.rows) {
        analyticalRows.push({
          ...r,
          Source_Sheet: t.tableName
        });
      }
    }

    return {
      analyticalRows,
      mergedColumns,
      relationships: [],
      factTable: tables[0].tableName,
      dimensionTables: tables.slice(1).map(t => t.tableName),
      joinWarnings: [`Combined ${tables.length} partition sheets (${tables.map(t => `${t.tableName}: ${t.rows.length} rows`).join(', ')}) into 1 unified dataset with 'Source_Sheet' tracking.`]
    };
  }

  // --------------------------------------------------------------------------
  // STRATEGY 2: Relational Star-Schema Join
  // Identify Central Fact Table (Largest row count or named Fact...)
  // --------------------------------------------------------------------------
  let factTable = tables.find(t => /^fact/i.test(t.tableName));
  if (!factTable) {
    factTable = [...tables].sort((a, b) => b.rows.length - a.rows.length)[0];
  }

  const dimensionTables = tables.filter(t => t.tableName !== factTable!.tableName);
  const joinWarnings: string[] = [];

  // Prepare fast lookup indexes for each dimension table
  interface DimensionJoinPlan {
    dimTable: TableSpec;
    factKeyCol: string;
    dimKeyCol: string;
    lookupMap: Map<string, Record<string, any>>;
    colsToMerge: string[];
  }

  const joinPlans: DimensionJoinPlan[] = [];

  for (const dim of dimensionTables) {
    // Find relationship connecting factTable with this dim table
    const rel = relationships.find(r =>
      (r.sourceTable === factTable!.tableName && r.targetTable === dim.tableName) ||
      (r.targetTable === factTable!.tableName && r.sourceTable === dim.tableName)
    );

    let factKey = '';
    let dimKey = '';

    if (rel) {
      if (rel.sourceTable === factTable!.tableName) {
        factKey = rel.sourceColumn;
        dimKey = rel.targetColumn;
      } else {
        factKey = rel.targetColumn;
        dimKey = rel.sourceColumn;
      }
    } else {
      // Heuristic key matching fallback (exact column name match or key match)
      for (const fc of factTable.columns) {
        for (const dc of dim.columns) {
          const fcClean = fc.toLowerCase().replace(/[\s_-]+/g, '');
          const dcClean = dc.toLowerCase().replace(/[\s_-]+/g, '');
          if (fcClean === dcClean || fcClean.endsWith(dcClean) || dcClean.endsWith(fcClean)) {
            // Check if there is actual value overlap
            const fVals = new Set(factTable.rows.slice(0, 500).map(r => String(r[fc] ?? '').trim()).filter(Boolean));
            const dVals = new Set(dim.rows.slice(0, 500).map(r => String(r[dc] ?? '').trim()).filter(Boolean));
            let matchCount = 0;
            for (const v of fVals) {
              if (dVals.has(v)) matchCount++;
            }
            if (matchCount > 0) {
              factKey = fc;
              dimKey = dc;
              break;
            }
          }
        }
        if (factKey) break;
      }
    }

    if (!factKey || !dimKey) {
      joinWarnings.push(`Sheet '${dim.tableName}' has no direct join key with '${factTable.tableName}'. Stored as independent entity.`);
      continue;
    }

    // Build lookup index
    const lookupMap = new Map<string, Record<string, any>>();
    for (const r of dim.rows) {
      const k = String(r[dimKey] ?? '').trim();
      if (k) lookupMap.set(k, r);
    }

    const colsToMerge = dim.columns.filter(c => c.toLowerCase() !== dimKey.toLowerCase() && !factTable!.columns.map(f => f.toLowerCase()).includes(c.toLowerCase()));

    joinPlans.push({
      dimTable: dim,
      factKeyCol: factKey,
      dimKeyCol: dimKey,
      lookupMap,
      colsToMerge
    });
  }

  // --------------------------------------------------------------------------
  // STRATEGY 3: Independent Sheet Fallback (If no joins could be formed)
  // --------------------------------------------------------------------------
  if (joinPlans.length === 0 && relationships.length === 0) {
    return {
      analyticalRows: factTable.rows,
      mergedColumns: factTable.columns,
      relationships: [],
      factTable: factTable.tableName,
      dimensionTables: dimensionTables.map(d => d.tableName),
      joinWarnings: [`Workbook contains ${tables.length} independent sheets without relational keys. Analyzed primary sheet '${factTable.tableName}' (${factTable.rows.length} rows).`]
    };
  }

  // Perform Non-Duplicating Left Join on Fact Table rows
  const analyticalRows: Record<string, any>[] = [];
  const mergedColSet = new Set<string>(factTable.columns);

  for (const plan of joinPlans) {
    for (const c of plan.colsToMerge) {
      mergedColSet.add(c);
    }
  }

  const mergedColumns = Array.from(mergedColSet);

  for (let i = 0; i < factTable.rows.length; i++) {
    const fRow = factTable.rows[i];
    const joinedRow: Record<string, any> = { ...fRow };

    for (const plan of joinPlans) {
      const k = String(fRow[plan.factKeyCol] ?? '').trim();
      const dimRecord = plan.lookupMap.get(k);

      if (dimRecord) {
        for (const col of plan.colsToMerge) {
          joinedRow[col] = dimRecord[col] !== undefined ? dimRecord[col] : null;
        }
      } else {
        for (const col of plan.colsToMerge) {
          joinedRow[col] = null;
        }
      }
    }

    analyticalRows.push(joinedRow);
  }

  return {
    analyticalRows,
    mergedColumns,
    relationships,
    factTable: factTable.tableName,
    dimensionTables: dimensionTables.map(d => d.tableName),
    joinWarnings
  };
}
