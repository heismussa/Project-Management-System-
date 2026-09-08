<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Collection;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;

/**
 * The "Project Summary" document bundled into a closed project's downloadable
 * archive (ProjectController::archive()) — a real, formatted Word document
 * instead of a plain-text file, using the same maroon the rest of the app
 * uses for its headers.
 */
class ProjectArchiveSummaryBuilder
{
    private const MAROON = '800000';
    private const LIGHT_GREY = 'F2F2F2';
    private const BORDER = 'CCCCCC';

    public static function build(Project $project, Collection $documents): string
    {
        $phpWord = new PhpWord;

        $phpWord->addTitleStyle(1, ['bold' => true, 'size' => 20, 'color' => self::MAROON]);
        $phpWord->addTitleStyle(2, ['bold' => true, 'size' => 13, 'color' => self::MAROON, 'spaceBefore' => 300]);

        $phpWord->addTableStyle('DataTable', [
            'borderSize' => 6,
            'borderColor' => self::BORDER,
            'cellMarginTop' => 60,
            'cellMarginBottom' => 60,
        ]);

        $section = $phpWord->addSection(['marginTop' => 900, 'marginBottom' => 900]);

        $section->addTitle('Project Summary', 1);
        $section->addText($project->name ?: 'Untitled project', ['bold' => true, 'size' => 14]);
        $section->addTextBreak();

        self::detailsTable($section, $project);

        $section->addTitle('Activities ('.$project->implementationActivities->count().')', 2);
        self::activitiesTable($section, $project);

        $section->addTitle('Requirements / RTM ('.$project->requirements->count().')', 2);
        self::requirementsTable($section, $project);

        $section->addTitle('Documents included ('.$documents->count().')', 2);
        self::documentsTable($section, $documents);

        $tempPath = tempnam(sys_get_temp_dir(), 'archive_summary_').'.docx';
        IOFactory::createWriter($phpWord, 'Word2007')->save($tempPath);
        $contents = file_get_contents($tempPath);
        unlink($tempPath);

        return $contents;
    }

    private static function headerCell($table, string $text, int $width): void
    {
        $cell = $table->addCell($width, ['bgColor' => self::MAROON, 'valign' => 'center']);
        $cell->addText($text, ['bold' => true, 'color' => 'FFFFFF', 'size' => 10]);
    }

    private static function bodyCell($table, $text, int $width, array $fontStyle = []): void
    {
        $cell = $table->addCell($width, ['valign' => 'center']);
        $cell->addText((string) ($text ?: '—'), array_merge(['size' => 10], $fontStyle));
    }

    private static function dateRange($start, $end): string
    {
        $s = optional($start)->toDateString();
        $e = optional($end)->toDateString();
        if (! $s && ! $e) {
            return '—';
        }

        return ($s ?: '—').' to '.($e ?: '—');
    }

    private static function detailsTable($section, Project $project): void
    {
        $table = $section->addTable('DataTable');
        $rows = [
            ['Category', $project->category],
            ['Type', $project->project_type],
            ['Planner', $project->planner?->name],
            ['Reviewer', $project->reviewer?->name],
            ['Coordinator', $project->coordinator?->name],
            ['Approver', $project->approver?->name],
            ['Planned dates', self::dateRange($project->planned_start_date, $project->planned_end_date)],
            ['Actual dates', self::dateRange($project->actual_start_date, $project->actual_end_date)],
            ['Closed at', optional($project->closed_at)->format('M j, Y g:i A')],
        ];

        foreach ($rows as $index => [$label, $value]) {
            $table->addRow();
            $cell = $table->addCell(2600, ['bgColor' => $index % 2 === 0 ? self::LIGHT_GREY : 'FFFFFF']);
            $cell->addText($label, ['bold' => true, 'size' => 10]);
            self::bodyCell($table, $value, 6400);
        }
    }

    private static function activitiesTable($section, Project $project): void
    {
        if ($project->implementationActivities->isEmpty()) {
            $section->addText('No activities recorded.', ['italic' => true, 'size' => 10]);

            return;
        }

        $table = $section->addTable('DataTable');
        $table->addRow();
        self::headerCell($table, 'Activity', 2800);
        self::headerCell($table, 'Planned', 1800);
        self::headerCell($table, 'Actual', 1800);
        self::headerCell($table, 'Status', 1200);
        self::headerCell($table, 'Responsible', 1400);

        foreach ($project->implementationActivities as $activity) {
            $table->addRow();
            self::bodyCell($table, $activity->name, 2800);
            self::bodyCell($table, self::dateRange($activity->planned_start_date, $activity->planned_end_date), 1800);
            self::bodyCell($table, self::dateRange($activity->actual_start_date, $activity->actual_end_date), 1800);
            self::bodyCell($table, $activity->status, 1200);
            self::bodyCell($table, $activity->responsiblePerson?->name, 1400);
        }
    }

    private static function requirementsTable($section, Project $project): void
    {
        if ($project->requirements->isEmpty()) {
            $section->addText('No requirements recorded.', ['italic' => true, 'size' => 10]);

            return;
        }

        $table = $section->addTable('DataTable');
        $table->addRow();
        self::headerCell($table, 'Code', 1200);
        self::headerCell($table, 'Description', 4000);
        self::headerCell($table, 'Status', 1600);
        self::headerCell($table, 'Test result', 1200);

        foreach ($project->requirements as $requirement) {
            $table->addRow();
            self::bodyCell($table, $requirement->requirement_code, 1200);
            self::bodyCell($table, $requirement->description, 4000);
            self::bodyCell($table, $requirement->implementation_status, 1600);
            $resultColor = match ($requirement->test_result) {
                'Pass' => '2E7D32',
                'Fail' => 'C62828',
                default => null,
            };
            self::bodyCell($table, $requirement->test_result, 1200, $resultColor ? ['bold' => true, 'color' => $resultColor] : []);
        }
    }

    private static function documentsTable($section, Collection $documents): void
    {
        if ($documents->isEmpty()) {
            $section->addText('No documents attached.', ['italic' => true, 'size' => 10]);

            return;
        }

        $table = $section->addTable('DataTable');
        $table->addRow();
        self::headerCell($table, 'File', 5500);
        self::headerCell($table, 'Type', 3500);

        foreach ($documents as $document) {
            $table->addRow();
            self::bodyCell($table, $document->file_name, 5500);
            self::bodyCell($table, $document->document_type ?: 'Document', 3500);
        }
    }
}
