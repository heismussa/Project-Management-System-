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
        $accounts = [
            ['email' => 'luquman2004tajir@gmail.com', 'name' => 'Project Reviewer', 'password' => 'password', 'role' => 'Project Reviewer'],
            ['email' => 'mussasaid@gmail.com', 'name' => 'System Admin', 'password' => 'password', 'role' => 'Project Administrator'],
            ['email' => 'sms.mussasaid@gmail.com', 'name' => 'System Admin', 'password' => 'password', 'role' => 'Project Administrator'],
            ['email' => 'ictsupport@gmail.com', 'name' => 'ICT Support', 'password' => 'password', 'role' => 'ICT Support'],
            ['email' => 'planner@gmail.com', 'name' => 'Project Planner', 'password' => 'password', 'role' => 'Project Planner'],
            ['email' => 'coordinator@gmail.com', 'name' => 'Project Coordinator', 'password' => 'password', 'role' => 'Project Coordinator'],
            ['email' => 'approver@gmail.com', 'name' => 'Project Approver', 'password' => 'password', 'role' => 'Project Approver'],
            ['email' => 'viewonly@gmail.com', 'name' => 'Project ViewOnly', 'password' => 'password', 'role' => 'Project ViewOnly'],
        ];

        foreach ($accounts as $account) {
            $user = User::firstOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'password' => Hash::make($account['password']),
                    'email_verified_at' => now(),
                    'is_active' => true,
                ]
            );

            if (! $user->email_verified_at) {
                $user->forceFill(['email_verified_at' => now(), 'is_active' => true])->save();
            }

            $role = Role::where('name', $account['role'])->first();
            if ($role) {
                $user->roles()->sync([
                    $role->id => ['is_active' => true, 'assigned_at' => now()],
                ]);
            }
        }
    }
}
