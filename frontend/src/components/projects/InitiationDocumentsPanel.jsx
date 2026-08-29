import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Space, Tooltip, Typography, message } from 'antd'
import {
  CheckCircleFilled,
  CloseCircleFilled,
  EyeOutlined,
  MinusCircleFilled,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import api from '../../lib/axios'
import { fetchAuthorizedFileUrl, storeProjectId, unwrapItem } from '../../lib/apiHelpers'

const { Text } = Typography

function Pill({ bg, color, children }) {
  return (
    <span
      style={{
        display: 'inline-block',
        background: bg,
        color,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

function RequirementTag({ required }) {
  return required ? (
    <Pill bg="#FBEAEA" color="#962c30">Required</Pill>
  ) : (
    <Pill bg="#F2F3F5" color="#555F6D">Optional</Pill>
  )
}

function ChecklistRow({ item }) {
  if (item.uploaded) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <CheckCircleFilled style={{ color: '#278A45' }} />
        <Text>{item.label}</Text>
      </div>
    )
  }

  if (item.required) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <CloseCircleFilled style={{ color: '#B3261E' }} />
        <Text>Missing required document: {item.label}.</Text>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 py-1.5">
      <MinusCircleFilled style={{ color: '#98A2B3' }} />
      <Text type="secondary">{item.label} (optional, not attached)</Text>
    </div>
  )
}

export default function InitiationDocumentsPanel({ projectId, hideProceed = false, onProceeded = null }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const uploadKeyRef = useRef(null)
  const [readiness, setReadiness] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploadingKey, setUploadingKey] = useState(null)
  const [advancing, setAdvancing] = useState(null)

  const loadReadiness = useCallback(async () => {
    if (!projectId) {
      setReadiness(null)
      return
    }
    setLoading(true)
    try {
      const response = await api.get(`/projects/${projectId}/initiation-readiness`)
      setReadiness(unwrapItem(response.data))
    } catch {
      message.error('Could not load initiation readiness.')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadReadiness()
  }, [loadReadiness])

  const triggerUpload = (key) => {
    if (!projectId) return
    uploadKeyRef.current = key
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    const documentType = uploadKeyRef.current
    if (!file || !documentType || !projectId) return

    setUploadingKey(documentType)
    try {
      const formData = new FormData()
      formData.append('document_type', documentType)
      formData.append('file', file)
      await api.post(`/projects/${projectId}/documents`, formData)
      message.success('Document uploaded.')
      await loadReadiness()
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not upload document.')
    } finally {
      setUploadingKey(null)
    }
  }

  const viewDocument = async (document) => {
    try {
      const url = await fetchAuthorizedFileUrl(document.id)
      window.open(url, '_blank', 'noopener')
    } catch {
      message.error('Could not open file.')
    }
  }

  const proceedToPlanning = async () => {
    if (!projectId) return
    setAdvancing(true)
    try {
      await api.post(`/projects/${projectId}/advance-to-planning`)
      message.success('Project advanced to Planning.')
      storeProjectId(projectId)
      if (onProceeded) {
        onProceeded()
      } else {
        navigate('/projects', { replace: true })
      }
    } catch (err) {
      const blockers = err.response?.data?.errors?.blockers
      if (Array.isArray(blockers) && blockers.length) {
        blockers.forEach((blocker) => message.error(blocker))
      } else {
        message.error(err.response?.data?.message || 'Could not advance to Planning.')
      }
    } finally {
      setAdvancing(false)
    }
  }

  const disabled = !projectId
  const documents = readiness?.documents ?? []
  const ready = Boolean(readiness?.ready)
  const blockers = readiness?.blockers ?? []

  return (
    <div className={disabled ? 'pointer-events-none opacity-50' : ''}>
      <input ref={fileInputRef} type="file" accept=".pdf,.docx,.xlsx" className="hidden" onChange={handleFileSelected} />

      <div className="mb-4 flex items-center justify-between">
        <Text strong className="text-base">Initiation Documents</Text>
        {!disabled && (
          <Button size="small" icon={<ReloadOutlined />} onClick={loadReadiness} loading={loading}>
            Refresh
          </Button>
        )}
      </div>

      {disabled && (
        <Text type="secondary">Complete Details & assignment first — documents can be attached once the project is saved.</Text>
      )}

      {!disabled && (
        <>
          <div className="rounded-xl border border-[var(--pms-border,#ECE8E4)]">
            {documents.map((item, index) => (
              <div
                key={item.key}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                style={{ borderTop: index === 0 ? 'none' : '1px solid #ECE8E4' }}
              >
                <div className="flex items-center gap-3">
                  <Text strong>{item.label}</Text>
                  <RequirementTag required={item.required} />
                </div>

                <Space wrap>
                  {item.uploaded ? (
                    <>
                      <Text type="secondary">
                        {item.document.file_name} (v{item.document.version_number})
                      </Text>
                      <Button size="small" icon={<EyeOutlined />} onClick={() => viewDocument(item.document)}>
                        View
                      </Button>
                      <Button
                        size="small"
                        icon={<UploadOutlined />}
                        loading={uploadingKey === item.key}
                        onClick={() => triggerUpload(item.key)}
                      >
                        Replace
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="small"
                      type="primary"
                      icon={<UploadOutlined />}
                      loading={uploadingKey === item.key}
                      onClick={() => triggerUpload(item.key)}
                    >
                      Upload
                    </Button>
                  )}
                </Space>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Text strong className="text-base">Readiness Checklist</Text>
            <div className="mt-2">
              {documents.map((item) => (
                <ChecklistRow key={item.key} item={item} />
              ))}
            </div>
          </div>

          {!hideProceed && (
            <div className="mt-6 flex items-center gap-3">
              <Tooltip
                title={
                  ready
                    ? 'All required initiation documents are attached.'
                    : `Missing: ${blockers.map((b) => b.replace('Missing required document: ', '').replace(/\.$/, '')).join(', ')}`
                }
              >
                <Button type="primary" disabled={!ready} loading={advancing} onClick={proceedToPlanning}>
                  Proceed to Planning
                </Button>
              </Tooltip>
            </div>
          )}
        </>
      )}
    </div>
  )
}
