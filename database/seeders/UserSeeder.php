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
                'email_verified_at' => now(),
            ]
        );
        $reviewerRole = Role::where('name', 'Project Reviewer')->first();
        if ($reviewerRole) {
            $reviewer->roles()->sync([$reviewerRole->id]);
        }

        // 2. Create System Administrator
        $admin = User::firstOrCreate(
            ['email' => 'sms.mussasaid@gmail.com'],
            [
                'name' => 'System Admin',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );
        $adminRole = Role::where('name', 'Project Administrator')->first();
        if ($adminRole) {
            $admin->roles()->sync([$adminRole->id]);
        }
    }
}