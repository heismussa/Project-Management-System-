<?php

namespace App\Providers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // journal_mode=WAL is stored in the database file itself and
        // survives reconnects, but `synchronous` is a per-connection PRAGMA
        // that SQLite resets to its default on every new connection — so
        // unlike journal_mode (set once, in the WAL-enabling migration),
        // this has to be reapplied here on every request. Both cost a
        // negligible, no-I/O connection flag toggle either way.
        if (config('database.default') === 'sqlite') {
            DB::statement('PRAGMA synchronous = NORMAL');
        }
    }
}
