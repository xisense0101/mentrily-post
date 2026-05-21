import fs from 'fs';

const files = ['.env.example', '.env.staging.example', '.env.production.example'];

function parseStructure(content) {
  const lines = content.split('\n');
  const structure = [];

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('#')) {
      structure.push({ type: 'header', value: line });
    } else if (line.includes('=')) {
      const key = line.split('=')[0].trim();
      if (key) {
        structure.push({ type: 'key', value: key });
      }
    }
  }
  return structure;
}

function verify() {
  const baseFile = files[0];
  const baseContent = fs.readFileSync(baseFile, 'utf8');
  const baseStructure = parseStructure(baseContent);

  let hasError = false;

  for (let i = 1; i < files.length; i++) {
    const targetFile = files[i];
    const targetContent = fs.readFileSync(targetFile, 'utf8');
    const targetStructure = parseStructure(targetContent);

    if (baseStructure.length !== targetStructure.length) {
      console.error(
        `Error: ${targetFile} has ${targetStructure.length} items, but ${baseFile} has ${baseStructure.length}.`,
      );
      hasError = true;
      continue;
    }

    for (let j = 0; j < baseStructure.length; j++) {
      const b = baseStructure[j];
      const t = targetStructure[j];

      if (b.type !== t.type || b.value !== t.value) {
        console.error(`Error mismatch at index ${j}:`);
        console.error(`  Expected (${b.type}): ${b.value}`);
        console.error(`  Received (${t.type}): ${t.value} in ${targetFile}`);
        hasError = true;
      }
    }
  }

  if (hasError) {
    console.error('\nEnvironment example files are NOT aligned!');
    process.exit(1);
  } else {
    console.log('Success: All environment example files are structurally aligned.');
  }
}

verify();
