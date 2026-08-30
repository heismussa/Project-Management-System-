<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Permission;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            'ICT Support' => ['admin.manage_users', 'projects.view_all'],
            'Project Reviewer' => ['projects.register', 'projects.review', 'projects.assign_planner', 'projects.reassign_planner', 'projects.close', 'projects.view_all', 'documents.upload_initial'],
            'Project Planner' => ['projects.plan', 'requirements.submit', 'projects.view_all'],
            'Project Coordinator' => ['projects.recommend', 'projects.view_all'],
            'Project Approver' => ['projects.approve', 'projects.view_all'],
            'Project ViewOnly' => ['projects.view_all'],
            'Project Administrator' => Permission::all()->pluck('code')->toArray(),
        ];

        $descriptions = [
            'ICT Support' => 'Manages user accounts and role assignment',
        ];

        foreach ($roles as $roleName => $permCodes) {
            $role = Role::firstOrCreate(
                ['name' => $roleName],
                ['description' => $descriptions[$roleName] ?? null]
            );
            $permIds = Permission::whereIn('code', $permCodes)->pluck('id');
            $role->permissions()->sync($permIds);
        }
    }
}
