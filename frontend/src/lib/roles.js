import { ROLES } from '../utility/Config.jsx'

// Roles that can perform Planner actions anywhere in the app: activity
// create/edit/delete, submit-for-review, progress updates, bulk requirement
// submission, test-score entry. Single source of truth on the frontend —
// mirrors App\Support\Roles::PLANNER_ROLES on the backend. Add a role here,
// not at each RoleGuard/ProtectedRoute call site.
//
// This does NOT encode the ownership rule: a Planner may only act on
// projects assigned to them, while an Administrator may act on any
// project. That's enforced server-side (Project::canBeManagedBy()) — this
// list only controls what the UI shows, never what the API allows. See
// the PAGE_ACCESS comment in utility/Config.jsx for the same caveat.
export const PLANNER_ROLES = [ROLES.PPL, ROLES.PAD]
