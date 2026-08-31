export const REQUIRED_PROJECT_DOCUMENT_TYPES = ['Implementation Plan', 'SRS']

export function getMissingRequiredDocumentTypes(
  documents,
  requiredTypes = REQUIRED_PROJECT_DOCUMENT_TYPES,
) {
  return requiredTypes.filter(
    (type) =>
      !documents.some(
        (doc) =>
          !doc.activity_id && (doc.document_type || '').toLowerCase() === type.toLowerCase(),
      ),
  )
}

export function extractUploadFile(entry) {
  if (entry instanceof File) return entry
  if (entry?.originFileObj instanceof File) return entry.originFileObj
  return null
}

export function normalizeProjectDocumentUploads(projectDocuments = {}) {
  return Object.fromEntries(
    Object.entries(projectDocuments)
      .map(([type, files]) => [type, (files || []).map(extractUploadFile).filter(Boolean)])
      .filter(([, files]) => files.length > 0),
  )
}
