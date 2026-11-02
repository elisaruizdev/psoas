#!/usr/bin/env node
// Hook PostToolUse de Claude Code: tras editar un archivo, lo pasa por el linter que toca.
//   - .ts del frontend → ESLint
//   - .py de ai/       → ruff
// Si hay errores, sale con código 2: Claude Code le devuelve el stderr al agente, que los
// corrige en el momento en vez de descubrirlos en el CI.
import { execSync } from 'node:child_process';
import path from 'node:path';

let entrada = '';
for await (const trozo of process.stdin) entrada += trozo;

const archivo = JSON.parse(entrada || '{}').tool_input?.file_path;
if (!archivo) process.exit(0);

const raiz = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const relativo = path.relative(raiz, archivo).split(path.sep).join('/');
function ejecutar(comando, args, cwd) {
  // Un único string con los argumentos entre comillas: en Windows npx/uv necesitan shell.
  const linea = [comando, ...args.map((a) => JSON.stringify(a))].join(' ');
  try {
    execSync(linea, { cwd, stdio: 'pipe', encoding: 'utf8' });
  } catch (error) {
    const salida = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
    process.stderr.write(`El linter ha encontrado problemas en ${relativo}:\n${salida}\n`);
    process.exit(2);
  }
}

if (relativo.startsWith('ai/') && relativo.endsWith('.py')) {
  ejecutar('uv', ['run', 'ruff', 'check', relativo.slice(3)], path.join(raiz, 'ai'));
} else if (/\.ts$/.test(relativo) && !/^(ai|microfrontends|node_modules|dist)\//.test(relativo)) {
  ejecutar('npx', ['eslint', relativo], raiz);
}
