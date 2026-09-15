<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->addIndexIfMissing('projects', 'projects_lifecycle_stage_idx', ['lifecycle_stage']);
        $this->addIndexIfMissing('projects', 'projects_plan_status_idx', ['plan_status']);
        $this->addIndexIfMissing('projects', 'projects_actual_start_idx', ['actual_start_date']);
        $this->addIndexIfMissing('projects', 'projects_actual_end_idx', ['actual_end_date']);

        $this->addIndexIfMissing('requirements', 'requirements_review_decision_idx', ['review_decision']);
        $this->addIndexIfMissing('requirements', 'requirements_impl_status_idx', ['implementation_status']);
        $this->addIndexIfMissing('requirements', 'requirements_test_result_idx', ['test_result']);

        $this->addIndexIfMissing('implementation_activities', 'activities_planned_actual_idx', ['planned_start_date', 'actual_start_date']);
        $this->addIndexIfMissing('reviews', 'reviews_reviewed_at_idx', ['reviewed_at']);
    }

    public function down(): void
    {
        $this->dropIndexIfExists('projects', 'projects_lifecycle_stage_idx');
        $this->dropIndexIfExists('projects', 'projects_plan_status_idx');
        $this->dropIndexIfExists('projects', 'projects_actual_start_idx');
        $this->dropIndexIfExists('projects', 'projects_actual_end_idx');

        $this->dropIndexIfExists('requirements', 'requirements_review_decision_idx');
        $this->dropIndexIfExists('requirements', 'requirements_impl_status_idx');
        $this->dropIndexIfExists('requirements', 'requirements_test_result_idx');

        $this->dropIndexIfExists('implementation_activities', 'activities_planned_actual_idx');
        $this->dropIndexIfExists('reviews', 'reviews_reviewed_at_idx');
    }

    private function addIndexIfMissing(string $table, string $indexName, array $columns): void
    {
        if ($this->indexExists($table, $indexName)) {
            return;
        }

        // Also skip if a previous failed attempt created the auto-named index.
        foreach ($columns as $column) {
            if ($this->columnAlreadyIndexed($table, $column) && count($columns) === 1) {
                return;
            }
        }

        Schema::table($table, function (Blueprint $blueprint) use ($indexName, $columns) {
            $blueprint->index($columns, $indexName);
        });
    }

    private function dropIndexIfExists(string $table, string $indexName): void
    {
        if (! $this->indexExists($table, $indexName)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($indexName) {
            $blueprint->dropIndex($indexName);
        });
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            $rows = DB::select("PRAGMA index_list('{$table}')");

            return collect($rows)->contains(fn ($row) => ($row->name ?? null) === $indexName);
        }

        $database = DB::getDatabaseName();
        $row = DB::selectOne(
            'SELECT 1 AS ok FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ? LIMIT 1',
            [$database, $table, $indexName]
        );

        return $row !== null;
    }

    private function columnAlreadyIndexed(string $table, string $column): bool
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            $indexes = DB::select("PRAGMA index_list('{$table}')");
            foreach ($indexes as $index) {
                $name = $index->name ?? null;
                if (! $name) {
                    continue;
                }
                $cols = DB::select("PRAGMA index_info('{$name}')");
                if (collect($cols)->contains(fn ($col) => ($col->name ?? null) === $column)) {
                    return true;
                }
            }

            return false;
        }

        $database = DB::getDatabaseName();
        $row = DB::selectOne(
            'SELECT 1 AS ok FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND column_name = ? LIMIT 1',
            [$database, $table, $column]
        );

        return $row !== null;
    }
};
