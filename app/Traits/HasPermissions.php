<?php

namespace App\Traits;

use App\Models\Permission;
use App\Models\Role;
use App\Models\UserPermission;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property-read \Illuminate\Database\Eloquent\Collection $roles
 */
trait HasPermissions
{
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_roles')
                    ->withPivot('assigned_at', 'expires_at', 'is_active')
                    ->withTimestamps();
    }

    public function activeRoles(): BelongsToMany
    {
        return $this->roles()
                    ->where(function ($query) {
                        $query->where('user_roles.is_active', true)
                              ->orWhereNull('user_roles.is_active');
                    })
                    ->where(function ($query) {
                        $query->whereNull('user_roles.expires_at')
                              ->orWhere('user_roles.expires_at', '>', now());
                    });
    }

    public function directPermissions(): HasMany
    {
        return $this->hasMany(UserPermission::class);
    }

    public function hasRole(string $roleName): bool
    {
        return $this->activeRoles()->where('roles.name', $roleName)->exists();
    }

    public function hasPermissionTo(string $permissionCode): bool
    {
        $permission = Permission::where('code', $permissionCode)->first();

        if (!$permission) {
            return false;
        }

        // Rule 1: Check Direct User Permission Overrides (Highest Priority)
        $directOverride = $this->directPermissions()
                               ->where('permission_id', $permission->id)
                               ->first();

        if ($directOverride !== null) {
            return (bool) $directOverride->is_granted;
        }

        // Rule 2: Fallback to Role-Based Permissions
        /** @var \App\Models\Role $role */
        foreach ($this->activeRoles()->with('permissions')->get() as $role) {
            if ($role->permissions->contains('id', $permission->id)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Alias method for hasPermissionTo to maintain compatibility with FormRequests.
     */
    public function hasPermission(string $permissionCode): bool
    {
        return $this->hasPermissionTo($permissionCode);
    }

    public function permissionCodes(): array
    {
        $codes = [];

        foreach ($this->activeRoles()->with('permissions')->get() as $role) {
            foreach ($role->permissions as $permission) {
                if ($permission->code) {
                    $codes[$permission->code] = true;
                }
            }
        }

        foreach ($this->directPermissions()->with('permission')->get() as $override) {
            $code = $override->permission?->code;
            if (!$code) {
                continue;
            }

            if ($override->is_granted) {
                $codes[$code] = true;
            } else {
                unset($codes[$code]);
            }
        }

        return array_keys($codes);
    }
}