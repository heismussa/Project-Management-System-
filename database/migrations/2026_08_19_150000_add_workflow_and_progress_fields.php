<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('plan_review_status')->default('draft')->after('phase');
            $table->text('plan_review_comment')->nullable()->after('plan_review_status');
            $table->timestamp('plan_reviewed_at')->nullable()->after('plan_review_comment');
            $table->timestamp('recommended_at')->nullable()->after('plan_reviewed_at');
            $table->timestamp('execution_started_at')->nullable()->after('recommended_at');
            $table->string('forwarded_role')->nullable()->after('execution_started_at');
            $table->foreignId('forwarded_to_user_id')->nullable()->after('forwarded_role')->constrained('users')->nullOnDelete();
            $table->foreignId('approver_id')->nullable()->after('coordinator_id')->constrained('users')->nullOnDelete();
            $table->text('matrix_return_comment')->nullable();
            $table->timestamp('matrix_returned_at')->nullable();
        });

        Schema::table('implementation_activities', function (Blueprint $table) {
            $table->string('phase')->nullable()->after('name');
            $table->json('pending_changes')->nullable()->after('status');
            $table->string('plan_change_status')->nullable()->after('pending_changes');
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->text('review_comment')->nullable()->after('review_status');
            $table->foreignId('reviewed_by')->nullable()->after('review_comment')->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
        });

        Schema::table('requirements', function (Blueprint $table) {
            $table->date('actual_start_date')->nullable()->after('implementation_status');
            $table->date('actual_end_date')->nullable()->after('actual_start_date');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropConstrainedForeignId('forwarded_to_user_id');
            $table->dropConstrainedForeignId('approver_id');
            $table->dropColumn([
                'plan_review_status',
                'plan_review_comment',
                'plan_reviewed_at',
                'recommended_at',
                'execution_started_at',
                'forwarded_role',
                'matrix_return_comment',
                'matrix_returned_at',
            ]);
        });

        Schema::table('implementation_activities', function (Blueprint $table) {
            $table->dropColumn(['phase', 'pending_changes', 'plan_change_status']);
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropColumn(['review_comment', 'reviewed_at']);
        });

        Schema::table('requirements', function (Blueprint $table) {
            $table->dropColumn(['actual_start_date', 'actual_end_date']);
        });
    }
};
