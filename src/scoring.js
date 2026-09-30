const KEYWORDS = /\b(node|sql|api)\b/i;

function calculateScore({ candidateYears, minYears, source, coverLetter, activeInOthers }) {
  let score = 0;
  if (candidateYears >= minYears) score += 4;
  if (source === 'REFERRAL') score += 3;
  else if (source === 'INTERNAL') score += 2;
  if (KEYWORDS.test(coverLetter)) score += 2;
  if (coverLetter.length > 500) score += 1;
  if (activeInOthers >= 3) score -= 2;
  return score;
}

function priorityFromScore(score) {
  if (score >= 7) return 'TOP';
  if (score >= 5) return 'HIGH';
  if (score >= 3) return 'MEDIUM';
  return 'LOW'; // incluye puntajes negativos (supuesto 2)
}

module.exports = { calculateScore, priorityFromScore };