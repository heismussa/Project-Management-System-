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
        Schema::table('implementation_activities', function (Blueprint $table) {
            // Distinct from plan_change_status (which gates edits to planning
            // fields): tracks reviewer sign-off on an activity's progress
            // update (actual dates + remark), submitted via the Review
            // drawer's Submit button. null = never submitted.
            $table->string('progress_review_status')->nullable()->after('plan_change_status');
            $table->text('progress_review_comment')->nullable()->after('progress_review_status');
            $table->timestamp('progress_reviewed_at')->nullable()->after('progress_review_comment');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('implementation_activities', function (Blueprint $table) {
            $table->dropColumn(['progress_review_status', 'progress_review_comment', 'progress_reviewed_at']);
        });
    }
};
