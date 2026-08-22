<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('requirements', function (Blueprint $table) {
            // Denormalized "current" values, kept in sync by
            // RequirementController::updateProgress. The append-only
            // history lives in progress_updates (entity_type='requirement').
            if (! Schema::hasColumn('requirements', 'actual_start_date')) {
                $table->date('actual_start_date')->nullable()->after('implementation_status');
            }
            if (! Schema::hasColumn('requirements', 'actual_end_date')) {
                $table->date('actual_end_date')->nullable()->after('actual_start_date');
            }
            if (! Schema::hasColumn('requirements', 'test_comments')) {
                $table->text('test_comments')->nullable()->after('test_result');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requirements', function (Blueprint $table) {
            $table->dropColumn(array_filter([
                Schema::hasColumn('requirements', 'actual_start_date') ? 'actual_start_date' : null,
                Schema::hasColumn('requirements', 'actual_end_date') ? 'actual_end_date' : null,
                Schema::hasColumn('requirements', 'test_comments') ? 'test_comments' : null,
            ]));
        });
    }
};
