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
            $reviewer->roles()->sync([$reviewerRole->id => ['is_active' => true, 'assigned_at' => now()]]);
        }

        foreach (['mussasaid@gmail.com', 'sms.mussasaid@gmail.com'] as $adminEmail) {
            $admin = User::firstOrCreate(
                ['email' => $adminEmail],
                [
                    'name' => 'System Admin',
                    'password' => Hash::make('password123'),
                    'email_verified_at' => now(),
                ]
            );
            $adminRole = Role::where('name', 'Project Administrator')->first();
            if ($adminRole) {
                $admin->roles()->sync([$adminRole->id => ['is_active' => true, 'assigned_at' => now()]]);
            }
        }

        $ictSupport = User::firstOrCreate(
            ['email' => 'ictsupport@nssf.go.tz'],
            [
                'name' => 'ICT Support',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );
        $ictSupportRole = Role::where('name', 'ICT Support')->first();
        if ($ictSupportRole) {
            $ictSupport->roles()->sync([$ictSupportRole->id => ['is_active' => true, 'assigned_at' => now()]]);
        }
    }
}
