import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

async function seed() {
  console.log('Seeding code...');
  await kv.set('classified:HACK75K', 'test@pyvax.xyz', { ex: 30 * 24 * 3600 });
  console.log('✅ Successfully seeded code: HACK75K');
  const check = await kv.get('classified:HACK75K');
  console.log('Verify:', check);
}

seed().catch(console.error);
