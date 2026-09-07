<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Document;
use App\Models\Permission;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    private function createIctSupportUser(): User
    {
        $permission = Permission::create([
            'code' => 'admin.manage_users',
            'name' => 'Manage Users and Roles',
            'module' => 'admin',
        ]);
        $role = Role::create([
            'name' => 'ICT Support',
            'description' => 'Manages user accounts and role assignment',
        ]);
        $role->permissions()->sync([$permission->id]);

        $user = User::factory()->create(['name' => 'ICT Officer', 'email' => 'ictsupport@nssf.go.tz']);
        $user->roles()->attach($role->id, ['is_active' => true, 'assigned_at' => now()]);

        return $user->fresh();
    }

    #[Test]
    public function successful_login_is_recorded(): void
    {
        $user = User::factory()->create(['email' => 'planner@nssf.or.tz']);

        $this->postJson('/api/login', [
            'login' => $user->email,
            'password' => 'password',
        ])->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'login_success',
        ]);
    }

    #[Test]
    public function failed_login_against_a_real_account_is_recorded(): void
    {
        $user = User::factory()->create(['email' => 'planner@nssf.or.tz']);

        $this->postJson('/api/login', [
            'login' => $user->email,
            'password' => 'wrong-password',
        ])->assertStatus(422);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'login_failed',
        ]);
    }

    #[Test]
    public function failed_login_against_an_unknown_email_is_not_recorded(): void
    {
        $this->postJson('/api/login', [
            'login' => 'nobody-like-this@nssf.or.tz',
            'password' => 'whatever123',
        ])->assertStatus(422);

        $this->assertDatabaseCount('audit_logs', 0);
    }

    #[Test]
    public function logout_is_recorded(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/logout')->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'logout',
        ]);
    }

    #[Test]
    public function viewing_a_document_is_recorded(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $project = Project::create(['name' => 'Audit Project']);
        $file = UploadedFile::fake()->create('SRS.pdf', 50, 'application/pdf');
        $path = $file->store('documents', 'local');

        $document = Document::create([
            'project_id' => $project->id,
            'document_type' => 'SRS',
            'file_name' => 'SRS.pdf',
            'file_url' => $path,
            'file_type' => 'application/pdf',
            'file_size' => $file->getSize(),
            'uploaded_by' => $user->id,
            'uploaded_at' => now(),
        ]);

        Sanctum::actingAs($user);
        $this->get("/api/documents/{$document->id}/file")->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'document_viewed',
        ]);
    }

    #[Test]
    public function only_ict_support_or_administrator_can_read_the_audit_log(): void
    {
        AuditLog::create(['user_id' => null, 'action' => 'login_success']);

        $planner = User::factory()->create();
        Sanctum::actingAs($planner);
        $this->getJson('/api/admin/audit-logs')->assertForbidden();

        $ict = $this->createIctSupportUser();
        Sanctum::actingAs($ict);
        $this->getJson('/api/admin/audit-logs')
            ->assertOk()
            ->assertJsonStructure(['data', 'current_page', 'total']);
    }
}
