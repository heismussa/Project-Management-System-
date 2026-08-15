<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use app\Models\Project;

class Requirement extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'requirement_code',
        'description',
        'implementation_status',
        'review_decision',
        'test_result',
        'remarks',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
