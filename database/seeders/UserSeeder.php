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
            ['email' => 'luquman2004tajir@gmail.com', 'name' => 'Project Reviewer', 'password' => 'password1234', 'role' => 'Project Reviewer'],
            ['email' => 'mussasaid@gmail.com', 'name' => 'System Admin', 'password' => 'password123', 'role' => 'Project Administrator'],
            ['email' => 'sms.mussasaid@gmail.com', 'name' => 'System Admin', 'password' => 'password123', 'role' => 'Project Administrator'],
            ['email' => 'ictsupport@nssf.go.tz', 'name' => 'ICT Support', 'password' => 'password123', 'role' => 'ICT Support'],
            ['email' => 'planner@nssf.or.tz', 'name' => 'Project Planner', 'password' => 'password123', 'role' => 'Project Planner'],
            ['email' => 'coordinator@nssf.or.tz', 'name' => 'Project Coordinator', 'password' => 'password123', 'role' => 'Project Coordinator'],
            ['email' => 'approver@nssf.or.tz', 'name' => 'Project Approver', 'password' => 'password123', 'role' => 'Project Approver'],
            ['email' => 'viewonly@nssf.or.tz', 'name' => 'Project ViewOnly', 'password' => 'password123', 'role' => 'Project ViewOnly'],
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
