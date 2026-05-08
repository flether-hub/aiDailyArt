import { getDB, initDB } from './functions/api/_db.js';

async function check() {
  try {
    const db = await getDB();
    await initDB(db);
    const count = await db.prepare('SELECT count(*) as total FROM artworks').get();
    console.log('Total artworks:', count.total);
    const samples = await db.prepare('SELECT title, image_url FROM artworks LIMIT 5').all();
    console.log('Sample URLs:', JSON.stringify(samples, null, 2));
  } catch (e) {
    console.error('Error checking DB:', e);
  }
}

check();
