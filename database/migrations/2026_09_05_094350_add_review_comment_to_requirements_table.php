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
            // The reviewer's reason for the review_decision — required when
            // rejecting, so the planner sees why without digging through the
            // audit trail. Distinct from `remarks`, which logs progress notes.
            $table->text('review_comment')->nullable()->after('review_decision');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requirements', function (Blueprint $table) {
            $table->dropColumn('review_comment');
        });
    }
};
