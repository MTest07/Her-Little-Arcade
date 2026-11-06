import fs from 'fs';
import path from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { getTableColumns, getTableName } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from './schema.ts';

interface PersistentStoreData {
  counters: Record<string, number>;
  tables: Record<string, Record<string, unknown>[]>;
}

declare global {
  var _postgresPool: Pool | undefined;
  var _arcadePersistentStore: PersistentStoreData | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const STORE_FILE_PATH = path.join('/tmp', 'her-little-arcade-db-v2.json');

function reviveRowDates(row: Record<string, unknown>): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...row };
  for (const key of [
    'createdAt',
    'updatedAt',
    'lastSeenAt',
    'heartbeatAt',
    'startsAt',
    'endsAt',
    'completedAt',
    'claimedAt',
  ]) {
    if (typeof copy[key] === 'string') {
      const parsed = new Date(copy[key] as string);
      if (!Number.isNaN(parsed.getTime())) {
        copy[key] = parsed;
      }
    }
  }
  return copy;
}

function getStore(): PersistentStoreData {
  if (global._arcadePersistentStore) {
    return global._arcadePersistentStore;
  }

  let loaded: PersistentStoreData | null = null;
  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const raw = fs.readFileSync(STORE_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as PersistentStoreData;
      if (parsed && parsed.tables && parsed.counters) {
        for (const tName of Object.keys(parsed.tables)) {
          parsed.tables[tName] = (parsed.tables[tName] || []).map(reviveRowDates);
        }
        loaded = parsed;
      }
    }
  } catch {
    loaded = null;
  }

  if (!loaded) {
    loaded = {
      counters: {},
      tables: {},
    };
  }

  global._arcadePersistentStore = loaded;
  return loaded;
}

function persistStore(store: PersistentStoreData) {
  try {
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(store), 'utf8');
  } catch {
    // Ignore read-only filesystem errors; in-memory global store stays authoritative
  }
}

function getColumnMap(table: unknown): {
  sqlToJs: Record<string, string>;
  cols: Record<string, Record<string, unknown>>;
} {
  const cols = getTableColumns(table as Parameters<typeof getTableColumns>[0]) as unknown as Record<
    string,
    Record<string, unknown>
  >;
  const sqlToJs: Record<string, string> = {};
  for (const [jsKey, colDef] of Object.entries(cols)) {
    const sqlName = String(colDef.name || jsKey);
    sqlToJs[sqlName] = jsKey;
    sqlToJs[jsKey] = jsKey;
  }
  return { sqlToJs, cols };
}

function evaluateCondition(
  row: Record<string, unknown>,
  cond: unknown,
  sqlToJs: Record<string, string>
): boolean {
  if (!cond || typeof cond !== 'object') return true;
  const chunks = (cond as { queryChunks?: unknown[] }).queryChunks;
  if (!Array.isArray(chunks) || chunks.length === 0) return true;

  // Parenthesized compound condition: ['(', innerSQL, ')']
  if (
    chunks.length === 3 &&
    (chunks[0] as { value?: string[] })?.value?.[0]?.trim() === '(' &&
    (chunks[2] as { value?: string[] })?.value?.[0]?.trim() === ')'
  ) {
    return evaluateCondition(row, chunks[1], sqlToJs);
  }

  // Binary comparison: ['', Column, ' = ' | ' <> ', Param, '']
  if (
    chunks.length === 5 &&
    chunks[1] &&
    typeof (chunks[1] as { name?: unknown }).name === 'string'
  ) {
    const colSqlName = (chunks[1] as { name: string }).name;
    const jsKey = sqlToJs[colSqlName] || colSqlName;
    const opRaw = String((chunks[2] as { value?: string[] })?.value?.[0] || '=').trim();
    const paramChunk = chunks[3] as { value?: unknown };
    const targetVal =
      paramChunk && typeof paramChunk === 'object' && 'value' in paramChunk
        ? paramChunk.value
        : paramChunk;

    const rowVal = row[jsKey];
    if (opRaw === '=') {
      return rowVal === targetVal;
    }
    if (opRaw === '<>' || opRaw === '!=') {
      return rowVal !== targetVal;
    }
  }

  // Compound sequence: [subCond1, ' and ' | ' or ', subCond2, ...]
  let hasOr = false;
  let hasAnd = false;
  const subConditions: unknown[] = [];

  for (const ch of chunks) {
    const strVal = (ch as { value?: string[] })?.value?.[0];
    if (typeof strVal === 'string') {
      const lower = strVal.toLowerCase();
      if (lower.includes(' or ')) hasOr = true;
      if (lower.includes(' and ')) hasAnd = true;
    } else if (ch && typeof ch === 'object' && 'queryChunks' in ch) {
      subConditions.push(ch);
    }
  }

  if (subConditions.length > 0) {
    if (hasOr && !hasAnd) {
      return subConditions.some((sc) => evaluateCondition(row, sc, sqlToJs));
    }
    return subConditions.every((sc) => evaluateCondition(row, sc, sqlToJs));
  }

  return true;
}

