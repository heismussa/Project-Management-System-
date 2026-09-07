<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\ImplementationActivity;
use App\Models\Permission;
use App\Models\Project;
use App\Models\Requirement;
use App\Models\Role;
use App\Models\User;
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
    public function status_and_phase_counts_are_derived_from_actual_dates_and_lifecycle_stage(): void
    {
        $this->actingAsAdministrator();

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

        $response = $this->getJson('/api/dashboard?role=Project Administrator')->assertOk();

        $response->assertJsonPath('data.admin.status_counts.total', 3)
            ->assertJsonPath('data.admin.status_counts.not_started', 1)
            ->assertJsonPath('data.admin.status_counts.ongoing', 1)
            ->assertJsonPath('data.admin.status_counts.completed', 1)
            ->assertJsonPath('data.admin.phase_counts.initiation', 1)
            ->assertJsonPath('data.admin.phase_counts.execution', 1)
            ->assertJsonPath('data.admin.phase_counts.closure', 1)
            ->assertJsonPath('data.admin.phase_counts.planning', 0);
    }

    #[Test]
    public function implementation_score_and_uat_pass_rate_ignore_nulls_correctly(): void
    {
        $this->actingAsAdministrator();

        $scored = Project::create(['name' => 'Scored', 'overall_implementation_score' => 80]);
        Project::create(['name' => 'Unscored', 'overall_implementation_score' => null]);
        Project::create(['name' => 'Also scored', 'overall_implementation_score' => 40]);

        Requirement::create(['project_id' => $scored->id, 'requirement_code' => 'R1', 'description' => 'x', 'test_result' => 'Pass']);
        Requirement::create(['project_id' => $scored->id, 'requirement_code' => 'R2', 'description' => 'x', 'test_result' => 'Fail']);
        Requirement::create(['project_id' => $scored->id, 'requirement_code' => 'R3', 'description' => 'x', 'test_result' => null]);

        $response = $this->getJson('/api/dashboard?role=Project Administrator')->assertOk();

        // average of 80 and 40, the null-scored project excluded. json_encode drops
        // the trailing .0 on whole-number floats, so this decodes back as an int.
        $response->assertJsonPath('data.admin.implementation_score_average', 60)
            ->assertJsonPath('data.admin.requirement_total', 3)
            // 1 Pass out of 3 total requirements
            ->assertJsonPath('data.admin.uat_pass_rate', 33.3);
    }

    #[Test]
    public function transition_blockers_report_the_correct_reason_and_whole_days_stuck(): void
    {
        $this->actingAsAdministrator();

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

        $response = $this->getJson('/api/dashboard?role=Project Administrator')->assertOk();
        $blockers = collect($response->json('data.admin.transition_blockers'));

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
        $this->actingAsAdministrator();
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

        $response = $this->getJson('/api/dashboard?role=Project Administrator')->assertOk();

        $response->assertJsonPath('data.admin.overdue_activities.total', 3)
            ->assertJsonPath('data.admin.overdue_activities.1_day', 1)
            ->assertJsonPath('data.admin.overdue_activities.3_days', 1)
            ->assertJsonPath('data.admin.overdue_activities.over_3_days', 1);
    }

    #[Test]
    public function advance_to_planning_and_document_uploads_are_reflected_in_awaiting_action_counts(): void
    {
        $this->actingAsAdministrator();

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

        $response = $this->getJson('/api/dashboard?role=Project Administrator')->assertOk();

        $response->assertJsonPath('data.admin.awaiting_action.new_registrations', 1)
            ->assertJsonPath('data.admin.awaiting_action.plans_pending_review', 1)
            ->assertJsonPath('data.admin.awaiting_action.matrices_pending_approval', 1)
            ->assertJsonPath('data.admin.awaiting_action.documents_pending_review', 1)
            ->assertJsonPath('data.admin.awaiting_action.closure_signoffs', 1);
    }
}
