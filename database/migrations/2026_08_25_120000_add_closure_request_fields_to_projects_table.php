<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->timestamp('closure_requested_at')->nullable()->after('closure_comment');
            $table->foreignId('closure_requested_by')->nullable()->after('closure_requested_at')->constrained('users')->nullOnDelete();
            $table->text('closure_request_comment')->nullable()->after('closure_requested_by');
            $table->text('closure_return_comment')->nullable()->after('closure_request_comment');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropConstrainedForeignId('closure_requested_by');
            $table->dropColumn([
                'closure_requested_at',
                'closure_request_comment',
                'closure_return_comment',
            ]);
        });
    }
};