function extractOrderSpecs(
  orderArgs: unknown[],
  sqlToJs: Record<string, string>
): { jsKey: string; direction: 'asc' | 'desc' }[] {
  const specs: { jsKey: string; direction: 'asc' | 'desc' }[] = [];
  for (const arg of orderArgs) {
    if (!arg || typeof arg !== 'object') continue;
    if ('name' in arg && typeof (arg as { name?: unknown }).name === 'string') {
      const colName = (arg as { name: string }).name;
      specs.push({ jsKey: sqlToJs[colName] || colName, direction: 'asc' });
      continue;
    }
    const chunks = (arg as { queryChunks?: unknown[] }).queryChunks;
    if (Array.isArray(chunks)) {
      let colName = '';
      let dir: 'asc' | 'desc' = 'asc';
      for (const ch of chunks) {
        if (ch && typeof ch === 'object' && 'name' in ch && typeof (ch as { name?: unknown }).name === 'string') {
          colName = (ch as { name: string }).name;
        }
        const strVal = (ch as { value?: string[] })?.value?.[0];
        if (typeof strVal === 'string' && strVal.toLowerCase().includes('desc')) {
          dir = 'desc';
        }
      }
      if (colName) {
        specs.push({ jsKey: sqlToJs[colName] || colName, direction: dir });
      }
    }
  }
  return specs;
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  const aTime = a instanceof Date ? a.getTime() : typeof a === 'number' ? a : NaN;
  const bTime = b instanceof Date ? b.getTime() : typeof b === 'number' ? b : NaN;
  if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
    return aTime - bTime;
  }
  return String(a).localeCompare(String(b));
}

function buildRowWithDefaults(
  tableName: string,
  cols: Record<string, Record<string, unknown>>,
  inputValues: Record<string, unknown>,
  store: PersistentStoreData
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  const now = new Date();

  for (const [jsKey, colDef] of Object.entries(cols)) {
    const colType = String(colDef.columnType || '');
    if (inputValues[jsKey] !== undefined) {
      row[jsKey] = inputValues[jsKey];
    } else if (colType === 'PgSerial' || jsKey === 'id') {
      const nextId = (store.counters[tableName] || 0) + 1;
      store.counters[tableName] = nextId;
      row[jsKey] = nextId;
    } else if (colType === 'PgTimestamp') {
      row[jsKey] = now;
    } else if (colDef.hasDefault && colDef.default !== undefined) {
      row[jsKey] = colDef.default;
    } else {
      row[jsKey] = null;
    }
  }

  return row;
}

