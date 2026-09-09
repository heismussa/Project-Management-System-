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

class ProjectArchiveTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function only_a_closed_project_can_be_downloaded_as_an_archive(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $project = Project::create(['name' => 'Still open']);

        $this->getJson("/api/projects/{$project->id}/archive")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Only a closed project can be downloaded as an archive.');
    }

    #[Test]
    public function a_closed_project_downloads_as_a_zip_with_its_documents_and_a_summary(): void
    {
        Storage::fake('local');
        Sanctum::actingAs($user = User::factory()->create());

        $project = Project::create([
            'name' => 'Finished Project',
            'category' => 'System',
            'closed_at' => now(),
        ]);
        ImplementationActivity::create([
            'project_id' => $project->id,
            'name' => 'Build it',
            'actual_start_date' => now()->subDays(5),
            'actual_end_date' => now(),
            'status' => 'completed',
        ]);
        Requirement::create([
            'project_id' => $project->id,
            'requirement_code' => 'REQ-1',
            'description' => 'It should work',
            'implementation_status' => 'Completed',
            'test_result' => 'Pass',
        ]);
        $file = UploadedFile::fake()->create('SRS.pdf', 10, 'application/pdf');
        Document::create([
            'project_id' => $project->id,
            'document_type' => 'SRS',
            'file_name' => 'SRS.pdf',
            'file_url' => $file->store('documents', 'local'),
            'file_type' => 'application/pdf',
            'file_size' => $file->getSize(),
            'is_current' => true,
            'uploaded_by' => $user->id,
            'uploaded_at' => now(),
        ]);

        $response = $this->get("/api/projects/{$project->id}/archive");

        $response->assertOk();
        $this->assertSame('application/zip', $response->headers->get('content-type'));
        $this->assertStringContainsString('attachment', $response->headers->get('content-disposition'));
    }
}
