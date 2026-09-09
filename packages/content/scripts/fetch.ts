import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { fetchRaw } from '../src/pipeline/fetch.js';

const here = dirname(fileURLToPath(import.meta.url));
await fetchRaw(resolve(here, '../raw'));
