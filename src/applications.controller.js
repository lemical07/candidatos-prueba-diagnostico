const service = require('./applications.service');
const { HttpError } = require('./error');
const { SOURCES, STATUSES } = require('./constant');

const MAX_COVER_LETTER = 5000;
const isPositiveInt = (v) => Number.isInteger(v) && v > 0;
const isPositiveIntString = (v) => typeof v === 'string' && /^[1-9]\d*$/.test(v);

// Cada función recibe { body, query, params } y devuelve { status, body }.

async function create({ body }) {
  const { candidateId, vacancyId, source, coverLetter } = body;
  const errors = [];

  if (!isPositiveInt(candidateId)) errors.push('candidateId es obligatorio y debe ser un entero positivo');
  if (!isPositiveInt(vacancyId)) errors.push('vacancyId es obligatorio y debe ser un entero positivo');
  if (!SOURCES.includes(source)) errors.push(`source es obligatorio y debe ser uno de: ${SOURCES.join(', ')}`);
  if (typeof coverLetter !== 'string' || coverLetter.trim() === '') {
    errors.push('coverLetter es obligatorio y debe ser texto no vacío');
  } else if (coverLetter.trim().length > MAX_COVER_LETTER) {
    errors.push(`coverLetter no puede superar ${MAX_COVER_LETTER} caracteres`);
  }
  if (errors.length) throw new HttpError(400, 'Datos inválidos', errors);

  const application = await service.createApplication({
    candidateId, vacancyId, source, coverLetter: coverLetter.trim(),
  });
  return { status: 201, body: application };
}

async function list({ query }) {
  const { status, vacancyId } = query;
  const errors = [];

  if (status !== undefined && !STATUSES.includes(status)) {
    errors.push(`status debe ser uno de: ${STATUSES.join(', ')}`);
  }
  if (vacancyId !== undefined && !isPositiveIntString(vacancyId)) {
    errors.push('vacancyId debe ser un entero positivo');
  }
  if (errors.length) throw new HttpError(400, 'Parámetros inválidos', errors);

  const applications = await service.listApplications({
    status,
    vacancyId: vacancyId !== undefined ? Number(vacancyId) : undefined,
  });
  return { status: 200, body: applications };
}

async function changeStatus({ params, body }) {
  if (!isPositiveIntString(params.id)) throw new HttpError(400, 'El id debe ser un entero positivo');

  const { status } = body;
  if (!STATUSES.includes(status)) {
    throw new HttpError(400, `status es obligatorio y debe ser uno de: ${STATUSES.join(', ')}`);
  }

  const application = await service.updateStatus(Number(params.id), status);
  return { status: 200, body: application };
}

module.exports = { create, list, changeStatus };