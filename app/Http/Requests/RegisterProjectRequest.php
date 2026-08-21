<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('projects.register');
    }

    public function rules(): array
    {
        return [
            'annual_plan_reference' => 'required|string|max:100',
            'category' => 'required|in:System,Infrastructure,Security',
            'project_type' => 'required|in:New Implementation,Review/Enhancement',
            'activity_name' => 'required|string|max:255',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'budget' => 'nullable|numeric|min:0',
            'team_type' => 'nullable|string',
            'planner_id' => 'nullable|exists:users,id',
            'planned_start_date' => 'nullable|date',
            'planned_end_date' => 'nullable|date|after_or_equal:planned_start_date',
        ];
    }
}