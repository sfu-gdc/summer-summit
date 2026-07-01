---
name: run-npm-tools
description: Run npm package executables or `package.json` scripts.
allowed-tools: Bash(node -e *)
---

This workspace uses `pnpm` as the package manager. **NEVER USE OTHER PACKAGE MANAGERS**.

## Available `package.json` scripts

```!
node -e "import pkg from './package.json' with { type: 'json' }; Object.entries(pkg.scripts).forEach(([name, cmd]) => console.log('- ' + JSON.stringify(name) + ': ' + JSON.stringify(cmd)));"
```
