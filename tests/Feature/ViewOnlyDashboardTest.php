<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Requirement;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ViewOnlyDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsViewOnly(): User
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'Project ViewOnly']);
        $user->roles()->attach($role->id, ['is_active' => true, 'assigned_at' => now()]);
        Sanctum::actingAs($user);

        return $user;
    }

    #[Test]
    public function dashboard_only_includes_view_only_block_for_that_role(): void
    {
        $this->actingAsViewOnly();

        $this->getJson('/api/dashboard?role=Project ViewOnly')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'view_only' => [
                        'status_counts',
                        'phase_counts',
                        'implementation_score_average',
                        'uat_pass_rate',
                        'total_budget',
                        'requirement_status_counts' => ['pending', 'ongoing', 'completed'],
                        'projects',
                    ],
                ],
            ]);

        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'Project Planner']);
        $user->roles()->attach($role->id, ['is_active' => true, 'assigned_at' => now()]);
        Sanctum::actingAs($user);

        $this->getJson('/api/dashboard?role=Project Planner')
            ->assertOk()
            ->assertJsonMissingPath('data.view_only');
    }

    #[Test]
    public function requirement_status_counts_treat_null_status_as_pending(): void
    {
        $this->actingAsViewOnly();
        $project = Project::create(['name' => 'Req status project']);

        Requirement::create(['project_id' => $project->id, 'requirement_code' => 'R1', 'description' => 'x', 'implementation_status' => null]);
        Requirement::create(['project_id' => $project->id, 'requirement_code' => 'R2', 'description' => 'x', 'implementation_status' => 'Pending']);
        Requirement::create(['project_id' => $project->id, 'requirement_code' => 'R3', 'description' => 'x', 'implementation_status' => 'Ongoing']);
        Requirement::create(['project_id' => $project->id, 'requirement_code' => 'R4', 'description' => 'x', 'implementation_status' => 'Completed']);

        $this->getJson('/api/dashboard?role=Project ViewOnly')
            ->assertOk()
            ->assertJsonPath('data.view_only.requirement_status_counts.pending', 2)
            ->assertJsonPath('data.view_only.requirement_status_counts.ongoing', 1)
            ->assertJsonPath('data.view_only.requirement_status_counts.completed', 1);
    }

    #[Test]
    public function project_list_exposes_only_the_erd_fields_the_progress_table_needs(): void
    {
        $this->actingAsViewOnly();
        Project::create([
            'name' => 'Progress Row',
            'category' => 'System',
            'phase' => 'Execution',
            'overall_implementation_score' => 77,
            'budget' => 999999,
        ]);

        $response = $this->getJson('/api/dashboard?role=Project ViewOnly')->assertOk();
        $row = collect($response->json('data.view_only.projects'))->firstWhere('name', 'Progress Row');

        $this->assertSame('System', $row['category']);
        $this->assertSame('Execution', $row['phase']);
        $this->assertSame(77, $row['overall_implementation_score']);
        $this->assertArrayNotHasKey('budget', $row);
    }

    #[Test]
    public function reuses_administrator_dashboard_status_and_phase_counts(): void
    {
        $this->actingAsViewOnly();
        Project::create(['name' => 'A', 'lifecycle_stage' => 'execution', 'actual_start_date' => now()->subDays(3)]);
        Project::create(['name' => 'B', 'lifecycle_stage' => 'initiation']);

        $admin = Project::administratorDashboard();
        $viewOnly = Project::viewOnlyDashboard();

        $this->assertSame($admin['status_counts'], $viewOnly['status_counts']);
        $this->assertSame($admin['phase_counts'], $viewOnly['phase_counts']);
        $this->assertSame($admin['total_budget'], $viewOnly['total_budget']);
    }
}
