import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to database! 🔌✨');

    // tasks 테이블의 컬럼 정보를 조회해요! 🔍
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tasks'
    `);
    
    // 쿼리 결과의 타입을 정의해주면 TypeScript가 좋아해요! ✨
    interface ColumnRow {
      column_name: string;
    }

    console.log('Columns in "tasks" table:');
    (res.rows as ColumnRow[]).forEach(row => console.log(`- ${row.column_name}`));

    console.log('\nInvestigation complete! 🧐✨');
  } catch (err) {
    console.error('❌ Investigation failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
