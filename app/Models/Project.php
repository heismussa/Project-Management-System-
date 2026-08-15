<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
