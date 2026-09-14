<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\PortfolioReportBuilder;
use App\Services\ProjectArchiveSummaryBuilder;
use App\Support\Roles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Archive/report generation for a project (or the whole portfolio), split
 * out of ProjectController since it's a self-contained document-building
 * concern with no shared state with the workflow-transition endpoints there.
 */
class ReportController extends Controller
{
    /**
     * Everything about a finished project in one file: every current
     * document plus a formatted Word summary of the activities, RTM, and
     * key dates — for handover/archival once there's nothing left to change.
     */
    public function archive(Project $project): BinaryFileResponse|JsonResponse
    {
        if (! $project->closed_at) {
            return response()->json(['message' => 'Only a closed project can be downloaded as an archive.'], 422);
        }

        $documents = $this->loadForSummary($project);

        $tempDir = storage_path('app/private/tmp');
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }
        $tempPath = $tempDir.'/project-'.$project->id.'-'.uniqid().'.zip';

        $zip = new \ZipArchive();
        $zip->open($tempPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);
        $zip->addFromString('Project Summary.docx', ProjectArchiveSummaryBuilder::build($project, $documents));

        $usedNames = [];
        foreach ($documents as $document) {
            $localPath = Storage::disk('local')->path($document->file_url);
            if (! is_file($localPath)) {
                continue; // sample/demo rows have no real file behind them
            }
            $name = $document->file_name ?: ('document-'.$document->id);
            while (in_array($name, $usedNames, true)) {
                $name = pathinfo($name, PATHINFO_FILENAME).'-'.$document->id.'.'.pathinfo($name, PATHINFO_EXTENSION);
            }
            $usedNames[] = $name;
            $zip->addFile($localPath, 'Documents/'.$name);
        }
        $zip->close();

        $downloadName = str()->slug($project->name ?: 'project').'-archive.zip';

        return response()->download($tempPath, $downloadName)->deleteFileAfterSend(true);
    }

    /**
     * The same formatted Word summary the archive bundles, available for any
     * project at any stage — not gated on closure like archive() is. Report
     * generation (individual and portfolio-wide) is Reviewer-only — the
     * Reports page itself is already hidden from every other role in the
     * sidebar, but that's a UI convenience, not access control, so it's
     * enforced here too.
     */
    public function report(Request $request, Project $project): \Illuminate\Http\Response|\Illuminate\Http\JsonResponse
    {
        if (! $request->user() || ! $request->user()->hasRole(Roles::REVIEWER_ROLE)) {
            return response()->json(['message' => 'Unauthorized access.'], 403);
        }

        $documents = $this->loadForSummary($project);
        $content = ProjectArchiveSummaryBuilder::build($project, $documents);
        $downloadName = str()->slug($project->name ?: 'project').'-report.docx';

        return response($content, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition' => 'attachment; filename="'.$downloadName.'"',
        ]);
    }

    /**
     * Word version of the Reports page's portfolio table — takes the exact
     * rows the frontend already filtered/searched down to (not re-queried
     * here), so Word/Excel/PDF exports always agree with what's on screen.
     * Reviewer-only, same as report() above.
     */
    public function portfolioReportWord(Request $request): \Illuminate\Http\Response|\Illuminate\Http\JsonResponse
    {
        if (! $request->user() || ! $request->user()->hasRole(Roles::REVIEWER_ROLE)) {
            return response()->json(['message' => 'Unauthorized access.'], 403);
        }

        $validated = $request->validate([
            'rows' => ['required', 'array'],
        ]);

        $content = PortfolioReportBuilder::build(collect($validated['rows']));

        return response($content, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition' => 'attachment; filename="project-portfolio.docx"',
        ]);
    }

    private function loadForSummary(Project $project): \Illuminate\Support\Collection
    {
        $project->load([
            'implementationActivities.responsiblePerson:id,name',
            'requirements',
            'planner:id,name,email',
            'reviewer:id,name,email',
            'coordinator:id,name,email',
            'approver:id,name,email',
        ]);

        return $project->documents()->where('is_current', true)->get();
    }
}
