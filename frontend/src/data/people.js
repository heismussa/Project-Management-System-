export const people = [
  { id: 1, name: 'Alex Kim' },
  { id: 2, name: 'Jordan Lee' },
  { id: 3, name: 'Priya Nair' },
  { id: 4, name: 'Sam Patel' },
]

export function getPersonName(id) {
  return people.find((person) => person.id === id)?.name ?? 'Unassigned'
}
