const { HttpError } = require('./error');
const { resolveRoute } = require('./applications.routes');
const { readJsonBody, sendJson } = require('./httpUtils');
const { handleError } = require('./errorHandler');

async function handleRequest(req, res) {
  try {
    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      throw new HttpError(400, 'URL inválida');
    }

    // Se ignora la barra final: /applications/ equivale a /applications
    const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;

    const route = resolveRoute(req.method, pathname);
    if (!route) throw new HttpError(404, 'Ruta no encontrada');

    const body = route.readsBody ? await readJsonBody(req) : {};
    const query = Object.fromEntries(url.searchParams);

    const result = await route.handler({ body, query, params: route.params });
    sendJson(res, result.status, result.body);
  } catch (err) {
    handleError(err, res);
  }
}

module.exports = { handleRequest };