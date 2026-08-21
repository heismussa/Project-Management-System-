<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            if (! Schema::hasColumn('projects', 'plan_pending_reapproval')) {
                $table->boolean('plan_pending_reapproval')->default(false)->after('plan_reviewed_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            if (Schema::hasColumn('projects', 'plan_pending_reapproval')) {
                $table->dropColumn('plan_pending_reapproval');
            }
        });
    }
};
