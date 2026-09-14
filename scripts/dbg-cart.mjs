import { Pool } from 'pg';
const p = new Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await p.query('select "items"::text as items from "Cart" where char_length("items"::text) < 600');
console.log(rows.map(r=>JSON.parse(r.items).map(i=>({n:i.name, v:i.variantLabel, vid:i.variantId}))));
await p.end();
