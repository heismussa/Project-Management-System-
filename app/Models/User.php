<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Traits\HasPermissions;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable, HasPermissions;

    protected $fillable = [
        'name',
        'email',
        'password',
        'is_active',
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function toAuthArray(): array
    {
        $this->reactivateAssignedRolesIfNeeded();
        $this->unsetRelation('activeRoles');
        $this->load('activeRoles');

        $roles = $this->activeRoles
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
            ])
            ->values();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'is_active' => (bool) ($this->is_active ?? true),
            'role' => data_get($roles->first(), 'name'),
            'roles' => $roles,
            'permissions' => $this->permissionCodes(),
        ];
    }

    /**
     * Older sync() calls stored is_active=0, which hid every role from the UI.
     */
    public function reactivateAssignedRolesIfNeeded(): void
    {
        if ($this->roles()->exists() && ! $this->activeRoles()->exists()) {
            $this->roles()->newPivotQuery()->update(['is_active' => true]);
        }
    }
}