<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The security/access audit trail — who logged in, who failed to, who
 * logged out, and the actions taken across the system (approvals, closures,
 * edits). Routine reads like opening a document aren't logged here — only
 * actions, so the trail stays meaningful instead of getting drowned in views.
 */
class AuditLog extends Model
{
    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
