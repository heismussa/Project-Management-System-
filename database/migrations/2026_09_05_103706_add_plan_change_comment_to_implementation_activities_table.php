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
            // The reviewer's reason for rejecting a pending plan change (a
            // new/edited activity submitted while the plan was already
            // approved) — shown back to the planner so they know what to fix.
            $table->text('plan_change_comment')->nullable()->after('plan_change_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('implementation_activities', function (Blueprint $table) {
            $table->dropColumn('plan_change_comment');
        });
    }
};
