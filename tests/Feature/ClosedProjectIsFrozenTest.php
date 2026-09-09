<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\ImplementationActivity;
use App\Models\Project;
use App\Models\Requirement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Once a project is closed, nothing under it can change — regardless of
 * role, and regardless of whether that role's own part of the workflow
 * already passed. Viewing (GET) stays open; every mutation is blocked.
 */
class ClosedProjectIsFrozenTest extends TestCase
{
    use RefreshDatabase;

    private function closedProject(): Project
    {
        $planner = User::factory()->create();

        return Project::create([
            'name' => 'Frozen Project',
            'category' => 'System',
            'planner_id' => $planner->id,
            'closed_at' => now(),
        ]);
    }

    #[Test]
    public function activities_cannot_be_created_updated_or_deleted_on_a_closed_project(): void
    {
        $project = $this->closedProject();
        Sanctum::actingAs(User::find($project->planner_id));

        $this->postJson('/api/activities', [
            'project_id' => $project->id,
            'name' => 'New activity',
            'expected_deliverable' => 'X',
            'planned_start_date' => now()->toDateString(),
            'planned_end_date' => now()->addDays(5)->toDateString(),
            'responsible_person_id' => $project->planner_id,
        ])->assertStatus(422)->assertJsonPath('errors.project.0', 'This project is closed and can no longer be changed.');

        $activity = ImplementationActivity::create([
            'project_id' => $project->id,
            'name' => 'Existing activity',
        ]);

        $this->putJson("/api/activities/{$activity->id}", ['name' => 'Renamed'])
            ->assertStatus(422)
            ->assertJsonPath('errors.project.0', 'This project is closed and can no longer be changed.');

        $this->deleteJson("/api/activities/{$activity->id}")
            ->assertStatus(422);

        $this->assertDatabaseHas('implementation_activities', ['id' => $activity->id, 'name' => 'Existing activity']);
    }

    #[Test]
    public function requirements_cannot_be_created_updated_or_reviewed_on_a_closed_project(): void
    {
        $project = $this->closedProject();
        Sanctum::actingAs(User::find($project->planner_id));

        $this->postJson('/api/requirements', [
            'project_id' => $project->id,
            'requirement_code' => 'REQ-1',
            'description' => 'Something',
        ])->assertStatus(422);

        $requirement = Requirement::create([
            'project_id' => $project->id,
            'requirement_code' => 'REQ-2',
            'description' => 'Existing',
        ]);

        $this->putJson("/api/requirements/{$requirement->id}", [
            'requirement_code' => 'REQ-2',
            'description' => 'Changed',
        ])->assertStatus(422);

        $this->patchJson("/api/requirements/{$requirement->id}/review", [
            'review_decision' => 'approved',
        ])->assertStatus(422);

        $this->assertDatabaseHas('requirements', ['id' => $requirement->id, 'description' => 'Existing']);
    }

    #[Test]
    public function documents_cannot_be_uploaded_or_deleted_on_a_closed_project(): void
    {
        Storage::fake('local');
        $project = $this->closedProject();
        Sanctum::actingAs(User::find($project->planner_id));

        $this->postJson('/api/documents', [
            'project_id' => $project->id,
            'file' => UploadedFile::fake()->create('SRS.pdf', 10, 'application/pdf'),
        ])->assertStatus(422);

        $document = Document::create([
            'project_id' => $project->id,
            'file_name' => 'Existing.pdf',
            'file_url' => 'documents/existing.pdf',
            'is_current' => true,
            'uploaded_by' => $project->planner_id,
            'uploaded_at' => now(),
        ]);

        $this->deleteJson("/api/documents/{$document->id}")->assertStatus(422);

        $this->assertDatabaseHas('documents', ['id' => $document->id]);
    }

    #[Test]
    public function viewing_a_closed_project_and_its_activities_still_works(): void
    {
        $project = $this->closedProject();
        ImplementationActivity::create(['project_id' => $project->id, 'name' => 'Done activity']);
        Sanctum::actingAs(User::find($project->planner_id));

        $this->getJson("/api/projects/{$project->id}")->assertOk();
        $this->getJson("/api/projects/{$project->id}/activities")->assertOk()->assertJsonCount(1, 'data');
    }
}
