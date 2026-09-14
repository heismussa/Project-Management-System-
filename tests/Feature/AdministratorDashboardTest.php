<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\ImplementationActivity;
use App\Models\Permission;
use App\Models\Project;
use App\Models\Requirement;
use App\Models\Role;
use App\Models\User;
use App\Services\ProjectDashboardMetrics;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AdministratorDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdministrator(): User
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'Project Administrator']);
        $user->roles()->attach($role->id, ['is_active' => true, 'assigned_at' => now()]);
        Sanctum::actingAs($user);

        return $user;
    }

    #[Test]
    public function dashboard_only_includes_admin_block_for_project_administrator(): void
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'Project Planner']);
        Permission::firstOrCreate(['code' => 'projects.plan'], ['name' => 'Prepare Implementation Plan', 'module' => 'planning']);
        $user->roles()->attach($role->id, ['is_active' => true, 'assigned_at' => now()]);
        Sanctum::actingAs($user);

        $this->getJson('/api/dashboard?role=Project Planner')
            ->assertOk()
            ->assertJsonMissingPath('data.admin');
    }

    #[Test]
    public function administrator_dashboard_is_user_management_and_audit_log_facing_not_project_facing(): void
    {
        $this->actingAsAdministrator();
        // Project data exists, but Administrator no longer has Project
        // Management or Reports — none of it should leak into their block.
        Project::create(['name' => 'Some project']);

        $response = $this->getJson('/api/dashboard?role=Project Administrator')->assertOk();

        $response->assertJsonStructure([
            'data' => [
                'admin' => [
                    'metrics' => ['total_users', 'active_accounts', 'disabled_accounts', 'password_resets'],
                    'users_by_role',
                    'security_highlights',
                ],
            ],
        ])->assertJsonMissingPath('data.admin.status_counts')
            ->assertJsonMissingPath('data.admin.transition_blockers')
            ->assertJsonMissingPath('data.admin.awaiting_action');
    }

    #[Test]
    public function administrator_dashboard_user_counts_are_accurate(): void
    {
        $this->actingAsAdministrator();
        User::factory()->create(['is_active' => false]);

        $response = $this->getJson('/api/dashboard?role=Project Administrator')->assertOk();

        // actingAsAdministrator's own user + the disabled one just created.
        $response->assertJsonPath('data.admin.metrics.total_users', 2)
            ->assertJsonPath('data.admin.metrics.active_accounts', 1)
            ->assertJsonPath('data.admin.metrics.disabled_accounts', 1);
    }

    // The five tests below exercise ProjectDashboardMetrics::administratorDashboard()
    // directly — that bulk-query logic is still correct and still load-bearing
    // (ViewOnly's dashboard reuses it for its own portfolio numbers), it's
    // just no longer exposed through the Administrator role's own endpoint.

    #[Test]
    public function status_and_phase_counts_are_derived_from_actual_dates_and_lifecycle_stage(): void
    {
        Project::create(['name' => 'Not started', 'lifecycle_stage' => 'initiation']);
        Project::create([
            'name' => 'Ongoing',
            'lifecycle_stage' => 'execution',
            'actual_start_date' => now()->subDays(5),
        ]);
        Project::create([
            'name' => 'Completed',
            'lifecycle_stage' => 'closure',
            'actual_start_date' => now()->subDays(10),
            'actual_end_date' => now()->subDays(1),
        ]);

        $result = ProjectDashboardMetrics::administratorDashboard();

        $this->assertSame(3, $result['status_counts']['total']);
        $this->assertSame(1, $result['status_counts']['not_started']);
        $this->assertSame(1, $result['status_counts']['ongoing']);
        $this->assertSame(1, $result['status_counts']['completed']);
        $this->assertSame(1, $result['phase_counts']['initiation']);
        $this->assertSame(1, $result['phase_counts']['execution']);
        $this->assertSame(1, $result['phase_counts']['closure']);
        $this->assertSame(0, $result['phase_counts']['planning']);
    }

    #[Test]
    public function implementation_score_and_uat_pass_rate_ignore_nulls_correctly(): void
    {
        $scored = Project::create(['name' => 'Scored', 'overall_implementation_score' => 80]);
        Project::create(['name' => 'Unscored', 'overall_implementation_score' => null]);
        Project::create(['name' => 'Also scored', 'overall_implementation_score' => 40]);

        Requirement::create(['project_id' => $scored->id, 'requirement_code' => 'R1', 'description' => 'x', 'test_result' => 'Pass']);
        Requirement::create(['project_id' => $scored->id, 'requirement_code' => 'R2', 'description' => 'x', 'test_result' => 'Fail']);
        Requirement::create(['project_id' => $scored->id, 'requirement_code' => 'R3', 'description' => 'x', 'test_result' => null]);

        $result = ProjectDashboardMetrics::administratorDashboard();

        // average of 80 and 40, the null-scored project excluded.
        $this->assertSame(60.0, $result['implementation_score_average']);
        $this->assertSame(3, $result['requirement_total']);
        // 1 Pass out of 3 total requirements
        $this->assertSame(33.3, $result['uat_pass_rate']);
    }

    #[Test]
    public function transition_blockers_report_the_correct_reason_and_whole_days_stuck(): void
    {
        $noDocs = Project::create(['name' => 'No docs', 'lifecycle_stage' => 'initiation']);
        $noDocs->forceFill(['created_at' => now()->subDays(9)])->save();

        Project::create([
            'name' => 'Awaiting review',
            'lifecycle_stage' => 'planning',
            'plan_review_status' => 'pending_review',
            'plan_submitted_at' => now()->subDays(6),
        ]);

        $closed = Project::create([
            'name' => 'Closed already',
            'lifecycle_stage' => 'closure',
            'plan_review_status' => 'pending_review',
            'plan_submitted_at' => now()->subDays(99),
            'closed_at' => now(),
        ]);

        $blockers = collect(ProjectDashboardMetrics::administratorDashboard()['transition_blockers']);

        $this->assertNull($blockers->firstWhere('project_id', $closed->id), 'closed projects must not appear as blocked');

        $noDocsBlocker = $blockers->firstWhere('project_id', $noDocs->id);
        $this->assertSame('Initiation documents missing', $noDocsBlocker['reason']);
        $this->assertSame(9, $noDocsBlocker['days_stuck']);

        $planBlocker = $blockers->firstWhere('reason', 'Plan not reviewed');
        $this->assertSame(6, $planBlocker['days_stuck']);
    }

    #[Test]
    public function overdue_activities_are_bucketed_by_whole_days_past_planned_start(): void
    {
        $project = Project::create(['name' => 'Overdue host']);

        ImplementationActivity::create([
            'project_id' => $project->id,
            'name' => 'One day late',
            'planned_start_date' => now()->subDays(1),
        ]);
        ImplementationActivity::create([
            'project_id' => $project->id,
            'name' => 'Three days late',
            'planned_start_date' => now()->subDays(3),
        ]);
        ImplementationActivity::create([
            'project_id' => $project->id,
            'name' => 'Way overdue',
            'planned_start_date' => now()->subDays(8),
        ]);
        ImplementationActivity::create([
            'project_id' => $project->id,
            'name' => 'Already started, not overdue',
            'planned_start_date' => now()->subDays(4),
            'actual_start_date' => now()->subDays(4),
        ]);
        ImplementationActivity::create([
            'project_id' => $project->id,
            'name' => 'In the future',
            'planned_start_date' => now()->addDays(2),
        ]);

        $result = ProjectDashboardMetrics::administratorDashboard();

        $this->assertSame(3, $result['overdue_activities']['total']);
        $this->assertSame(1, $result['overdue_activities']['1_day']);
        $this->assertSame(1, $result['overdue_activities']['3_days']);
        $this->assertSame(1, $result['overdue_activities']['over_3_days']);
    }

    #[Test]
    public function advance_to_planning_and_document_uploads_are_reflected_in_awaiting_action_counts(): void
    {
        $registered = Project::create(['name' => 'Fresh registration', 'phase' => 'Registration']);
        Project::create([
            'name' => 'Pending plan',
            'plan_review_status' => 'pending_review',
        ]);
        $matrixProject = Project::create(['name' => 'Matrix project']);
        Requirement::create([
            'project_id' => $matrixProject->id,
            'requirement_code' => 'R1',
            'description' => 'x',
            'review_decision' => null,
        ]);
        Document::create([
            'project_id' => $registered->id,
            'file_name' => 'plan.pdf',
            'file_url' => 'documents/plan.pdf',
            'review_status' => 'pending',
            'uploaded_by' => User::factory()->create()->id,
            'uploaded_at' => now(),
        ]);
        $closureReady = Project::create([
            'name' => 'Ready to close',
            'plan_review_status' => 'approved',
        ]);
        ImplementationActivity::create([
            'project_id' => $closureReady->id,
            'name' => 'Done',
            'planned_start_date' => now()->subDays(5),
            'actual_start_date' => now()->subDays(5),
            'actual_end_date' => now()->subDays(1),
            'status' => 'completed',
        ]);
        Requirement::create([
            'project_id' => $closureReady->id,
            'requirement_code' => 'R1',
            'description' => 'x',
            'implementation_status' => 'Completed',
            'test_result' => 'Pass',
            'review_decision' => 'approved',
        ]);
        Document::create([
            'project_id' => $closureReady->id,
            'file_name' => 'closure.pdf',
            'file_url' => 'documents/closure.pdf',
            'is_current' => true,
            'review_status' => 'approved',
            'uploaded_by' => User::factory()->create()->id,
            'uploaded_at' => now(),
        ]);

        $result = ProjectDashboardMetrics::administratorDashboard();

        $this->assertSame(1, $result['awaiting_action']['new_registrations']);
        $this->assertSame(1, $result['awaiting_action']['plans_pending_review']);
        $this->assertSame(1, $result['awaiting_action']['matrices_pending_approval']);
        $this->assertSame(1, $result['awaiting_action']['documents_pending_review']);
        $this->assertSame(1, $result['awaiting_action']['closure_signoffs']);
    }
}
