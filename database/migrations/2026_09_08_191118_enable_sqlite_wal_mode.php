<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * SQLite's default journal mode blocks readers while a write is in
 * progress — fine at a handful of users, but a real bottleneck once
 * several people are using the system at once. WAL mode lets reads and
 * writes happen concurrently instead of queuing behind each other, and
 * NORMAL synchronous is the standard, still-crash-safe pairing for it
 * (only FULL fsyncs on every transaction, which WAL doesn't need).
 *
 * Both settings are stored in the database file itself, so this only
 * needs to run once — but it's idempotent (safe to run again) and this
 * is where any fresh clone/migrate of the database naturally picks it up.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'sqlite') {
            return;
        }

        DB::statement('PRAGMA journal_mode=WAL');
        DB::statement('PRAGMA synchronous=NORMAL');
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'sqlite') {
            return;
        }

        DB::statement('PRAGMA journal_mode=DELETE');
        DB::statement('PRAGMA synchronous=FULL');
    }
};
