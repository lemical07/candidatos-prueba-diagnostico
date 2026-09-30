const controller = require('./applications.controller');

const STATUS_PATH = /^\/applications\/([^/]+)\/status$/;

// Devuelve { handler, params, readsBody } o null si la ruta no existe.
function resolveRoute(method, pathname) {
  if (pathname === '/applications') {
    if (method === 'POST') return { handler: controller.create, params: {}, readsBody: true };
    if (method === 'GET') return { handler: controller.list, params: {}, readsBody: false };
  }

  const match = pathname.match(STATUS_PATH);
  if (match && method === 'PUT') {
    return { handler: controller.changeStatus, params: { id: match[1] }, readsBody: true };
  }

  return null;
}

module.exports = { resolveRoute };