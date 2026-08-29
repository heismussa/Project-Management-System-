<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Project;
use App\Models\Review;
use App\Support\InitiationDocuments;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    public function index(Request $request, int $projectId): JsonResponse
    {
        $query = Document::where('project_id', $projectId)
            ->with(['uploader:id,name', 'reviewer:id,name', 'activity:id,name'])
            ->latest('uploaded_at');

        if ($request->filled('activity_id')) {
            $query->where('activity_id', $request->integer('activity_id'));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'activity_id' => ['nullable', 'exists:implementation_activities,id'],
            'requirement_id' => ['nullable', 'exists:requirements,id'],
            'document_type' => ['nullable', 'string', 'max:100'],
            'file' => ['required', 'file', 'mimes:pdf,docx,xlsx', 'max:10240'],
        ]);

        $file = $request->file('file');
        $path = $file->store('documents', 'public');

        $version = 1;
        $existing = Document::query()
            ->where('project_id', $validated['project_id'])
            ->where('activity_id', $validated['activity_id'] ?? null)
            ->where('file_name', $file->getClientOriginalName())
            ->orderByDesc('version_number')
            ->first();

        if ($existing) {
            $version = $existing->version_number + 1;
            Document::query()
                ->where('project_id', $validated['project_id'])
                ->where('activity_id', $validated['activity_id'] ?? null)
                ->where('file_name', $file->getClientOriginalName())
                ->update(['is_current' => false]);
        }

        $document = Document::create([
            'project_id' => $validated['project_id'],
            'activity_id' => $validated['activity_id'] ?? null,
            'requirement_id' => $validated['requirement_id'] ?? null,
            'document_type' => $validated['document_type'] ?: $this->inferType($file->getClientOriginalName()),
            'file_name' => $file->getClientOriginalName(),
            'file_url' => $path,
            'file_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'version_number' => $version,
            'is_current' => true,
            'review_status' => 'pending',
            'uploaded_by' => $request->user()->id,
            'uploaded_at' => now(),
        ]);

        return response()->json([
            'message' => 'Document uploaded',
            'data' => $document->load(['uploader:id,name', 'activity:id,name']),
        ], 201);
    }

    public function storeInitiation(Request $request, Project $project): JsonResponse
    {
        if (! $request->user() || ! $request->user()->hasPermission('projects.register')) {
            return response()->json(['message' => 'Unauthorized access.'], 403);
        }

        $validated = $request->validate([
            'document_type' => ['required', Rule::in(InitiationDocuments::keys())],
            'file' => ['required', 'file', 'mimes:pdf,docx,xlsx', 'max:10240'],
        ]);

        $file = $request->file('file');
        $path = $file->store('documents', 'public');

        $existing = Document::query()
            ->where('project_id', $project->id)
            ->where('document_type', $validated['document_type'])
            ->where('is_current', true)
            ->first();

        $version = 1;
        if ($existing) {
            $version = $existing->version_number + 1;
            $existing->update(['is_current' => false]);
        }

        $document = Document::create([
            'project_id' => $project->id,
            'document_type' => $validated['document_type'],
            'phase' => 'initiation',
            'file_name' => $file->getClientOriginalName(),
            'file_url' => $path,
            'file_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'version_number' => $version,
            'is_current' => true,
            'uploaded_by' => $request->user()->id,
            'uploaded_at' => now(),
        ]);

        return response()->json([
            'message' => 'Document uploaded',
            'data' => $document->load('uploader:id,name'),
        ], 201);
    }

    public function file(Document $document): StreamedResponse
    {
        abort_unless(Storage::disk('public')->exists($document->file_url), 404);

        return Storage::disk('public')->response(
            $document->file_url,
            $document->file_name,
            ['Content-Type' => $document->file_type ?: 'application/octet-stream']
        );
    }

    public function review(Request $request, Document $document): JsonResponse
    {
        $validated = $request->validate([
            'decision' => ['required', 'in:approved,returned'],
            'comment' => ['required_if:decision,returned', 'nullable', 'string'],
        ]);

        $document->update([
            'review_status' => $validated['decision'],
            'review_comment' => $validated['comment'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        Review::create([
            'project_id' => $document->project_id,
            'entity_type' => 'document',
            'entity_id' => $document->id,
            'reviewer_id' => $request->user()->id,
            'decision' => $validated['decision'],
            'comment' => $validated['comment'] ?? null,
            'reviewed_at' => now(),
        ]);

        $message = $validated['decision'] === 'returned'
            ? 'Document returned to planner with comments.'
            : 'Document approved.';

        return response()->json([
            'message' => $message,
            'data' => $document->fresh()->load(['uploader:id,name', 'reviewer:id,name', 'activity:id,name']),
        ]);
    }

    public function destroy(Document $document): JsonResponse
    {
        if ($document->file_url) {
            Storage::disk('public')->delete($document->file_url);
        }
        $document->delete();

        return response()->json(['message' => 'Document deleted']);
    }

    private function inferType(string $fileName): string
    {
        $lower = strtolower($fileName);
        if (str_ends_with($lower, '.pdf')) {
            return 'PDF Document';
        }
        if (str_ends_with($lower, '.docx')) {
            return 'Word Document';
        }
        if (str_ends_with($lower, '.xlsx')) {
            return 'Excel Document';
        }

        return 'Document';
    }
}
