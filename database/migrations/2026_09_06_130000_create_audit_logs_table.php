<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Separate from user_activity_logs on purpose — that table feeds the ICT
 * Support dashboard's "recent account activity" widget (created/enabled/
 * password reset), which stays exactly as-is. This one is the security/access
 * trail: logins, failed login attempts, logouts, document views — high
 * volume, viewed on its own dedicated screen, so it can't share a table
 * without flooding that existing widget.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->text('description')->nullable();
            $table->string('ip_address')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('user_id');
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
