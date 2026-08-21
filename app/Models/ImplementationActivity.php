<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ImplementationActivity extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'planned_start_date' => 'date',
        'planned_end_date' => 'date',
        'actual_start_date' => 'date',
        'actual_end_date' => 'date',
        'pending_changes' => 'array',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function responsiblePerson(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_person_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class, 'activity_id');
    }

    public function progressUpdates(): HasMany
    {
        return $this->hasMany(ProgressUpdate::class, 'entity_id')
            ->where('entity_type', 'activity');
    }
}
