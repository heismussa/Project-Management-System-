<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            if (! Schema::hasColumn('projects', 'review_track')) {
                $table->string('review_track')->nullable()->after('category');
            }
            if (! Schema::hasColumn('projects', 'initiation_document_id')) {
                $table->unsignedBigInteger('initiation_document_id')->nullable()->after('team_type');
            }
            if (! Schema::hasColumn('projects', 'execution_approved_at')) {
                $table->timestamp('execution_approved_at')->nullable();
            }
            if (! Schema::hasColumn('projects', 'closed_at')) {
                $table->timestamp('closed_at')->nullable();
            }
            if (! Schema::hasColumn('projects', 'closed_by')) {
                $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('projects', 'closure_comment')) {
                $table->text('closure_comment')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            if (Schema::hasColumn('projects', 'closed_by')) {
                $table->dropConstrainedForeignId('closed_by');
            }
            foreach (['review_track', 'initiation_document_id', 'execution_approved_at', 'closed_at', 'closure_comment'] as $column) {
                if (Schema::hasColumn('projects', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
