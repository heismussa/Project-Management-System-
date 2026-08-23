<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Enforce RBAC permission check prior to processing input
        return $this->user() && $this->user()->hasPermission('projects.register');
    }

    public function rules(): array
    {
        return [
            'annual_plan_reference' => ['required', 'string', 'max:100'],
            'category'              => ['required', 'string', 'max:100'],
            'project_type'          => ['required', 'string', 'max:100'],
            'activity_name'        => ['required', 'string', 'max:255'],
            'name'                 => ['required', 'string', 'max:255'],
            'description'          => ['nullable', 'string'],
            'budget'               => ['nullable', 'numeric', 'min:0'],
        ];
    }
}