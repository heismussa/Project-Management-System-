<?php

namespace App\Services;

use Illuminate\Support\Collection;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;

/**
 * Word version of the Reports page's portfolio table — same rows the
 * frontend already filtered/searched down to (sent as-is, not re-queried),
 * so Word/Excel/PDF all show exactly what's on screen.
 */
class PortfolioReportBuilder
{
    private const MAROON = '962C30';

    private const LIGHT_GREY = 'FAF7F2';

    private const BORDER = 'E0DEDE';

    public static function build(Collection $rows): string
    {
        $phpWord = new PhpWord;

        $phpWord->addTitleStyle(1, ['bold' => true, 'size' => 20, 'color' => self::MAROON]);

        $phpWord->addTableStyle('PortfolioTable', [
            'borderSize' => 6,
            'borderColor' => self::BORDER,
            'cellMarginTop' => 60,
            'cellMarginBottom' => 60,
        ]);

        $section = $phpWord->addSection(['marginTop' => 900, 'marginBottom' => 900, 'orientation' => 'landscape']);

        $section->addTitle('Project Portfolio', 1);
        $section->addText($rows->count().' project'.($rows->count() === 1 ? '' : 's'), ['size' => 10, 'color' => '6B7280']);
        $section->addTextBreak();

        // label => the matching key on each row (frontend's ReportsPage `rows` shape)
        $columns = [
            'Project Name' => ['key' => 'name', 'width' => 2600],
            'Category' => ['key' => 'category', 'width' => 1300],
            'Status' => ['key' => 'status', 'width' => 1600],
            'Track' => ['key' => 'track', 'width' => 900],
            'Planner' => ['key' => 'planner', 'width' => 1600],
            'Budget' => ['key' => 'budget', 'width' => 1300],
            'Queue' => ['key' => 'queue', 'width' => 1400],
        ];

        $table = $section->addTable('PortfolioTable');
        $table->addRow();
        foreach ($columns as $label => $spec) {
            $cell = $table->addCell($spec['width'], ['bgColor' => self::MAROON, 'valign' => 'center']);
            $cell->addText($label, ['bold' => true, 'color' => 'FFFFFF', 'size' => 10]);
        }

        foreach ($rows as $index => $row) {
            $table->addRow();
            $bg = $index % 2 === 1 ? self::LIGHT_GREY : 'FFFFFF';
            foreach ($columns as $spec) {
                $value = $row[$spec['key']] ?? null;
                $cell = $table->addCell($spec['width'], ['bgColor' => $bg, 'valign' => 'center']);
                $cell->addText((string) ($value !== null && $value !== '' ? $value : '—'), ['size' => 9.5]);
            }
        }

        $tempPath = tempnam(sys_get_temp_dir(), 'portfolio_report_').'.docx';
        IOFactory::createWriter($phpWord, 'Word2007')->save($tempPath);
        $contents = file_get_contents($tempPath);
        unlink($tempPath);

        return $contents;
    }
}
