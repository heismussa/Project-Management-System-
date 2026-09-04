<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private function seedManageUsersPermission(): Permission
    {
        return Permission::create([
            'code' => 'admin.manage_users',
            'name' => 'Manage Users and Roles',
            'module' => 'admin',
        ]);
    }

    private function createIctSupportUser(): User
    {
        $permission = $this->seedManageUsersPermission();
        $role = Role::create([
            'name' => 'ICT Support',
            'description' => 'Manages user accounts and role assignment',
        ]);
        $role->permissions()->sync([$permission->id]);

        $user = User::factory()->create([
            'name' => 'ICT Officer',
            'email' => 'ictsupport@nssf.go.tz',
        ]);
        $user->roles()->attach($role->id, [
            'is_active' => true,
            'assigned_at' => now(),
        ]);

        return $user->fresh();
    }

    private function createPlannerRole(): Role
    {
        return Role::create([
            'name' => 'Project Planner',
            'description' => 'Prepares implementation plans',
        ]);
    }

    #[Test]
    public function ict_support_can_list_users_with_roles(): void
    {
        $ict = $this->createIctSupportUser();
        Sanctum::actingAs($ict);

        $response = $this->getJson('/api/admin/users');

        $response->assertOk()
            ->assertJsonPath('data.0.email', 'ictsupport@nssf.go.tz')
            ->assertJsonPath('data.0.roles.0.name', 'ICT Support');
    }

    #[Test]
    public function non_ict_support_cannot_manage_users(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->getJson('/api/admin/users')->assertForbidden();
        $this->getJson('/api/admin/roles')->assertForbidden();
    }

    #[Test]
    public function ict_support_can_create_a_user_and_assign_roles(): void
    {
        $ict = $this->createIctSupportUser();
        $planner = $this->createPlannerRole();
        Sanctum::actingAs($ict);

        $response = $this->postJson('/api/admin/users', [
            'name' => 'Amina Planner',
            'email' => 'amina.planner@nssf.go.tz',
            'password' => 'password123',
            'role_ids' => [$planner->id],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.email', 'amina.planner@nssf.go.tz')
            ->assertJsonPath('data.roles.0.name', 'Project Planner');

        $this->assertDatabaseHas('users', ['email' => 'amina.planner@nssf.go.tz']);
        $created = User::where('email', 'amina.planner@nssf.go.tz')->first();
        $this->assertTrue($created->hasRole('Project Planner'));
    }

    #[Test]
    public function ict_support_can_sync_user_roles(): void
    {
        $ict = $this->createIctSupportUser();
        $planner = $this->createPlannerRole();
        $target = User::factory()->create(['name' => 'New User']);
        Sanctum::actingAs($ict);

        $response = $this->putJson("/api/admin/users/{$target->id}/roles", [
            'role_ids' => [$planner->id],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.roles.0.name', 'Project Planner');

        $this->assertTrue($target->fresh()->hasRole('Project Planner'));
    }

    #[Test]
    public function cannot_remove_the_last_ict_support_role(): void
    {
        $ict = $this->createIctSupportUser();
        $planner = $this->createPlannerRole();
        Sanctum::actingAs($ict);

        $response = $this->putJson("/api/admin/users/{$ict->id}/roles", [
            'role_ids' => [$planner->id],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role_ids']);

        $this->assertTrue($ict->fresh()->hasRole('ICT Support'));
    }

    #[Test]
    public function login_returns_assigned_roles(): void
    {
        $ict = $this->createIctSupportUser();

        $response = $this->postJson('/api/login', [
            'login' => $ict->email,
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.role', 'ICT Support')
            ->assertJsonPath('user.roles.0.name', 'ICT Support')
            ->assertJsonPath('user.permissions.0', 'admin.manage_users');
    }
}
