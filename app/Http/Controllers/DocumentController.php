<?php

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    /**
     * Display a listing of documents.
     */
    public function index(Request $request)
    {
        $query = Document::with([
            'uploadedBy:id,name,email',
            'project:id,title',
            'activity:id,title',
            'requirement:id,title'
        ]);

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        if ($request->filled('activity_id')) {
            $query->where('activity_id', $request->activity_id);
        }

        if ($request->filled('requirement_id')) {
            $query->where('requirement_id', $request->requirement_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('document_type', 'like', "%{$search}%")
                  ->orWhere('file_type', 'like', "%{$search}%");
            });
        }

        return response()->json($query->latest()->get());
    }

    /**
     * Store a newly uploaded document.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:pdf,docx,xlsx,doc,xls,jpg,png,zip|max:20480',
            'project_id' => 'required|exists:projects,id',
            'activity_id' => 'nullable|exists:implementation_activities,id',
            'requirement_id' => 'nullable|exists:requirements,id',
            'title' => 'nullable|string|max:255',
            'document_type' => 'nullable|string|max:100',
        ]);

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $fileExtension = $file->getClientOriginalExtension();
        $title = $validated['title'] ?? pathinfo($originalName, PATHINFO_FILENAME);

        $filePath = $file->store('documents', 'public');

        $latestVersion = Document::where('project_id', $validated['project_id'])
            ->where('title', $title)
            ->max('version_number');

        $nextVersion = $latestVersion ? $latestVersion + 1 : 1;

        $document = Document::create([
            'project_id' => $validated['project_id'],
            'activity_id' => $validated['activity_id'] ?? null,
            'requirement_id' => $validated['requirement_id'] ?? null,
            'uploaded_by' => Auth::id() ?? $request->user()?->id,
            'title' => $title,
            'document_type' => $validated['document_type'] ?? 'general',
            'file_path' => $filePath,
            'file_type' => $fileExtension,
            'file_size' => $file->getSize(),
            'version_number' => $nextVersion,
            'review_status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Document uploaded successfully',
            'document' => $document->load(['uploadedBy', 'project', 'activity', 'requirement'])
        ], 201);
    }

    /**
     * Display the specified document.
     */
    public function show(Document $document)
    {
        return response()->json($document->load(['uploadedBy', 'project', 'activity', 'requirement']));
    }

    /**
     * Stream or download the file binary.
     */
    public function stream(Document $document)
    {
        $fullPath = storage_path('app/public/' . $document->file_path);

        if (!$document->file_path || !file_exists($fullPath)) {
            return response()->json(['message' => 'File not found on storage server.'], 404);
        }

        return response()->file($fullPath);
    }

    /**
     * Update document status or info.
     */
    public function update(Request $request, Document $document)
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'document_type' => 'sometimes|string|max:100',
            'review_status' => 'sometimes|in:pending,approved,rejected',
            'remarks' => 'nullable|string',
        ]);

        $document->update($validated);

        return response()->json([
            'message' => 'Document updated successfully',
            'document' => $document->fresh()->load(['uploadedBy', 'project', 'activity', 'requirement'])
        ]);
    }

    /**
     * Remove the document and delete physical file.
     */
    public function destroy(Document $document)
    {
        if ($document->file_path && Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }

        $document->delete();

        return response()->json([
            'message' => 'Document deleted successfully'
        ]);
    }
}