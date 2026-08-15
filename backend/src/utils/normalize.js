function clean(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function number(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(String(value).replace(/,/g, '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function date(value) {
  const match = clean(value).match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (!match) return undefined;
  const [, dd, mm, yyyy] = match;
  return new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00.000Z`);
}

function normalizeVehicle(value) {
  return clean(value).replace(/\s+/g, '').toUpperCase();
}

module.exports = { clean, number, date, normalizeVehicle };
