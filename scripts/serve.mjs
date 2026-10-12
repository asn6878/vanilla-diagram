import http from 'node:http';
import { stat, readFile, realpath } from 'node:fs/promises';
import { resolve, extname, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const portFlag = args.indexOf('--port');
const port = Number(portFlag >= 0 ? args[portFlag + 1] : 4310);
const directory = args.find((value, index) => !value.startsWith('--') && !(portFlag >= 0 && index === portFlag + 1));
const root = await realpath(directory ? resolve(directory) : resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.png': 'image/png', '.md': 'text/plain; charset=utf-8' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + sep)) throw new Error('Forbidden');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    file = await realpath(file);
    if (!file.startsWith(root + sep)) throw new Error('Forbidden');
    const data = await readFile(file);
    response.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(data);
  } catch (error) { response.writeHead(error.message === 'Forbidden' ? 403 : 404); response.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => {
  const address = server.address();
  console.log(`Vanilla Infographics: http://localhost:${address.port}${directory ? '/' : '/examples/'}`);
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
