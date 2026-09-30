const test = require('node:test');
const assert = require('node:assert');
const { calculateScore, priorityFromScore } = require('../src/scoring');

const base = { candidateYears: 1, minYears: 3, source: 'OTHER', coverLetter: 'hola', activeInOthers: 0 };
const score = (overrides) => calculateScore({ ...base, ...overrides });

test('suma por experiencia (igual al mínimo cuenta)', () => {
  assert.strictEqual(score({ candidateYears: 3 }), 4);
  assert.strictEqual(score({ candidateYears: 2 }), 0);
});

test('suma por fuente', () => {
  assert.strictEqual(score({ source: 'REFERRAL' }), 3);
  assert.strictEqual(score({ source: 'INTERNAL' }), 2);
  assert.strictEqual(score({ source: 'JOB_BOARD' }), 0);
});

test('palabras clave: palabra completa, sin distinguir mayúsculas', () => {
  assert.strictEqual(score({ coverLetter: 'Domino Node.js' }), 2);
  assert.strictEqual(score({ coverLetter: 'Escribo SQL' }), 2);
  assert.strictEqual(score({ coverLetter: 'Diseño una API REST' }), 2);
  assert.strictEqual(score({ coverLetter: 'capital rapido' }), 0);
});

test('longitud: 500 no suma, 501 sí', () => {
  assert.strictEqual(score({ coverLetter: 'a'.repeat(500) }), 0);
  assert.strictEqual(score({ coverLetter: 'a'.repeat(501) }), 1);
});

test('penalización por 3 o más activas en otras vacantes', () => {
  assert.strictEqual(score({ activeInOthers: 2 }), 0);
  assert.strictEqual(score({ activeInOthers: 3 }), -2);
});

test('combinación máxima = 10 y mínima = -2', () => {
  const max = score({ candidateYears: 5, source: 'REFERRAL', coverLetter: 'node ' + 'a'.repeat(510) });
  assert.strictEqual(max, 10);
  assert.strictEqual(score({ activeInOthers: 4 }), -2);
});

test('fronteras de prioridad', () => {
  const cases = [[-2, 'LOW'], [0, 'LOW'], [2, 'LOW'], [3, 'MEDIUM'], [4, 'MEDIUM'],
                 [5, 'HIGH'], [6, 'HIGH'], [7, 'TOP'], [10, 'TOP']];
  for (const [s, p] of cases) assert.strictEqual(priorityFromScore(s), p, `score ${s}`);
});