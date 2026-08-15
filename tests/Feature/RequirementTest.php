<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use App\Models\Project;
use App\Models\Requirement;

class RequirementTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_can_successfully_update_requirement_status_and_remarks()
    {
        $project = Project::create([
            'name' => 'Test Project'
        ]);

        $requirement = Requirement::create([
            'project_id' => $project->id,
            'requirement_code' => 'SRS-001',
            'description' => 'Test description'
        ]);

        $response = $this->patchJson("/api/requirements/{$requirement->id}/status", [
            'implementation_status' => 'Ongoing',
            'test_result' => 'Pass',
            'remarks' => 'Initial phase verified'
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Requirement status updated successfully',
                'overall_implementation_score' => '50%',
                'data' => [
                    'id' => $requirement->id,
                    'implementation_status' => 'Ongoing',
                    'test_result' => 'Pass',
                    'remarks' => 'Initial phase verified',
                ]
            ]);

        $this->assertDatabaseHas('requirements', [
            'id' => $requirement->id,
            'implementation_status' => 'Ongoing',
            'test_result' => 'Pass',
            'remarks' => 'Initial phase verified',
        ]);
    }

    #[Test]
    public function it_fails_validation_when_invalid_status_is_provided()
    {
        $project = Project::create([
            'name' => 'Test Project'
        ]);

        $requirement = Requirement::create([
            'project_id' => $project->id,
            'requirement_code' => 'SRS-001',
            'description' => 'Test description'
        ]);

        $response = $this->patchJson("/api/requirements/{$requirement->id}/status", [
            'implementation_status' => 'InvalidStatus'
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['implementation_status']);
    }
}
