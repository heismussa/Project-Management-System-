<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use app\Models\Project;
use app\Models\Document;

class ImplementationActivity extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function documents()
    {
        return $this->hasMany(Document::class, 'activity_id');
    }
}
