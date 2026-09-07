// The activities API eager-loads `responsiblePerson` (+ their active role),
// which Laravel serializes as `responsible_person` / `active_roles`. These
// helpers read that real, per-activity data instead of a static lookup
// table, so exports always reflect who is actually assigned right now.
export function activityResponsibleName(activity) {
  return activity.responsible_person?.name ?? 'Unassigned'
}

export function activityResponsibleRole(activity) {
  return activity.responsible_person?.active_roles?.[0]?.name ?? '—'
}
