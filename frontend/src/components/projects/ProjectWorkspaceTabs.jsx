import { useEffect } from 'react'
import { storeProjectId } from '../../lib/apiHelpers'
import ImplementationPlanPage from '../../pages/ImplementationPlanPage'
import DocumentList from '../documents/DocumentList'

/**
 * The project "Details" popup's workspace: always the same single-scroll
 * layout (Documents -> Activities -> RTM requirements once recommended) for
 * every role and every project stage. There used to be a Plan/RTM/Documents/
 * Closure tab strip here, but actionable review/closure steps live in the
 * Reviews queue instead — this popup is a read-first overview.
 */
export default function ProjectWorkspaceTabs({
  projectId,
  onProjectChanged,
  onActivityReview,
  shouldShowActivityReview,
}) {
  useEffect(() => {
    if (projectId) storeProjectId(projectId)
  }, [projectId])

  return (
    <div className="mt-3">
      <div className="mb-3">
        <div className="mb-2" style={{ color: '#800000', fontWeight: 800 }}>
          Documents
        </div>
        <DocumentList embedded projectId={projectId} compact />
      </div>

      <ImplementationPlanPage
        embedded
        projectId={projectId}
        onActivityReview={onActivityReview}
        onProjectChanged={onProjectChanged}
        shouldShowActivityReview={shouldShowActivityReview}
        simplifiedPlannerView
        hideExpectedDeliverable
        hideReapprovalNotice
      />
    </div>
  )
}
