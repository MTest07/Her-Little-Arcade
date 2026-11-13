import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const sqlHost = process.env.SQL_HOST;
const sqlDatabase = process.env.SQL_DB_NAME;
const sqlAdminUser = process.env.SQL_ADMIN_USER;
const sqlAdminPassword = process.env.SQL_ADMIN_PASSWORD;

if (!sqlHost || !sqlDatabase || !sqlAdminUser || !sqlAdminPassword) {
  throw new Error(
    `Missing required database environment variables: ${[
      !sqlHost && 'SQL_HOST',
      !sqlDatabase && 'SQL_DB_NAME',
      !sqlAdminUser && 'SQL_ADMIN_USER',
      !sqlAdminPassword && 'SQL_ADMIN_PASSWORD',
    ]
      .filter(Boolean)
      .join(', ')}`
  );
}

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    user: sqlAdminUser,
    password: sqlAdminPassword,
    host: sqlHost,
    port: 5432,
    database: sqlDatabase,
    ssl: false,
  },
});
