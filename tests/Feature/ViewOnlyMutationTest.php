<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ViewOnlyMutationTest extends TestCase
{
    use RefreshDatabase;

    private function viewOnlyUser(): User
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'Project ViewOnly']);
        $user->roles()->attach($role->id, ['is_active' => true, 'assigned_at' => now()]);
        Sanctum::actingAs($user);

        return $user->fresh();
    }

    #[Test]
    public function view_only_can_read_projects_but_cannot_create_them(): void
    {
        $this->viewOnlyUser();
        Project::create(['name' => 'Readable']);

        $this->getJson('/api/projects')->assertOk();

        $this->postJson('/api/projects', [
            'name' => 'Blocked',
            'annual_plan_reference' => 'APR-1',
            'category' => 'System',
            'project_type' => 'New Implementation',
            'activity_name' => 'Documentation & Planning',
            'review_track' => 'SDMM',
            'planner_id' => User::factory()->create()->id,
        ])->assertForbidden();
    }

    #[Test]
    public function view_only_cannot_mutate_activities(): void
    {
        $this->viewOnlyUser();
        $project = Project::create(['name' => 'Plan']);

        $this->postJson('/api/activities', [
            'project_id' => $project->id,
            'name' => 'Kickoff',
            'expected_deliverable' => 'Minutes',
            'planned_start_date' => '2026-01-01',
            'planned_end_date' => '2026-01-05',
            'responsible_person_id' => User::factory()->create()->id,
        ])->assertForbidden();
    }
}
