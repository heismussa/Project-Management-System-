<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
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
        'email', // Removed :rfc,dns to prevent local DNS lookup failures in XAMPP
        'max:255',
        'unique:users,email',
        function ($attribute, $value, $fail) {
            $allowedDomains = ['dict.go.tz', 'nssf.or.tz', 'gmail.com']; // Added gmail.com for real SMTP testing
            $domain = strtolower(substr(strrchr($value, "@"), 1));
            if (!in_array($domain, $allowedDomains)) {
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

        if (!Auth::attempt([$fieldType => $request->login, 'password' => $request->password])) {
            throw ValidationException::withMessages([
                'login' => ['The provided credentials do not match our records.'],
            ]);
        }

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message'        => 'Login successful',
            'token'          => $token,
            'email_verified' => $user->hasVerifiedEmail(),
            'user'           => $user,
        ], 200);
    }

    public function logout(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        /** @var PersonalAccessToken|null $token */
        $token = $user->currentAccessToken();

        if ($token) {
            $token->delete();
        }

        return response()->json([
            'message' => 'Logged out successfully',
        ], 200);
    }

    public function me(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        return response()->json([
            'user'        => $user,
            'permissions' => method_exists($user, 'getAllPermissions') ? $user->getAllPermissions() : [],
        ], 200);
    }

    public function verifyEmail(Request $request, string $id, string $hash)
    {
        $user = User::findOrFail($id);

        if (!hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
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
}