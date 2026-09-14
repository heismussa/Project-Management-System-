<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Permission;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder
{
    /** Roles retired from the product — removed on every seed so stale DB rows cannot reappear in User Management. */
    private const OBSOLETE_ROLES = [
        'Project Implementor',
        'Project Implementer',
    ];

    public function run(): void
    {
        $roles = [
            'ICT Support' => ['admin.manage_users', 'projects.view_all'],
            'Project Reviewer' => ['projects.register', 'projects.review', 'projects.assign_planner', 'projects.reassign_planner', 'projects.close', 'projects.view_all', 'documents.upload_initial'],
            'Project Planner' => ['projects.plan', 'requirements.submit', 'projects.view_all'],
            'Project Coordinator' => ['projects.recommend', 'projects.view_all'],
            'Project Approver' => ['projects.approve', 'projects.view_all'],
            'Project ViewOnly' => ['projects.view_all'],
            'Project Administrator' => Permission::query()->pluck('code')->toArray(),
        ];

        $descriptions = [
            'ICT Support' => 'Manages user accounts and role assignment. Can access Main Dashboard, Project Management, User Management, and Audit Log.',
        ];

        foreach ($roles as $roleName => $permCodes) {
            $role = Role::updateOrCreate(
                ['name' => $roleName],
                ['description' => $descriptions[$roleName] ?? null]
            );
            $permIds = Permission::whereIn('code', $permCodes)->pluck('id');
            $role->permissions()->sync($permIds);
        }

        $this->removeObsoleteRoles();
    }

    private function removeObsoleteRoles(): void
    {
        $obsolete = Role::whereIn('name', self::OBSOLETE_ROLES)->get();

        foreach ($obsolete as $role) {
            DB::table('user_roles')->where('role_id', $role->id)->delete();
            $role->permissions()->detach();
            $role->delete();
        }
    }
}
