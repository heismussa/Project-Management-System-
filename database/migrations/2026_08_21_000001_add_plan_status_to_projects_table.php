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
        Schema::table('projects', function (Blueprint $table) {
            // Separate from the existing `status` column, which tracks the
            // project registration/phase workflow — this is the plan review
            // lifecycle: draft -> pending_review -> changes_requested|approved.
            $table->enum('plan_status', ['draft', 'pending_review', 'changes_requested', 'approved'])
                ->default('draft')
                ->after('status');
            $table->timestamp('plan_submitted_at')->nullable()->after('plan_status');
            $table->text('plan_return_comment')->nullable()->after('plan_submitted_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['plan_status', 'plan_submitted_at', 'plan_return_comment']);
        });
    }
};
