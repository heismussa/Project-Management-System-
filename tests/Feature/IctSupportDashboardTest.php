<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\UserActivityLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class IctSupportDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsIctSupport(): User
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'ICT Support']);
        $permission = Permission::firstOrCreate(
            ['code' => 'admin.manage_users'],
            ['name' => 'Manage Users', 'module' => 'test']
        );
        $role->permissions()->syncWithoutDetaching([$permission->id]);
        $user->roles()->attach($role->id, ['is_active' => true, 'assigned_at' => now()]);
        Sanctum::actingAs($user);

        return $user;
    }

    #[Test]
    public function dashboard_only_includes_ict_support_block_for_that_role(): void
    {
        $this->actingAsIctSupport();

        $this->getJson('/api/dashboard?role=ICT Support')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'ict_support' => [
                        'metrics' => ['total_users', 'active_accounts', 'disabled_accounts', 'password_resets'],
                        'users_without_roles',
                        'users_by_role',
                        'recent_activity',
                        'notification_engine' => ['scheduler_running', 'last_run_at', 'alerts_sent_today', 'failed_deliveries'],
                    ],
                ],
            ]);

        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'Project Planner']);
        $user->roles()->attach($role->id, ['is_active' => true, 'assigned_at' => now()]);
        Sanctum::actingAs($user);

        $this->getJson('/api/dashboard?role=Project Planner')
            ->assertOk()
            ->assertJsonMissingPath('data.ict_support');
    }

    #[Test]
    public function metrics_count_active_disabled_and_password_resets_correctly(): void
    {
        $admin = $this->actingAsIctSupport();

        User::factory()->create(['is_active' => true]);
        User::factory()->create(['is_active' => false]);
        User::factory()->create(['is_active' => false]);

        UserActivityLog::create(['user_id' => $admin->id, 'action' => 'password_reset', 'created_at' => now()]);
        UserActivityLog::create(['user_id' => $admin->id, 'action' => 'password_reset', 'created_at' => now()]);
        UserActivityLog::create(['user_id' => $admin->id, 'action' => 'role_assigned', 'created_at' => now()]);

        $response = $this->getJson('/api/dashboard?role=ICT Support')->assertOk();

        // admin (active) + 3 factory users = 4 total, 2 active (admin + 1), 2 disabled
        $response->assertJsonPath('data.ict_support.metrics.total_users', 4)
            ->assertJsonPath('data.ict_support.metrics.active_accounts', 2)
            ->assertJsonPath('data.ict_support.metrics.disabled_accounts', 2)
            ->assertJsonPath('data.ict_support.metrics.password_resets', 2);
    }

    #[Test]
    public function users_without_roles_counts_only_accounts_with_no_active_user_role(): void
    {
        $this->actingAsIctSupport();
        $role = Role::firstOrCreate(['name' => 'Project Planner']);

        $withRole = User::factory()->create();
        $withRole->roles()->attach($role->id, ['is_active' => true, 'assigned_at' => now()]);

        $withInactiveRoleRow = User::factory()->create();
        $withInactiveRoleRow->roles()->attach($role->id, ['is_active' => false, 'assigned_at' => now()]);

        User::factory()->create(); // no role row at all

        $response = $this->getJson('/api/dashboard?role=ICT Support')->assertOk();

        // actingAsIctSupport's own user has a role, so it doesn't count.
        // withInactiveRoleRow + the bare user = 2 without an active role.
        $response->assertJsonPath('data.ict_support.users_without_roles', 2);
    }

    #[Test]
    public function users_by_role_is_sorted_descending_and_excludes_ict_support(): void
    {
        $this->actingAsIctSupport();
        $planner = Role::firstOrCreate(['name' => 'Project Planner']);
        $approver = Role::firstOrCreate(['name' => 'Project Approver']);

        foreach (range(1, 3) as $i) {
            $u = User::factory()->create();
            $u->roles()->attach($planner->id, ['is_active' => true, 'assigned_at' => now()]);
        }
        $u = User::factory()->create();
        $u->roles()->attach($approver->id, ['is_active' => true, 'assigned_at' => now()]);

        $response = $this->getJson('/api/dashboard?role=ICT Support')->assertOk();
        $byRole = collect($response->json('data.ict_support.users_by_role'));

        $this->assertSame('Project Planner', $byRole->first()['role']);
        $this->assertGreaterThanOrEqual($byRole->last()['count'], $byRole->first()['count']);
        $this->assertNull($byRole->firstWhere('role', 'ICT Support'));
    }

    #[Test]
    public function toggle_status_and_password_reset_write_activity_log_rows(): void
    {
        $admin = $this->actingAsIctSupport();
        $role = Role::firstOrCreate(['name' => 'ICT Support']);
        // second ICT Support so the "last ICT support" guard doesn't block anything here
        $second = User::factory()->create();
        $second->roles()->attach($role->id, ['is_active' => true, 'assigned_at' => now()]);

        $target = User::factory()->create(['is_active' => true]);

        $this->postJson("/api/admin/users/{$target->id}/toggle-status")->assertOk();
        $this->assertDatabaseHas('user_activity_logs', [
            'user_id' => $target->id,
            'action' => 'account_disabled',
            'performed_by' => $admin->id,
        ]);

        $this->postJson("/api/admin/users/{$target->id}/password", [
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertOk();
        $this->assertDatabaseHas('user_activity_logs', [
            'user_id' => $target->id,
            'action' => 'password_reset',
            'performed_by' => $admin->id,
        ]);
    }

    #[Test]
    public function notification_engine_reports_todays_alert_count_and_zero_failed_deliveries(): void
    {
        $this->actingAsIctSupport();
        $recipient = User::factory()->create();

        Notification::create(['user_id' => $recipient->id, 'type' => 'Upcoming', 'message' => 'x', 'created_at' => now()]);
        Notification::create(['user_id' => $recipient->id, 'type' => 'Overdue', 'message' => 'y', 'created_at' => now()]);
        Notification::create(['user_id' => $recipient->id, 'type' => 'Upcoming', 'message' => 'z', 'created_at' => now()->subDays(3)]);

        $this->getJson('/api/dashboard?role=ICT Support')
            ->assertOk()
            ->assertJsonPath('data.ict_support.notification_engine.alerts_sent_today', 2)
            ->assertJsonPath('data.ict_support.notification_engine.failed_deliveries', 0);
    }
}
