import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var __hlaPgPool: Pool | undefined;
}

const pool =
  globalThis.__hlaPgPool ??
  new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__hlaPgPool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
export * from './schema.ts';
