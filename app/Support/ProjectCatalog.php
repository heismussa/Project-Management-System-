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

    // Category "System" projects are always one of these named NSSF
    // systems, so their initial activity list narrows to just these
    // instead of the generic phase-style activities above.
    public const SYSTEM_ACTIVITIES = ['CFMS', 'ERP', 'HRMS', 'IPEMS'];

    // Category "Infrastructure" projects narrow to these infrastructure areas.
    public const INFRASTRUCTURE_ACTIVITIES = [
        'Activities Network',
        'Working Tools',
        'Data Center',
        'Server',
        'Database',
    ];

    // Category "Security" projects narrow to these security areas.
    public const SECURITY_ACTIVITIES = ['Activities Control', 'Vulnerability'];

    public const TEAM_TYPES = ['Internal', 'Vendor', 'Mixed'];

    public const REVIEW_TRACKS = ['SDMM', 'IDMM', 'DICT'];

    public static function activitiesFor(?string $category): array
    {
        return match ($category) {
            'System' => self::SYSTEM_ACTIVITIES,
            'Infrastructure' => self::INFRASTRUCTURE_ACTIVITIES,
            'Security' => self::SECURITY_ACTIVITIES,
            default => self::ACTIVITIES,
        };
    }
}
