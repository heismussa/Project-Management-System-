<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\ImplementationActivity;
use App\Models\Project;
use App\Models\Requirement;
use App\Models\Review;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReviewerDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsReviewer(): User
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'Project Reviewer']);
        $user->roles()->attach($role->id, ['is_active' => true, 'assigned_at' => now()]);
        Sanctum::actingAs($user);

        return $user;
    }

    #[Test]
    public function dashboard_only_includes_reviewer_block_for_project_reviewer(): void
    {
        $this->actingAsReviewer();

        $this->getJson('/api/dashboard?role=Project Reviewer')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'reviewer' => [
                        'queue' => ['new_registrations', 'plans_pending', 'matrices_pending', 'documents_pending', 'returned_unresolved', 'closure_signoffs'],
                        'review_load',
                        'turnaround' => ['avg_review_days', 'reviewed_this_month', 'backlog', 'return_rate'],
                    ],
                ],
            ]);

        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'Project Planner']);
        $user->roles()->attach($role->id, ['is_active' => true, 'assigned_at' => now()]);
        Sanctum::actingAs($user);

        $this->getJson('/api/dashboard?role=Project Planner')
            ->assertOk()
            ->assertJsonMissingPath('data.reviewer');
    }

    #[Test]
    public function new_registrations_only_counts_initiation_projects_missing_required_docs(): void
    {
        $this->actingAsReviewer();

        $blocked = Project::create(['name' => 'Missing docs', 'lifecycle_stage' => 'initiation']);
        $clean = Project::create(['name' => 'Has docs', 'lifecycle_stage' => 'initiation']);
        Document::create([
            'project_id' => $clean->id,
            'document_type' => 'concept_note',
            'is_current' => true,
            'file_name' => 'concept.pdf',
            'file_url' => 'documents/concept.pdf',
            'uploaded_by' => User::factory()->create()->id,
            'uploaded_at' => now(),
        ]);
        Document::create([
            'project_id' => $clean->id,
            'document_type' => 'ega_approval_letter',
            'is_current' => true,
            'file_name' => 'ega.pdf',
            'file_url' => 'documents/ega.pdf',
            'uploaded_by' => User::factory()->create()->id,
            'uploaded_at' => now(),
        ]);
        Project::create(['name' => 'Not initiation', 'lifecycle_stage' => 'planning']);

        $response = $this->getJson('/api/dashboard?role=Project Reviewer')->assertOk();

        $response->assertJsonPath('data.reviewer.queue.new_registrations', 1);
        $this->assertNotNull($blocked);
    }

    #[Test]
    public function plans_pending_uses_the_plan_status_field(): void
    {
        $this->actingAsReviewer();

        Project::create(['name' => 'Pending via plan_status', 'plan_status' => 'pending_review']);
        // plan_review_status alone must NOT count — the ERD field is plan_status.
        Project::create(['name' => 'Pending via review_status only', 'plan_review_status' => 'pending_review']);

        $this->getJson('/api/dashboard?role=Project Reviewer')
            ->assertOk()
            ->assertJsonPath('data.reviewer.queue.plans_pending', 1);
    }

    #[Test]
    public function returned_unresolved_excludes_documents_with_a_newer_current_version(): void
    {
        $this->actingAsReviewer();
        $project = Project::create(['name' => 'Doc project']);
        $uploader = User::factory()->create();

        Document::create([
            'project_id' => $project->id,
            'document_type' => 'Implementation Plan',
            'review_status' => 'returned',
            'is_current' => false,
            'version_number' => 1,
            'file_name' => 'v1.pdf',
            'file_url' => 'documents/v1.pdf',
            'uploaded_by' => $uploader->id,
            'uploaded_at' => now(),
        ]);
        Document::create([
            'project_id' => $project->id,
            'document_type' => 'Implementation Plan',
            'review_status' => 'pending',
            'is_current' => true,
            'version_number' => 2,
            'file_name' => 'v2.pdf',
            'file_url' => 'documents/v2.pdf',
            'uploaded_by' => $uploader->id,
            'uploaded_at' => now(),
        ]);

        $stillStuck = Project::create(['name' => 'Still stuck']);
        Document::create([
            'project_id' => $stillStuck->id,
            'document_type' => 'Implementation Plan',
            'review_status' => 'returned',
            'is_current' => true,
            'version_number' => 1,
            'file_name' => 'stuck.pdf',
            'file_url' => 'documents/stuck.pdf',
            'uploaded_by' => $uploader->id,
            'uploaded_at' => now(),
        ]);

        $this->getJson('/api/dashboard?role=Project Reviewer')
            ->assertOk()
            ->assertJsonPath('data.reviewer.queue.returned_unresolved', 1);
    }

    #[Test]
    public function review_load_groups_received_and_completed_by_month_of_reviewed_at(): void
    {
        $this->actingAsReviewer();
        $project = Project::create(['name' => 'Load project']);
        $reviewer = User::factory()->create();

        Review::create([
            'project_id' => $project->id,
            'entity_type' => 'plan',
            'entity_id' => $project->id,
            'reviewer_id' => $reviewer->id,
            'decision' => 'submitted',
            'reviewed_at' => now()->startOfYear()->addMonths(2)->addDays(2),
        ]);
        Review::create([
            'project_id' => $project->id,
            'entity_type' => 'plan',
            'entity_id' => $project->id,
            'reviewer_id' => $reviewer->id,
            'decision' => 'approved',
            'reviewed_at' => now()->startOfYear()->addMonths(2)->addDays(5),
        ]);

        $response = $this->getJson('/api/dashboard?role=Project Reviewer')->assertOk();
        $march = collect($response->json('data.reviewer.review_load'))->firstWhere('month', 'Mar');

        $this->assertSame(1, $march['received']);
        $this->assertSame(1, $march['completed']);
    }

    #[Test]
    public function turnaround_pairs_each_decision_with_its_own_project_submission_and_averages_whole_days(): void
    {
        $this->actingAsReviewer();
        $project = Project::create(['name' => 'Turnaround project']);
        $reviewer = User::factory()->create();
        $submittedAt = now()->subDays(10);

        Review::create([
            'project_id' => $project->id,
            'entity_type' => 'plan',
            'entity_id' => $project->id,
            'reviewer_id' => $reviewer->id,
            'decision' => 'submitted',
            'reviewed_at' => $submittedAt,
        ]);
        Review::create([
            'project_id' => $project->id,
            'entity_type' => 'plan',
            'entity_id' => $project->id,
            'reviewer_id' => $reviewer->id,
            'decision' => 'approved',
            'reviewed_at' => $submittedAt->copy()->addDays(4),
        ]);

        $this->getJson('/api/dashboard?role=Project Reviewer')
            ->assertOk()
            ->assertJsonPath('data.reviewer.turnaround.avg_review_days', 4);
    }

    #[Test]
    public function return_rate_counts_only_rejected_and_needs_revision_decisions(): void
    {
        $this->actingAsReviewer();
        $project = Project::create(['name' => 'Return rate project']);
        $reviewer = User::factory()->create();

        foreach (['approved', 'approved', 'approved', 'rejected'] as $decision) {
            Review::create([
                'project_id' => $project->id,
                'entity_type' => 'requirement',
                'entity_id' => 1,
                'reviewer_id' => $reviewer->id,
                'decision' => $decision,
                'reviewed_at' => now(),
            ]);
        }
        // 'returned' (plan/document vocabulary) must NOT count toward return_rate.
        Review::create([
            'project_id' => $project->id,
            'entity_type' => 'plan',
            'entity_id' => $project->id,
            'reviewer_id' => $reviewer->id,
            'decision' => 'returned',
            'reviewed_at' => now(),
        ]);

        $this->getJson('/api/dashboard?role=Project Reviewer')
            ->assertOk()
            // 1 rejected out of 5 total decisions = 20%. json_encode drops the
            // trailing .0 on whole-number floats, so this decodes as an int.
            ->assertJsonPath('data.reviewer.turnaround.return_rate', 20);
    }

    #[Test]
    public function backlog_sums_all_six_queue_cards(): void
    {
        $this->actingAsReviewer();

        Project::create(['name' => 'Pending plan', 'plan_status' => 'pending_review']);
        $matrixProject = Project::create(['name' => 'Matrix project']);
        Requirement::create(['project_id' => $matrixProject->id, 'requirement_code' => 'R1', 'description' => 'x']);

        $response = $this->getJson('/api/dashboard?role=Project Reviewer')->assertOk();
        $queue = $response->json('data.reviewer.queue');
        $expected = array_sum($queue);

        $response->assertJsonPath('data.reviewer.turnaround.backlog', $expected);
        $this->assertGreaterThan(0, $expected);
    }

    #[Test]
    public function closure_signoffs_requires_every_gate_to_pass(): void
    {
        $this->actingAsReviewer();
        $ready = Project::create(['name' => 'Ready', 'plan_review_status' => 'approved']);
        $uploader = User::factory()->create();

        ImplementationActivity::create([
            'project_id' => $ready->id,
            'name' => 'Done',
            'planned_start_date' => now()->subDays(5),
            'actual_start_date' => now()->subDays(5),
            'actual_end_date' => now()->subDays(1),
            'status' => 'completed',
        ]);
        Requirement::create([
            'project_id' => $ready->id,
            'requirement_code' => 'R1',
            'description' => 'x',
            'implementation_status' => 'Completed',
            'test_result' => 'Pass',
        ]);
        Document::create([
            'project_id' => $ready->id,
            'is_current' => true,
            'review_status' => 'approved',
            'file_name' => 'f.pdf',
            'file_url' => 'documents/f.pdf',
            'uploaded_by' => $uploader->id,
            'uploaded_at' => now(),
        ]);

        Project::create(['name' => 'Not ready', 'plan_review_status' => 'approved']);

        $this->getJson('/api/dashboard?role=Project Reviewer')
            ->assertOk()
            ->assertJsonPath('data.reviewer.queue.closure_signoffs', 1);
    }
}
