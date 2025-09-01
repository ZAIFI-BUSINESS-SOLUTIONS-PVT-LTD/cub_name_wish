import { Pool } from 'pg';

// Database helper module. Reads connection info from environment variables.
// To configure, set DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT in your environment.

let pool: Pool | null = null;

export async function initDB() {
  if (pool) return;
  const connectionString = process.env.DATABASE_URL;
  const hasBasic = !!(process.env.PGHOST || connectionString);
  if (!hasBasic) {
    console.log('Postgres not configured (no PGHOST or DATABASE_URL). DB features disabled.');
    return;
  }

  pool = new Pool({ connectionString });

  try {
    // simple connectivity check
    await pool.query('SELECT 1');

    // create table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS greetings (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        phone VARCHAR(50),
        image_url TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    console.log('Postgres initialized and greetings table ensured.');
  } catch (err) {
    console.error('Failed to initialize Postgres:', err);
    // If init fails, disable pool so app continues to run without DB
    pool = null;
  }
}

export async function saveGreeting(name: string | null, phone: string | null, imageUrl: string) {
  if (!pool) return null;
  try {
    const res = await pool.query(
      `INSERT INTO greetings (name, phone, image_url) VALUES ($1, $2, $3) RETURNING id, created_at`,
      [name || null, phone || null, imageUrl]
    );
    return res.rows[0];
  } catch (err) {
    console.error('Failed to save greeting to DB:', err);
    return null;
  }
}

export default { initDB, saveGreeting };
