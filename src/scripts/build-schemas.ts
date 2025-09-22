import fs from 'node:fs/promises';
import path from 'node:path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { schemaMap } from '../schema/zod.js';

async function main() {
  const outputDir = path.resolve('schema/json');
  await fs.mkdir(outputDir, { recursive: true });
  for (const [name, schema] of Object.entries(schemaMap)) {
    const jsonSchema = zodToJsonSchema(schema, name);
    await fs.writeFile(path.join(outputDir, `${name}.schema.json`), JSON.stringify(jsonSchema, null, 2));
  }
  console.log('Schemas written to schema/json');
}

await main();
