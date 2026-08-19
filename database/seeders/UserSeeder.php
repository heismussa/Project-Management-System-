<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Project Reviewer (Process 1 Lead)
        $reviewer = User::firstOrCreate(
            ['email' => 'luquman2004tajir@gmail.com'],
            [
                'name' => 'project reviewer',
                'password' => Hash::make('password1234'),
            ]
        );
        $reviewerRole = Role::where('name', 'Project Reviewer')->first();
        if ($reviewerRole) {
            $reviewer->roles()->sync([$reviewerRole->id => ['is_active' => true, 'assigned_at' => now()]]);
        }

        // 2. Create System Administrator
        $admin = User::firstOrCreate(
            ['email' => 'mussasaid@gmail.com'],
            [
                'name' => 'System Admin',
                'password' => Hash::make('password123'),
            ]
        );
        $adminRole = Role::where('name', 'Project Administrator')->first();
        if ($adminRole) {
            $admin->roles()->sync([$adminRole->id => ['is_active' => true, 'assigned_at' => now()]]);
        }

        // 3. Create ICT Support (user management / role assignment)
        $ictSupport = User::firstOrCreate(
            ['email' => 'ictsupport@nssf.go.tz'],
            [
                'name' => 'ICT Support',
                'password' => Hash::make('password123'),
            ]
        );
        $ictSupportRole = Role::where('name', 'ICT Support')->first();
        if ($ictSupportRole) {
            $ictSupport->roles()->sync([$ictSupportRole->id => ['is_active' => true, 'assigned_at' => now()]]);
        }
    }
}