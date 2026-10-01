const { HttpError } = require('./error');

const MAX_BODY_BYTES = 50 * 1024;

// Lee el cuerpo de la petición y lo interpreta como un objeto JSON.
// Un cuerpo vacío se considera un objeto vacío.
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (Number(req.headers['content-length']) > MAX_BODY_BYTES) {
      return reject(new HttpError(413, 'Cuerpo demasiado grande'));
    }

    const chunks = [];
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        chunks.length = 0; // deja de acumular memoria
        return reject(new HttpError(413, 'Cuerpo demasiado grande'));
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (raw === '') return resolve({});
      try {
        const parsed = JSON.parse(raw);
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return reject(new HttpError(400, 'El cuerpo debe ser un objeto JSON'));
        }
        resolve(parsed);
      } catch {
        reject(new HttpError(400, 'JSON inválido'));
      }
    });

    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  const data = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
  });
  res.end(data);
}

module.exports = { readJsonBody, sendJson };