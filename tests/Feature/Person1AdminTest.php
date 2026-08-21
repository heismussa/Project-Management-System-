<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class Person1AdminTest extends TestCase
{
    use RefreshDatabase;

    private function ictSupport(): User
    {
        $user = User::factory()->create(['is_active' => true]);
        $role = Role::firstOrCreate(['name' => 'ICT Support']);
        $permission = Permission::firstOrCreate(
            ['code' => 'admin.manage_users'],
            ['name' => 'admin.manage_users', 'module' => 'admin']
        );
        $role->permissions()->syncWithoutDetaching([$permission->id]);
        $user->roles()->attach($role->id, [
            'is_active' => true,
            'assigned_at' => now(),
        ]);
        Sanctum::actingAs($user);

        return $user->fresh();
    }

    #[Test]
    public function public_register_is_removed(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Public User',
            'email' => 'public@nssf.or.tz',
            'password' => 'password123',
        ])->assertNotFound();
    }

    #[Test]
    public function dashboard_returns_role_metrics(): void
    {
        $this->ictSupport();

        $this->getJson('/api/dashboard?role=ICT Support')
            ->assertOk()
            ->assertJsonPath('data.role', 'ICT Support')
            ->assertJsonStructure(['data' => ['counts', 'pending_actions']]);
    }

    #[Test]
    public function user_create_requires_a_role(): void
    {
        $this->ictSupport();

        $this->postJson('/api/admin/users', [
            'name' => 'No Role',
            'email' => 'norole@nssf.or.tz',
            'password' => 'password123',
        ])->assertUnprocessable();
    }

    #[Test]
    public function notifications_endpoint_returns_list(): void
    {
        $user = $this->ictSupport();

        $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('data', []);

        $this->assertTrue($user->is_active);
    }
}
