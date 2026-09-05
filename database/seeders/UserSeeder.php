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
        // Only the two accounts that can log in and create everyone else are
        // seeded by default. Test/demo accounts for the other roles should be
        // added through the app itself (Admin/ICT Support > User Management),
        // not baked into every fresh install.
        $accounts = [
            ['email' => 'admin@gmail.com', 'name' => 'System Admin', 'password' => 'password', 'role' => 'Project Administrator'],
            ['email' => 'ictsupport@gmail.com', 'name' => 'ICT Support', 'password' => 'password', 'role' => 'ICT Support'],
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
