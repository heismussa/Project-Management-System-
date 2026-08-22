import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { message } from 'antd'
import * as plannerApi from '../api/planner'
import { getStoredProjectId, storeProjectId, unwrapItem } from '../lib/apiHelpers'

// Plan lifecycle state machine (implementation plan, not any one activity):
//   draft --submit--> pending_review --return--> changes_requested
//   changes_requested --submit--> pending_review
//   pending_review --approve--> approved
// `approved` has no return path modeled here on purpose — plan_status is
// project-scoped state, not per-activity/per-requirement state.
export const PLAN_STATUS = {
  draft: { key: 'draft', label: 'Draft', color: 'default' },
  pending_review: { key: 'pending_review', label: 'Pending Review', color: 'blue' },
  changes_requested: { key: 'changes_requested', label: 'Changes Requested', color: 'gold' },
  approved: { key: 'approved', label: 'Approved', color: 'green' },
}

const ProjectContext = createContext(null)

export function ProjectProvider({ children }) {
  const [projectId, setProjectIdState] = useState(getStoredProjectId)
  const [planStatus, setPlanStatus] = useState('draft')
  const [returnComments, setReturnComments] = useState(null)
  const [needsReapproval, setNeedsReapproval] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [returning, setReturning] = useState(false)

  // Switching projects resets plan-lifecycle state to a safe default.
  // There's no GET for a project's current plan_status in this API layer
  // yet, so a freshly selected project starts in `draft` until that lands.
  const setProjectId = useCallback((id) => {
    storeProjectId(id)
    setProjectIdState(id)
    setPlanStatus('draft')
    setReturnComments(null)
    setNeedsReapproval(false)
  }, [])

  const isLocked = planStatus === 'pending_review' || planStatus === 'approved'
  const canSubmit = planStatus === 'draft' || planStatus === 'changes_requested'

  const submitForReview = useCallback(async () => {
    if (!projectId || !canSubmit) return
    setSubmitting(true)
    try {
      const response = await plannerApi.submitPlanForReview(projectId)
      const result = unwrapItem(response.data)
      setPlanStatus(result.plan_status)
      setReturnComments(null)
      setNeedsReapproval(false)
      message.success('Plan submitted for review')
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not submit plan for review.')
    } finally {
      setSubmitting(false)
    }
  }, [projectId, canSubmit])

  const returnForRevision = useCallback(
    async (comment) => {
      if (!projectId) return
      setReturning(true)
      try {
        const response = await plannerApi.returnMatrix(projectId, { comment })
        const result = unwrapItem(response.data)
        setPlanStatus(result.plan_status)
        setReturnComments({ comment: result.return_comment, returned_at: result.returned_at })
        setNeedsReapproval(false)
      } catch (err) {
        message.error(err.response?.data?.message || 'Could not return the plan for revision.')
        throw err
      } finally {
        setReturning(false)
      }
    },
    [projectId],
  )

  // Whole-plan approval has no endpoint in api/planner.js — that route
  // belongs to the reviewer/approver's API module. Modeled as a local
  // transition for now so pending_review -> approved is demoable; swap for
  // a real call once that endpoint exists.
  const approvePlan = useCallback(() => {
    setPlanStatus('approved')
    setReturnComments(null)
    setNeedsReapproval(false)
  }, [])

  const flagEditedIfNeeded = useCallback(() => {
    if (planStatus === 'changes_requested') setNeedsReapproval(true)
  }, [planStatus])

  const value = useMemo(
    () => ({
      projectId,
      setProjectId,
      planStatus,
      returnComments,
      needsReapproval,
      isLocked,
      canSubmit,
      submitting,
      returning,
      submitForReview,
      returnForRevision,
      approvePlan,
      flagEditedIfNeeded,
    }),
    [
      projectId,
      setProjectId,
      planStatus,
      returnComments,
      needsReapproval,
      isLocked,
      canSubmit,
      submitting,
      returning,
      submitForReview,
      returnForRevision,
      approvePlan,
      flagEditedIfNeeded,
    ],
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProjectContext() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider')
  }
  return context
}
