// Restores the Stage D backup (backup4.sql) + Stage C views into the Docker Postgres.
// Usage: npm run db:restore
// Requires: docker compose up -d db  (container name: PostgreSQL_DB)
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONTAINER = 'PostgreSQL_DB';
const DB = process.env.DB_NAME_SECRET || 'fantasy_db';
const USER = process.env.DB_USER_SECRET || 'postgres';
const backup = path.join(root, 'DBProject_4072_3817', 'שלב ד', 'backup4.sql');
const views = path.join(root, 'DBProject_4072_3817', 'שלב ג', 'Views.sql');

const docker = (...args) => execFileSync('docker', args, { stdio: 'inherit' });
const psql = (db, ...args) => docker('exec', CONTAINER, 'psql', '-U', USER, '-d', db, '-v', 'ON_ERROR_STOP=1', '-q', ...args);

console.log(`1/4 copying backup into ${CONTAINER}...`);
docker('cp', backup, `${CONTAINER}:/tmp/backup4.sql`);
docker('cp', views, `${CONTAINER}:/tmp/views.sql`);

console.log(`2/4 recreating database ${DB}...`);
psql('postgres', '-c', `DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`, '-c', `CREATE DATABASE ${DB}`);

console.log('3/4 restoring backup4.sql (this takes ~10-30s)...');
psql(DB, '-f', '/tmp/backup4.sql');

console.log('4/4 creating Stage C views...');
psql(DB, '-f', '/tmp/views.sql');

console.log('done. tables:');
psql(DB, '-c', "SELECT count(*) AS tables FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
