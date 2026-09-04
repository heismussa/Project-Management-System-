<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('deadlines:check')->dailyAt('06:00');
