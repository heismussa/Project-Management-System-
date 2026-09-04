<?php

namespace App\Support;

// Single source of truth for the "planner-equivalent" role set, used
// wherever the API authorizes Planner actions (implementation plan CRUD,
// plan submission, requirements-matrix mutations). Mirrors
// src/lib/roles.js#PLANNER_ROLES on the frontend — change both together.
class Roles
{
    public const PLANNER_ROLE = 'Project Planner';
    public const ADMINISTRATOR_ROLE = 'Project Administrator';

    // Anyone in this list may perform Planner actions somewhere in the
    // app. It does NOT by itself encode the ownership rule (a Planner may
    // only act on their own assigned projects; an Administrator may act
    // on any project) — see Project::canBeManagedBy() for that.
    public const PLANNER_ROLES = [self::PLANNER_ROLE, self::ADMINISTRATOR_ROLE];
}
