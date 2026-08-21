<?php

namespace App\Support;

class ProjectCatalog
{
    public const CATEGORIES = ['System', 'Infrastructure', 'Security'];

    public const PROJECT_TYPES = ['New Implementation', 'Review/Enhancement'];

    public const ACTIVITIES = [
        'Documentation & Planning',
        'System Development',
        'Infrastructure Setup',
        'Security Assessment',
        'User Acceptance Testing',
        'Training & Handover',
        'Go-Live Support',
    ];

    public const TEAM_TYPES = ['Internal', 'Vendor', 'Mixed'];

    public const REVIEW_TRACKS = ['SDMM', 'IDMM', 'DICT'];
}
