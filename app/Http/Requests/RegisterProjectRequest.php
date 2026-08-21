<?php

namespace App\Http\Requests;

use App\Support\ProjectCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermissionTo('projects.register') ?? false;
    }

    public function rules(): array
    {
        return [
            'annual_plan_reference' => ['required', 'string', 'max:100'],
            'category' => ['required', Rule::in(ProjectCatalog::CATEGORIES)],
            'project_type' => ['required', Rule::in(ProjectCatalog::PROJECT_TYPES)],
            'activity_name' => ['required', Rule::in(ProjectCatalog::ACTIVITIES)],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'team_type' => ['nullable', Rule::in(ProjectCatalog::TEAM_TYPES)],
            'review_track' => ['required', Rule::in(ProjectCatalog::REVIEW_TRACKS)],
            'planner_id' => ['required', 'exists:users,id'],
            'coordinator_id' => ['nullable', 'exists:users,id'],
            'approver_id' => ['nullable', 'exists:users,id'],
            'planned_start_date' => ['nullable', 'date'],
            'planned_end_date' => ['nullable', 'date', 'after_or_equal:planned_start_date'],
            'initiation_document_id' => ['nullable', 'integer'],
        ];
    }
}
