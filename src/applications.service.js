const pool = require('./config/db');
const { HttpError } = require('./errors');
const { FINAL_STATUSES, REAPPLY_DAYS } = require('./constants');
const { calculateScore, priorityFromScore } = require('./scoring');

const SELECT_APPLICATION = `
  SELECT a.id,
         a.candidate_id AS candidateId, c.name AS candidateName, c.email AS candidateEmail,
         a.vacancy_id AS vacancyId, v.title AS vacancyTitle,
         a.cover_letter AS coverLetter, a.source, a.score, a.priority, a.status,
         a.created_at AS createdAt, a.status_updated_at AS statusUpdatedAt
  FROM applications a
  JOIN candidates c ON c.id = a.candidate_id
  JOIN vacancies v ON v.id = a.vacancy_id`;

async function getById(id) {
  const [rows] = await pool.execute(`${SELECT_APPLICATION} WHERE a.id = ?`, [id]);
  return rows[0];
}

async function createApplication({ candidateId, vacancyId, source, coverLetter }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Bloqueo por candidato: serializa postulaciones concurrentes del mismo candidato
    const [candidates] = await conn.execute(
      'SELECT id, years_experience FROM candidates WHERE id = ? FOR UPDATE', [candidateId]);
    if (!candidates[0]) throw new HttpError(404, 'El candidato no existe');

    const [vacancies] = await conn.execute(
      'SELECT id, min_years_experience, status FROM vacancies WHERE id = ?', [vacancyId]);
    if (!vacancies[0]) throw new HttpError(404, 'La vacante no existe');
    if (vacancies[0].status !== 'OPEN') throw new HttpError(409, 'La vacante no está abierta');

    // Regla de duplicidad
    const [dups] = await conn.execute(
      `SELECT status, status_updated_at FROM applications
       WHERE candidate_id = ? AND vacancy_id = ?
         AND (status IN ('RECEIVED','IN_REVIEW','HIRED')
              OR (status = 'REJECTED'
                  AND status_updated_at > UTC_TIMESTAMP() - INTERVAL ${REAPPLY_DAYS} DAY))
       ORDER BY status_updated_at DESC LIMIT 1`,
      [candidateId, vacancyId]);
    if (dups[0]) {
      if (dups[0].status === 'REJECTED') {
        const availableFrom = new Date(
          new Date(dups[0].status_updated_at).getTime() + REAPPLY_DAYS * 86400000);
        throw new HttpError(409,
          `Postulación rechazada recientemente; podrá volver a postularse desde ${availableFrom.toISOString()}`);
      }
      throw new HttpError(409, 'El candidato ya tiene una postulación vigente o contratada en esta vacante');
    }

    const [[{ total }]] = await conn.execute(
      `SELECT COUNT(*) AS total FROM applications
       WHERE candidate_id = ? AND vacancy_id <> ? AND status IN ('RECEIVED','IN_REVIEW')`,
      [candidateId, vacancyId]);

    const score = calculateScore({
      candidateYears: candidates[0].years_experience,
      minYears: vacancies[0].min_years_experience,
      source,
      coverLetter,
      activeInOthers: total,
    });

    const [result] = await conn.execute(
      `INSERT INTO applications
         (candidate_id, vacancy_id, cover_letter, source, score, priority, status, created_at, status_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'RECEIVED', UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [candidateId, vacancyId, coverLetter, source, score, priorityFromScore(score)]);

    await conn.commit();
    return getById(result.insertId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function listApplications({ status, vacancyId }) {
  const where = [];
  const params = [];
  if (status) { where.push('a.status = ?'); params.push(status); }
  if (vacancyId) { where.push('a.vacancy_id = ?'); params.push(vacancyId); }

  const sql = `${SELECT_APPLICATION}
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY a.score DESC, a.created_at ASC, a.id ASC`;
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function updateStatus(id, newStatus) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      'SELECT id, status FROM applications WHERE id = ? FOR UPDATE', [id]);
    if (!rows[0]) throw new HttpError(404, 'La postulación no existe');
    if (FINAL_STATUSES.includes(rows[0].status)) {
      throw new HttpError(409, `La postulación está en estado final (${rows[0].status}) y no puede cambiar`);
    }

    await conn.execute(
      'UPDATE applications SET status = ?, status_updated_at = UTC_TIMESTAMP() WHERE id = ?',
      [newStatus, id]);

    await conn.commit();
    return getById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { createApplication, listApplications, updateStatus };