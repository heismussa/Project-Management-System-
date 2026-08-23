<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AssignUserRolesRequest;
use App\Http\Requests\StoreManagedUserRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UserManagementController extends Controller
{
    public const ICT_SUPPORT_ROLE = 'ICT Support';

    public function index(): JsonResponse
    {
        $users = User::query()
            ->with('activeRoles')
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => $this->serializeUser($user));

        return response()->json(['data' => $users]);
    }

    public function roles(): JsonResponse
    {
        $roles = Role::query()
            ->orderBy('name')
            ->get(['id', 'name', 'description']);

        return response()->json(['data' => $roles]);
    }

    public function store(StoreManagedUserRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $roleIds = array_values(array_unique($validated['role_ids'] ?? []));

        $user = DB::transaction(function () use ($validated, $roleIds) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
            ]);

            $this->syncUserRoles($user, $roleIds);

            return $user->load('activeRoles');
        });

        return response()->json([
            'message' => 'User created successfully.',
            'data' => $this->serializeUser($user),
        ], 201);
    }

    public function syncRoles(AssignUserRolesRequest $request, User $user): JsonResponse
    {
        $roleIds = array_values(array_unique($request->validated('role_ids')));

        $this->guardLastIctSupport($user, $roleIds);
        $this->syncUserRoles($user, $roleIds);

        $user->load('activeRoles');

        return response()->json([
            'message' => 'Roles assigned successfully.',
            'data' => $this->serializeUser($user),
        ]);
    }

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

    private function guardLastIctSupport(User $target, array $newRoleIds): void
    {
        $ictRole = Role::where('name', self::ICT_SUPPORT_ROLE)->first();
        if (!$ictRole) {
            return;
        }

        $currentlyHas = $target->activeRoles()->where('roles.id', $ictRole->id)->exists();
        $willHave = in_array($ictRole->id, $newRoleIds, true);

        if (!$currentlyHas || $willHave) {
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
            'created_at' => $user->created_at,
            'roles' => $roles,
        ];
    }
}
