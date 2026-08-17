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
                    ->wherePivot('is_active', true)
                    ->withPivot('assigned_at', 'expires_at');
    }

    public function directPermissions(): HasMany
    {
        return $this->hasMany(UserPermission::class);
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
        foreach ($this->roles()->get() as $role) {
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
}