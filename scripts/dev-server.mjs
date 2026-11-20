/**
 * Zero-dependency static server for local development and the headless check.
 *
 * No build step, no backend: WANT ships as plain ES modules over a static site.
 * Run `npm run dev` and open the printed URL.
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

function plain(res, status, message) {
  const body = `${message}\n`;
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function makeHandler(root) {
  return async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      plain(res, 405, 'Method not allowed');
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      plain(res, 400, 'Bad request');
      return;
    }

    let filePath = path.resolve(root, `.${pathname}`);
    const relative = path.relative(root, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      plain(res, 403, 'Forbidden');
      return;
    }

    try {
      let info = await stat(filePath);
      if (info.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
        info = await stat(filePath);
      }
      if (!info.isFile()) {
        plain(res, 404, 'Not found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
        'Content-Length': info.size,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      const stream = createReadStream(filePath);
      stream.on('error', () => {
        if (!res.headersSent) plain(res, 500, 'Read error');
        else res.destroy();
      });
      stream.pipe(res);
    } catch (error) {
      if (error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) {
        plain(res, 404, 'Not found');
      } else {
        plain(res, 500, 'Internal server error');
      }
    }
  };
}

/**
 * Start the static server. `port: 0` asks the OS for a free port.
 * If the requested port is busy, the next 11 ports are tried.
 * @returns {Promise<{server:import('node:http').Server, url:string, port:number, host:string, root:string, close:()=>Promise<void>}>}
 */
export async function startServer({
  port = 5173,
  host = '127.0.0.1',
  root = PROJECT_ROOT,
  silent = false,
} = {}) {
  const attempts = port === 0 ? 1 : 12;
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const wantedPort = port === 0 ? 0 : port + attempt;
    const server = createServer(makeHandler(root));

    try {
      await new Promise((resolve, reject) => {
        const onError = (error) => {
          server.off('listening', onListening);
          reject(error);
        };
        const onListening = () => {
          server.off('error', onError);
          resolve();
        };
        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(wantedPort, host);
      });

      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : wantedPort;
      const url = `http://${host}:${actualPort}/`;

      if (!silent) {
        console.log(`[WANT dev] serving ${root}`);
        console.log(`[WANT dev] ${url}`);
      }

      return {
        server,
        url,
        port: actualPort,
        host,
        root,
        close: () =>
          new Promise((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
          }),
      };
    } catch (error) {
      lastError = error;
      if (error?.code !== 'EADDRINUSE') throw error;
    }
  }

  throw lastError ?? new Error('Could not start the dev server.');
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const port = Number(process.env.PORT) || 5173;
  startServer({ port })
    .then(({ close }) => {
      console.log('[WANT dev] Ctrl+C to stop.');
      const shutdown = () => {
        close().finally(() => process.exit(0));
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    })
    .catch((error) => {
      console.error(`[WANT dev] Failed to start: ${error.message}`);
      process.exitCode = 1;
    });
}
