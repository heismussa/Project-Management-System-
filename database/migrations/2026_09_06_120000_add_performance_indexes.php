<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Unlike MySQL, SQLite does not auto-index a foreign-key column just because
 * it's declared with constrained() — every project_id/activity_id/etc lookup
 * across the app has been doing a full table scan. Purely additive (new
 * indexes only, no column/shape changes), so nothing that reads or writes
 * these tables needs to change.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->index('planner_id');
            $table->index('reviewer_id');
            $table->index('coordinator_id');
            $table->index('approver_id');
            $table->index('forwarded_to_user_id');
            $table->index('plan_review_status');
            $table->index('phase');
            $table->index('closed_at');
            $table->index('closure_requested_at');
        });

        Schema::table('implementation_activities', function (Blueprint $table) {
            $table->index('project_id');
            $table->index('responsible_person_id');
            $table->index('plan_change_status');
        });

        Schema::table('requirements', function (Blueprint $table) {
            $table->index('project_id');
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->index('project_id');
            $table->index('activity_id');
            $table->index('requirement_id');
            $table->index('review_status');
            $table->index(['project_id', 'is_current']);
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->index('project_id');
            $table->index('reviewer_id');
            $table->index(['entity_type', 'entity_id']);
        });

        Schema::table('progress_updates', function (Blueprint $table) {
            $table->index(['entity_type', 'entity_id']);
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->index('user_id');
        });

        Schema::table('user_activity_logs', function (Blueprint $table) {
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropIndex(['planner_id']);
            $table->dropIndex(['reviewer_id']);
            $table->dropIndex(['coordinator_id']);
            $table->dropIndex(['approver_id']);
            $table->dropIndex(['forwarded_to_user_id']);
            $table->dropIndex(['plan_review_status']);
            $table->dropIndex(['phase']);
            $table->dropIndex(['closed_at']);
            $table->dropIndex(['closure_requested_at']);
        });

        Schema::table('implementation_activities', function (Blueprint $table) {
            $table->dropIndex(['project_id']);
            $table->dropIndex(['responsible_person_id']);
            $table->dropIndex(['plan_change_status']);
        });

        Schema::table('requirements', function (Blueprint $table) {
            $table->dropIndex(['project_id']);
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->dropIndex(['project_id']);
            $table->dropIndex(['activity_id']);
            $table->dropIndex(['requirement_id']);
            $table->dropIndex(['review_status']);
            $table->dropIndex(['project_id', 'is_current']);
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->dropIndex(['project_id']);
            $table->dropIndex(['reviewer_id']);
            $table->dropIndex(['entity_type', 'entity_id']);
        });

        Schema::table('progress_updates', function (Blueprint $table) {
            $table->dropIndex(['entity_type', 'entity_id']);
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
        });

        Schema::table('user_activity_logs', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
        });
    }
};
