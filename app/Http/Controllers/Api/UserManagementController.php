<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AssignUserRolesRequest;
use App\Http\Requests\StoreManagedUserRequest;
use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use App\Models\UserActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class UserManagementController extends Controller
{
    public const ICT_SUPPORT_ROLE = 'ICT Support';

    /**
     * List all users with active roles.
     */
    public function index(): JsonResponse
    {
        $users = User::query()
            ->with('activeRoles')
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => $this->serializeUser($user));

        return response()->json(['data' => $users]);
    }

    /**
     * List available roles for user creation and assignment.
     */
    public function roles(): JsonResponse
    {
        $roles = Role::query()
            ->orderBy('name')
            ->get(['id', 'name', 'description']);

        return response()->json(['data' => $roles]);
    }

    /**
     * Create a new managed user and assign roles.
     */
    public function store(StoreManagedUserRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $roleIds = array_values(array_unique($validated['role_ids'] ?? []));

        $user = DB::transaction(function () use ($validated, $roleIds, $request) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            UserActivityLog::create([
                'user_id' => $user->id,
                'action' => 'account_created',
                'performed_by' => $request->user()?->id,
            ]);
            $this->mirrorToAuditLog($request, 'account_created', "New account: {$user->email}");

            $this->syncUserRoles($user, $roleIds);

            return $user->load('activeRoles');
        });

        return response()->json([
            'message' => 'User created successfully.',
            'data' => $this->serializeUser($user),
        ], 201);
    }

    /**
     * Sync assigned roles for an existing user.
     */
    public function syncRoles(AssignUserRolesRequest $request, User $user): JsonResponse
    {
        $roleIds = array_values(array_unique($request->validated('role_ids')));

        $this->guardLastIctSupport($user, $roleIds);
        $this->syncUserRoles($user, $roleIds);

        if ($roleIds !== []) {
            UserActivityLog::create([
                'user_id' => $user->id,
                'action' => 'role_assigned',
                'performed_by' => $request->user()?->id,
            ]);
            $this->mirrorToAuditLog($request, 'role_assigned', "Roles updated for {$user->email}");
        }

        $user->load('activeRoles');

        return response()->json([
            'message' => 'Roles assigned successfully.',
            'data' => $this->serializeUser($user),
        ]);
    }

    /**
     * Update user password (Person 1 Requirement)
     */
    public function updatePassword(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'string', 'confirmed', Password::min(8)->numbers()],
        ]);

        $user->update([
            'password' => $validated['password'],
        ]);

        UserActivityLog::create([
            'user_id' => $user->id,
            'action' => 'password_reset',
            'performed_by' => $request->user()?->id,
        ]);
        $this->mirrorToAuditLog($request, 'password_reset', "Password reset for {$user->email}");

        return response()->json(['message' => 'Password updated successfully.']);
    }

    /**
     * Toggle account active status (Person 1 Requirement)
     */
    public function toggleStatus(Request $request, User $user): JsonResponse
    {
        if ($user->is_active) {
            $this->guardLastIctSupport($user, []);
        }

        $user->is_active = ! $user->is_active;
        $user->save();

        UserActivityLog::create([
            'user_id' => $user->id,
            'action' => $user->is_active ? 'account_enabled' : 'account_disabled',
            'performed_by' => $request->user()?->id,
        ]);
        $this->mirrorToAuditLog(
            $request,
            $user->is_active ? 'account_enabled' : 'account_disabled',
            $user->email,
        );

        return response()->json([
            'message' => $user->is_active ? 'User enabled.' : 'User disabled.',
            'data' => $this->serializeUser($user->load('activeRoles')),
        ]);
    }

    /**
     * Attach/detach pivot entries for user roles.
     */
    private function syncUserRoles(User $user, array $roleIds): void
    {
        $payload = [];
        $assignedAt = now();

        foreach ($roleIds as $roleId) {
            $payload[$roleId] = [
                'is_active' => true,
                'assigned_at' => $assignedAt,
            ];
        }

        $user->roles()->sync($payload);
    }

    /**
     * Safety Guard: Prevent removing the last remaining ICT Support account.
     */
    private function guardLastIctSupport(User $target, array $newRoleIds): void
    {
        $ictRole = Role::where('name', self::ICT_SUPPORT_ROLE)->first();
        if (! $ictRole) {
            return;
        }

        $currentlyHas = $target->activeRoles()->where('roles.id', $ictRole->id)->exists();
        $willHave = in_array($ictRole->id, $newRoleIds, true);

        if (! $currentlyHas || $willHave) {
            return;
        }

        $otherIctSupport = DB::table('user_roles')
            ->where('role_id', $ictRole->id)
            ->where('is_active', true)
            ->where('user_id', '!=', $target->id)
            ->count();

        if ($otherIctSupport === 0) {
            throw ValidationException::withMessages([
                'role_ids' => ['Cannot remove the last ICT Support role. Assign it to another user first.'],
            ]);
        }
    }

    /**
     * These account-management events already write to UserActivityLog for
     * the ICT Support dashboard's small "recent activity" widget — this also
     * puts them on the full security audit trail, so that page is the one
     * complete record instead of two partial ones. The dashboard widget's
     * own query is untouched.
     */
    private function mirrorToAuditLog(Request $request, string $action, ?string $description = null): void
    {
        if (! $request->user()) {
            return;
        }

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => $action,
            'description' => $description,
            'ip_address' => $request->ip(),
        ]);
    }

    /**
     * Format user payload with active role associations.
     */
    private function serializeUser(User $user): array
    {
        $roles = $user->activeRoles
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'assigned_at' => $role->pivot?->assigned_at,
            ])
            ->values();

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_active' => (bool) $user->is_active,
            'created_at' => $user->created_at,
            'roles' => $roles,
        ];
    }
}
