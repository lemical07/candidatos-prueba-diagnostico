const { HttpError } = require('./error');
const { sendJson } = require('./httpUtils');

function handleError(err, res) {
  if (res.headersSent) {
    res.destroy();
    return;
  }

  if (err instanceof HttpError) {
    // Si el cuerpo era demasiado grande, se cierra la conexión tras responder
    if (err.status === 413) res.setHeader('Connection', 'close');
    return sendJson(res, err.status, {
      error: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  console.error(err);
  sendJson(res, 500, { error: 'Error interno del servidor' });
}

module.exports = { handleError };