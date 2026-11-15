// Relationship is always relative to the main person (you).
export const OTHER_RELATIONSHIPS = [
  ['family', 'Family'],
  ['friend', 'Friend'],
  ['coworker', 'Coworker'],
  ['roommate', 'Roommate'],
  ['other', 'Other'],
]

export const REL_LABEL = {
  self: 'You',
  partner: 'Partner',
  ...Object.fromEntries(OTHER_RELATIONSHIPS),
}

const ORDER = { self: 0, partner: 1 }
export const sortPeople = (people) =>
  [...people].sort((a, b) => (ORDER[a.relationship] ?? 2) - (ORDER[b.relationship] ?? 2))

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()))
