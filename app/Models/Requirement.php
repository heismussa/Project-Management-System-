<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Requirement extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'requirement_code',
        'description',
        'implementation_status',
        'actual_start_date',
        'actual_end_date',
        'review_decision',
        'test_result',
        'remarks',
    ];

    protected $casts = [
        'actual_start_date' => 'date:Y-m-d',
        'actual_end_date' => 'date:Y-m-d',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function progressUpdates(): HasMany
    {
        return $this->hasMany(ProgressUpdate::class, 'entity_id')
            ->where('entity_type', 'requirement');
    }
}