function createPersistentDrizzleAdapter() {
  return {
    select() {
      return {
        from(table: unknown) {
          const tableName = getTableName(table as Parameters<typeof getTableName>[0]);
          const { sqlToJs } = getColumnMap(table);
          let whereCond: unknown = null;
          let orderArgs: unknown[] = [];
          let limitCount: number | null = null;

          const execute = async () => {
            const store = getStore();
            const rows = store.tables[tableName] || [];
            let result = rows
              .filter((r) => (whereCond ? evaluateCondition(r, whereCond, sqlToJs) : true))
              .map((r) => ({ ...r }));

            if (orderArgs.length > 0) {
              const specs = extractOrderSpecs(orderArgs, sqlToJs);
              result.sort((a, b) => {
                for (const spec of specs) {
                  const cmp = compareValues(a[spec.jsKey], b[spec.jsKey]);
                  if (cmp !== 0) {
                    return spec.direction === 'desc' ? -cmp : cmp;
                  }
                }
                return 0;
              });
            }

            if (limitCount !== null && limitCount >= 0) {
              result = result.slice(0, limitCount);
            }
            return result;
          };

          const builder = {
            where(cond: unknown) {
              whereCond = cond;
              return builder;
            },
            orderBy(...args: unknown[]) {
              orderArgs = args;
              return builder;
            },
            limit(n: number) {
              limitCount = n;
              return builder;
            },
            then<TResult1 = unknown, TResult2 = never>(
              onfulfilled?: ((value: Record<string, unknown>[]) => TResult1 | PromiseLike<TResult1>) | null,
              onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
            ) {
              return execute().then(onfulfilled, onrejected);
            },
          };

          return builder;
        },
      };
    },

    insert(table: unknown) {
      const tableName = getTableName(table as Parameters<typeof getTableName>[0]);
      const { sqlToJs, cols } = getColumnMap(table);

      return {
        values(rawValues: Record<string, unknown> | Record<string, unknown>[]) {
          const valList = Array.isArray(rawValues) ? rawValues : [rawValues];
          let conflictSpec: {
            targetKey: string;
            setValues: Record<string, unknown>;
          } | null = null;

          let executedPromise: Promise<Record<string, unknown>[]> | null = null;

          const execute = async () => {
            const store = getStore();
            if (!store.tables[tableName]) {
              store.tables[tableName] = [];
            }
            const tableRows = store.tables[tableName];
            const outRows: Record<string, unknown>[] = [];

            for (const item of valList) {
              if (conflictSpec) {
                const targetVal = item[conflictSpec.targetKey];
                const existingIdx = tableRows.findIndex(
                  (r) => r[conflictSpec!.targetKey] === targetVal
                );
                if (existingIdx >= 0) {
                  const updatedRow = {
                    ...tableRows[existingIdx],
                    ...conflictSpec.setValues,
                  };
                  tableRows[existingIdx] = updatedRow;
                  outRows.push({ ...updatedRow });
                  continue;
                }
              }

              const newRow = buildRowWithDefaults(tableName, cols, item, store);
              tableRows.push(newRow);
              outRows.push({ ...newRow });
            }

            persistStore(store);
            return outRows;
          };

          const getExecution = () => {
            if (!executedPromise) {
              executedPromise = execute();
            }
            return executedPromise;
          };

          const builder = {
            onConflictDoUpdate(cfg: {
              target: unknown;
              set: Record<string, unknown>;
            }) {
              const targetColName =
                cfg.target &&
                typeof cfg.target === 'object' &&
                'name' in cfg.target &&
                typeof (cfg.target as { name?: unknown }).name === 'string'
                  ? (cfg.target as { name: string }).name
                  : 'uid';
              conflictSpec = {
                targetKey: sqlToJs[targetColName] || targetColName,
                setValues: cfg.set,
              };
              return builder;
            },
            returning() {
              return getExecution();
            },
            then<TResult1 = unknown, TResult2 = never>(
              onfulfilled?: ((value: Record<string, unknown>[]) => TResult1 | PromiseLike<TResult1>) | null,
              onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
            ) {
              return getExecution().then(onfulfilled, onrejected);
            },
          };

          return builder;
        },
      };
    },

    update(table: unknown) {
      const tableName = getTableName(table as Parameters<typeof getTableName>[0]);
      const { sqlToJs } = getColumnMap(table);

      return {
        set(updates: Record<string, unknown>) {
          let whereCond: unknown = null;
          let executedPromise: Promise<Record<string, unknown>[]> | null = null;

          const execute = async () => {
            const store = getStore();
            if (!store.tables[tableName]) {
              store.tables[tableName] = [];
            }
            const tableRows = store.tables[tableName];
            const updatedRows: Record<string, unknown>[] = [];

            const cleanUpdates: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(updates)) {
              if (v !== undefined) {
                cleanUpdates[k] = v;
              }
            }

            for (let i = 0; i < tableRows.length; i++) {
              const row = tableRows[i];
              if (!whereCond || evaluateCondition(row, whereCond, sqlToJs)) {
                const nextRow = { ...row, ...cleanUpdates };
                tableRows[i] = nextRow;
                updatedRows.push({ ...nextRow });
              }
            }

            persistStore(store);
            return updatedRows;
          };

          const getExecution = () => {
            if (!executedPromise) {
              executedPromise = execute();
            }
            return executedPromise;
          };

          const builder = {
            where(cond: unknown) {
              whereCond = cond;
              return builder;
            },
            returning() {
              return getExecution();
            },
            then<TResult1 = unknown, TResult2 = never>(
              onfulfilled?: ((value: Record<string, unknown>[]) => TResult1 | PromiseLike<TResult1>) | null,
              onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
            ) {
              return getExecution().then(onfulfilled, onrejected);
            },
          };

          return builder;
        },
      };
    },
  };
}

export const db = (
  process.env.SQL_HOST
    ? drizzle(createPool(), { schema })
    : createPersistentDrizzleAdapter()
) as unknown as ReturnType<typeof drizzle<typeof schema>>;
