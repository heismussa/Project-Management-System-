<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Existing Project Reviewer Account
        $reviewer = User::firstOrCreate(
            ['email' => 'luquman2004tajir@gmail.com'],
            [
                'name' => 'project reviewer',
                'password' => Hash::make('password1234'),
                'email_verified_at' => now(),
                'is_active' => true,
            ]
        );

        $reviewerRole = Role::where('name', 'Project Reviewer')->first();
        if ($reviewerRole) {
            $reviewer->roles()->sync([
                $reviewerRole->id => ['is_active' => true, 'assigned_at' => now()],
            ]);
        }

        // 2. Existing System Administrator Accounts
        $adminEmails = ['mussasaid@gmail.com', 'sms.mussasaid@gmail.com'];
        $adminRole = Role::where('name', 'Project Administrator')->first();

        foreach ($adminEmails as $adminEmail) {
            $admin = User::firstOrCreate(
                ['email' => $adminEmail],
                [
                    'name' => 'System Admin',
                    'password' => Hash::make('password123'),
                    'email_verified_at' => now(),
                    'is_active' => true,
                ]
            );

            if ($adminRole) {
                $admin->roles()->sync([
                    $adminRole->id => ['is_active' => true, 'assigned_at' => now()],
                ]);
            }
        }

        // 3. Existing ICT Support Account
        $ictSupport = User::firstOrCreate(
            ['email' => 'ictsupport@nssf.go.tz'],
            [
                'name' => 'ICT Support',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
                'is_active' => true,
            ]
        );

        $ictSupportRole = Role::where('name', 'ICT Support')->first();
        if ($ictSupportRole) {
            $ictSupport->roles()->sync([
                $ictSupportRole->id => ['is_active' => true, 'assigned_at' => now()],
            ]);
        }

        // 4. Additional Generic Role Test Accounts
        $extraRoles = ['Planner', 'Implementor', 'Coordinator', 'Approver', 'ViewOnly'];

        foreach ($extraRoles as $roleName) {
            $role = Role::firstOrCreate(['name' => $roleName]);

            $user = User::firstOrCreate(
                ['email' => strtolower(str_replace(' ', '.', $roleName)) . '@example.com'],
                [
                    'name' => "{$roleName} User",
                    'password' => Hash::make('Password123!'),
                    'email_verified_at' => now(),
                    'is_active' => true,
                ]
            );

            if ($role) {
                $user->roles()->syncWithoutDetaching([
                    $role->id => ['is_active' => true, 'assigned_at' => now()],
                ]);
            }
        }
    }
}