<?php

namespace App\Http\Requests;

use App\Models\Requirement;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateRequirementProgressRequest extends FormRequest
{
    private ?Requirement $requirementInstance = null;

    public function authorize(): bool
    {
        $user = $this->user();
        $requirement = $this->requirement();

        return $user !== null && $requirement !== null && $requirement->project->canBeManagedBy($user);
    }

    public function rules(): array
    {
        return [
            'actual_start_date' => ['sometimes', 'nullable', 'date'],
            'actual_end_date' => ['sometimes', 'nullable', 'date'],
            'remark' => ['required', 'string'],
        ];
    }

    /**
     * actual_start_date >= project.planned_start_date, <= today.
     * actual_end_date   >= actual_start_date, <= today.
     * Runs as an `after` hook (not plain rules) because each check needs
     * the *other* date field and the parent project's planned_start_date.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $requirement = $this->requirement();
            if (! $requirement) {
                return;
            }

            $today = Carbon::today();
            $plannedStart = $requirement->project->planned_start_date;
            $actualStart = $this->has('actual_start_date')
                ? $this->input('actual_start_date')
                : $requirement->actual_start_date;
            $actualEnd = $this->has('actual_end_date')
                ? $this->input('actual_end_date')
                : $requirement->actual_end_date;

            if ($actualStart) {
                $start = Carbon::parse($actualStart)->startOfDay();

                if ($plannedStart && $start->lt(Carbon::parse($plannedStart)->startOfDay())) {
                    $validator->errors()->add(
                        'actual_start_date',
                        'Actual start cannot be before the project\'s planned start date.'
                    );
                }

                if ($start->gt($today)) {
                    $validator->errors()->add('actual_start_date', 'Actual start cannot be in the future.');
                }
            }

            if ($actualEnd) {
                $end = Carbon::parse($actualEnd)->startOfDay();

                if ($actualStart && $end->lt(Carbon::parse($actualStart)->startOfDay())) {
                    $validator->errors()->add(
                        'actual_end_date',
                        'Actual end cannot be before the actual start date.'
                    );
                }

                if ($end->gt($today)) {
                    $validator->errors()->add('actual_end_date', 'Actual end cannot be in the future.');
                }
            }
        });
    }

    private function requirement(): ?Requirement
    {
        if ($this->requirementInstance === null) {
            $this->requirementInstance = Requirement::with('project')->find($this->route('id'));
        }

        return $this->requirementInstance;
    }
}
