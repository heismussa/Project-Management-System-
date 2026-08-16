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
            ['email' => 'reviewer@system.com'],
            [
                'name' => 'John Reviewer',
                'password' => Hash::make('password123'),
            ]
        );
        $reviewerRole = Role::where('name', 'Project Reviewer')->first();
        if ($reviewerRole) {
            $reviewer->roles()->sync([$reviewerRole->id]);
        }

        // 2. Create System Administrator
        $admin = User::firstOrCreate(
            ['email' => 'admin@system.com'],
            [
                'name' => 'System Admin',
                'password' => Hash::make('password123'),
            ]
        );
        $adminRole = Role::where('name', 'Project Administrator')->first();
        if ($adminRole) {
            $admin->roles()->sync([$adminRole->id]);
        }
    }
}