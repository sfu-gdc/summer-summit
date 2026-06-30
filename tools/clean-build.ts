// Used to workaround bug where Cloudflare's workerd holds a lock on the .svelte-kit/cloudflare directory, preventing `vite build` from replacing it.

import { rm } from 'node:fs/promises';
import { normalize } from 'node:path';

await rm(normalize('./.svelte-kit/cloudflare'), { recursive: true, force: true });
