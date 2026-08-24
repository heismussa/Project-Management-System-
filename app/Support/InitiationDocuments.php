<?php

namespace App\Support;

/**
 * Single source of truth for the documents required to clear the
 * Initiation -> Planning gate. Referenced by DocumentController (upload
 * validation) and Project::initiationReadiness() (the gate check) so the
 * document_type keys and required/optional flags never drift apart.
 */
class InitiationDocuments
{
    public const TYPES = [
        'concept_note' => [
            'label' => 'Concept Note',
            'required' => true,
        ],
        'ega_approval_letter' => [
            'label' => 'e-GA Approval Letter',
            'required' => true,
        ],
        'feasibility_study' => [
            'label' => 'Feasibility Study',
            'required' => false,
        ],
    ];

    public static function keys(): array
    {
        return array_keys(self::TYPES);
    }

    public static function label(string $key): string
    {
        return self::TYPES[$key]['label'] ?? $key;
    }

    public static function isRequired(string $key): bool
    {
        return (bool) (self::TYPES[$key]['required'] ?? false);
    }
}
