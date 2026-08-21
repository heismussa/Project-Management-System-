<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name'  => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:users,email',
                function ($attribute, $value, $fail) {
                    $allowedDomains = ['dict.go.tz', 'nssf.or.tz', 'gmail.com'];
                    $domain = strtolower((string) substr((string) strrchr($value, '@'), 1));
                    if (! in_array($domain, $allowedDomains, true)) {
                        $fail('Registration is restricted to authorized domains (@dict.go.tz, @nssf.or.tz, @gmail.com).');
                    }
                },
            ],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'User registered successfully. A verification link has been sent to your email address.',
            'user'    => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'login'    => 'required|string',
            'password' => 'required|string',
        ]);

        $fieldType = filter_var($request->login, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';

        if (! Auth::attempt([$fieldType => $request->login, 'password' => $request->password])) {
            throw ValidationException::withMessages([
                'login' => ['The provided credentials do not match our records.'],
            ]);
        }

        /** @var \App\Models\User $user */
        $user = Auth::user();

        if ($user->is_active === false) {
            Auth::logout();
            throw ValidationException::withMessages([
                'login' => ['This account is disabled. Contact ICT Support.'],
            ]);
        }

        $this->ensureKnownAccountHasRole($user);
        $user->refresh();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message'        => 'Login successful',
            'token'          => $token,
            'email_verified' => true,
            'user'           => $user->toAuthArray(),
        ], 200);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        /** @var PersonalAccessToken|null $token */
        $token = $user?->currentAccessToken();

        if ($token) {
            $token->delete();
        }

        return response()->json(['message' => 'Logout successful'], 200);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->ensureKnownAccountHasRole($user);
        $user->refresh();

        return response()->json([
            'data'           => $user->toAuthArray(),
            'user'           => $user->toAuthArray(),
            'email_verified' => $user->hasVerifiedEmail(),
            'permissions'    => $user->permissionCodes(),
        ], 200);
    }

    public function users(): JsonResponse
    {
        $users = User::query()
            ->with('activeRoles')
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->activeRoles
                    ->map(fn ($role) => [
                        'id' => $role->id,
                        'name' => $role->name,
                    ])
                    ->values(),
            ]);

        return response()->json(['data' => $users]);
    }

    public function verifyEmail(Request $request, string $id, string $hash)
    {
        $user = User::findOrFail($id);

        if (! hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            return response()->json(['message' => 'Invalid or expired verification link.'], 403);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email address is already verified.'], 200);
        }

        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return response()->json(['message' => 'Email address verified successfully.'], 200);
    }

    public function resendVerification(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email address is already verified.'], 400);
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['message' => 'Verification email link resent successfully.'], 200);
    }

    private function ensureKnownAccountHasRole(User $user): void
    {
        if ($user->roles()->exists()) {
            return;
        }

        $roleByEmail = [
            'mussasaid@gmail.com' => 'Project Administrator',
            'sms.mussasaid@gmail.com' => 'Project Administrator',
            'luquman2004tajir@gmail.com' => 'Project Reviewer',
            'ictsupport@nssf.go.tz' => 'ICT Support',
            'coordinator@nssf.or.tz' => 'Project Coordinator',
            'approver@nssf.or.tz' => 'Project Approver',
            'planner@nssf.or.tz' => 'Project Planner',
            'implementor@nssf.or.tz' => 'Project Implementor',
            'viewonly@nssf.or.tz' => 'Project ViewOnly',
        ];

        $roleName = $roleByEmail[strtolower((string) $user->email)] ?? null;
        if (! $roleName) {
            return;
        }

        $role = \App\Models\Role::where('name', $roleName)->first();
        if (! $role) {
            return;
        }

        $user->roles()->sync([
            $role->id => ['is_active' => true, 'assigned_at' => now()],
        ]);
    }
}
