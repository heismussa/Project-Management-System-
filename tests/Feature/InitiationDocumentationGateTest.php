<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class InitiationDocumentationGateTest extends TestCase
{
    use RefreshDatabase;

    private function userWith(array $permissionCodes, string $roleName = 'Project Reviewer'): User
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => $roleName]);
        $ids = [];
        foreach ($permissionCodes as $code) {
            $permission = Permission::firstOrCreate(
                ['code' => $code],
                ['name' => $code, 'module' => 'test']
            );
            $ids[] = $permission->id;
        }
        $role->permissions()->syncWithoutDetaching($ids);
        $user->roles()->attach($role->id, [
            'is_active' => true,
            'assigned_at' => now(),
        ]);

        Sanctum::actingAs($user);

        return $user->fresh();
    }

    #[Test]
    public function registration_succeeds_without_any_documents_and_defaults_to_initiation(): void
    {
        $reviewer = $this->userWith(['projects.register']);
        $planner = User::factory()->create();

        $response = $this->postJson('/api/projects', [
            'annual_plan_reference' => 'NSSF-2026-APR-002',
            'category' => 'System',
            'project_type' => 'New Implementation',
            'activity_name' => 'CFMS',
            'name' => 'Gate Test Project',
            'review_track' => 'SDMM',
            'planner_id' => $planner->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.lifecycle_stage', 'initiation');

        $this->assertNotNull($reviewer);
    }

    #[Test]
    public function readiness_lists_missing_required_documents_and_ignores_optional(): void
    {
        $this->userWith(['projects.register']);
        $project = Project::create(['name' => 'Readiness Check']);

        $response = $this->getJson("/api/projects/{$project->id}/initiation-readiness");

        $response->assertOk()
            ->assertJsonPath('data.ready', false)
            ->assertJsonCount(3, 'data.documents');

        $blockers = $response->json('data.blockers');
        $this->assertCount(2, $blockers);
        $this->assertStringContainsString('Concept Note', implode(' ', $blockers));
        $this->assertStringContainsString('e-GA Approval Letter', implode(' ', $blockers));
    }

    #[Test]
    public function advance_to_planning_is_rejected_until_required_documents_are_attached(): void
    {
        $this->userWith(['projects.register']);
        $project = Project::create(['name' => 'Blocked Project']);

        $this->postJson("/api/projects/{$project->id}/advance-to-planning")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['blockers']);

        $this->assertSame('initiation', $project->fresh()->lifecycle_stage);
    }

    #[Test]
    public function uploading_required_documents_unblocks_advance_to_planning_and_versions_replacements(): void
    {
        $this->userWith(['projects.register']);
        $project = Project::create(['name' => 'Unblocked Project']);

        $upload = function (string $type, string $name) use ($project) {
            return $this->postJson("/api/projects/{$project->id}/documents", [
                'document_type' => $type,
                'file' => UploadedFile::fake()->create($name, 100, 'application/pdf'),
            ]);
        };

        $upload('concept_note', 'concept.pdf')->assertCreated()
            ->assertJsonPath('data.version_number', 1)
            ->assertJsonPath('data.is_current', true);
        $upload('ega_approval_letter', 'ega.pdf')->assertCreated();

        $readiness = $this->getJson("/api/projects/{$project->id}/initiation-readiness")->json('data');
        $this->assertTrue($readiness['ready']);
        $this->assertSame([], $readiness['blockers']);

        $this->postJson("/api/projects/{$project->id}/advance-to-planning")
            ->assertOk()
            ->assertJsonPath('data.lifecycle_stage', 'planning');

        // Replacing the concept note creates a new version and retires the old one.
        $upload('concept_note', 'concept-v2.pdf')->assertCreated()
            ->assertJsonPath('data.version_number', 2)
            ->assertJsonPath('data.is_current', true);

        $this->assertSame(2, $project->documents()->where('document_type', 'concept_note')->count());
        $this->assertSame(
            1,
            $project->documents()->where('document_type', 'concept_note')->where('is_current', true)->count()
        );
    }

    #[Test]
    public function document_upload_rejects_unknown_document_types_and_bad_file_kinds(): void
    {
        $this->userWith(['projects.register']);
        $project = Project::create(['name' => 'Validation Project']);

        $this->postJson("/api/projects/{$project->id}/documents", [
            'document_type' => 'not_a_real_type',
            'file' => UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors(['document_type']);

        $this->postJson("/api/projects/{$project->id}/documents", [
            'document_type' => 'concept_note',
            'file' => UploadedFile::fake()->create('doc.exe', 10, 'application/octet-stream'),
        ])->assertStatus(422)->assertJsonValidationErrors(['file']);
    }
}
