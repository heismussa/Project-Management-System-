<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Project extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function requirements()
    {
        return $this->hasMany(Requirement::class);
    }

    public function implementationActivities()
    {
        return $this->hasMany(ImplementationActivity::class);
    }
}
    protected $fillable = [
        'annual_plan_reference',
        'category',
        'project_type',
        'activity_name',
        'name',
        'description',
        'budget',
        'team_type',
        'planner_id',
        'reviewer_id',
        'coordinator_id',
        'status',
        'phase',
        'planned_start_date',
        'planned_end_date',
        'actual_start_date',
        'actual_end_date',
        'overall_implementation_score',
    ];

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    public function planner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'planner_id');
    }

    public function coordinator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'coordinator_id');
    }
}
