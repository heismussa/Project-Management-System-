export const people = [
  { id: 1, name: 'Tee Kulunge', role: 'Project Reviewer' },
  { id: 2, name: 'Amily Hussein', role: 'Project Coordinator' },
  { id: 3, name: 'Amily Hussein', role: 'Project Coordinator' },
  { id: 4, name: 'Amily Hussein', role: 'Project Coordinator' },
  { id: 5, name: 'Musa Hamis', role: 'Project Planner' },
  { id: 6, name: 'Luqman Salim', role: 'Project Approver' },
]

export function getPersonName(id) {
  return people.find((person) => person.id === id)?.name ?? 'Unassigned'
}

export function getPersonRole(id) {
  return people.find((person) => person.id === id)?.role ?? '—'
}
