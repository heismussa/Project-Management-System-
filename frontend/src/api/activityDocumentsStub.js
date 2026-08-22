// STUB — Person 4 owns the real Documents API integration.
//
// This function intentionally never hits the network. It's the single seam
// the Review Drawer's upload UI calls through, so swapping in the real
// integration later means editing this one function only. The real call
// will be: POST /api/documents (multipart: file, activity_id, document_type).
export function uploadActivityDocumentStub(activityId, file) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: `stub-${Date.now()}`,
        activity_id: activityId,
        file_name: file.name,
        stub: true,
      })
    }, 400)
  })
}
