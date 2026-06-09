import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadResume, createJD, analyze } from '../api/client'
import {
  UploadIcon, FileIcon, XIcon, BriefcaseIcon, BuildingIcon, LoaderIcon, ArrowRightIcon,
} from '../components/icons'

export default function UploadPage() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  // Priority 8 — focus-management: ref to first error field
  const resumeZoneRef = useRef(null)
  const jdRef = useRef(null)

  const [resumeFile, setResumeFile] = useState(null)
  const [jdText, setJdText] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) setResumeFile(file)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    // Priority 8 — focus-management: focus first invalid field on error
    if (!resumeFile) {
      setError('Please upload your resume (PDF or DOCX).')
      resumeZoneRef.current?.focus()
      return
    }
    if (!jdText.trim()) {
      setError('Please paste the job description.')
      jdRef.current?.focus()
      return
    }
    setError('')
    setLoading(true)
    try {
      const [resumeData, jdData] = await Promise.all([
        uploadResume(resumeFile),
        createJD({ text: jdText, title: jobTitle || undefined, company: company || undefined }),
      ])
      const result = await analyze({ resume_id: resumeData.resume_id, jd_id: jdData.jd_id })
      navigate(`/results/${result.id}`, { state: result })
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong — is the backend running on port 8000?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-up">
      {/* Priority 1 — heading-hierarchy: h1 */}
      <div className="mb-10">
        <p className="text-xs font-mono text-accent uppercase tracking-widest mb-3" aria-hidden="true">
          Resume Analysis
        </p>
        <h1 className="font-display text-4xl font-semibold text-ink leading-tight tracking-tight">
          How well does your resume<br />
          <em className="not-italic text-ink-2">fit this role?</em>
        </h1>
        <p className="mt-3 text-sm text-ink-2 leading-relaxed max-w-md">
          Upload your resume and paste any job description. We extract skills, run semantic matching,
          and show you exactly what aligns — and what doesn't.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate aria-label="Resume analysis form">
        {/* Priority 1 — form-labels: each input has visible label with for attribute */}
        {/* Priority 8 — required-indicators: asterisk on required fields */}

        {/* Resume drop zone */}
        <div className="mb-5">
          <label className="label-text" id="resume-label">
            Resume <span className="text-missing" aria-label="required">*</span>
          </label>
          <div
            ref={resumeZoneRef}
            role="button"
            aria-labelledby="resume-label"
            aria-describedby="resume-hint"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !resumeFile && fileRef.current?.click()}
            className={`relative border-2 rounded-2xl transition-all duration-200 overflow-hidden ${
              dragging
                ? 'border-accent bg-accent-light cursor-copy'
                : resumeFile
                ? 'border-border bg-surface'
                : 'border-dashed border-border-2 bg-surface hover:border-accent hover:bg-accent-light cursor-pointer'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="sr-only"
              aria-hidden="true"
              onChange={(e) => { if (e.target.files[0]) setResumeFile(e.target.files[0]) }}
            />

            {resumeFile ? (
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="w-9 h-9 bg-accent-light rounded-lg flex items-center justify-center flex-shrink-0" aria-hidden="true">
                  <FileIcon className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{resumeFile.name}</p>
                  <p className="text-xs text-ink-3 mt-0.5">{(resumeFile.size / 1024).toFixed(0)} KB</p>
                </div>
                {/* Priority 2 — touch-target-size: min 44×44px */}
                <button
                  type="button"
                  aria-label={`Remove ${resumeFile.name}`}
                  onClick={(e) => { e.stopPropagation(); setResumeFile(null) }}
                  className="w-11 h-11 flex items-center justify-center rounded-lg text-ink-3 hover:text-missing hover:bg-missing-bg transition-colors duration-150 flex-shrink-0 cursor-pointer"
                >
                  <XIcon />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <div className="w-11 h-11 bg-surface-2 rounded-xl flex items-center justify-center mb-3" aria-hidden="true">
                  <UploadIcon className="w-5 h-5 text-ink-2" />
                </div>
                <p className="text-sm font-semibold text-ink">Drop your resume here</p>
                <p className="text-xs text-ink-3 mt-1" id="resume-hint">or click to browse — PDF or DOCX, max 10 MB</p>
              </div>
            )}
          </div>
        </div>

        {/* Job metadata — optional fields */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label htmlFor="job-title" className="label-text">
              <span className="inline-flex items-center gap-1.5">
                <BriefcaseIcon aria-hidden="true" />
                Job Title
                <span className="text-ink-3 font-normal text-xs">(optional)</span>
              </span>
            </label>
            <input
              id="job-title"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Senior Backend Engineer"
              className="input-field"
              /* Priority 8 — autofill-support */
              autoComplete="organization-title"
            />
          </div>
          <div>
            <label htmlFor="company" className="label-text">
              <span className="inline-flex items-center gap-1.5">
                <BuildingIcon aria-hidden="true" />
                Company
                <span className="text-ink-3 font-normal text-xs">(optional)</span>
              </span>
            </label>
            <input
              id="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Corp"
              className="input-field"
              /* Priority 8 — autofill-support */
              autoComplete="organization"
            />
          </div>
        </div>

        {/* Job description — required */}
        <div className="mb-5">
          <label htmlFor="jd-text" className="label-text">
            Job Description <span className="text-missing" aria-label="required">*</span>
          </label>
          <textarea
            id="jd-text"
            ref={jdRef}
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={12}
            placeholder="Paste the full job description here — requirements, responsibilities, everything…"
            className="input-field font-mono text-[13px] resize-y leading-relaxed"
            aria-describedby="jd-wordcount"
            required
          />
          {/* Priority 8 — input-helper-text: persistent helper below field */}
          <p className="mt-1.5 text-xs text-ink-3" id="jd-wordcount" aria-live="polite">
            {jdText
              ? `${jdText.split(/\s+/).filter(Boolean).length} words — include the full requirements section for best results`
              : 'Include requirements, responsibilities, and any preferred qualifications'}
          </p>
        </div>

        {/* Priority 1 + 8 — aria-live errors so screen readers announce them */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2.5 bg-missing-bg border border-missing-border text-missing rounded-xl px-4 py-3 text-sm mb-5"
          >
            <span className="mt-0.5 flex-shrink-0 font-bold" aria-hidden="true">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* Priority 2 — touch-target-size: py-3.5 ensures ≥44px height */}
        {/* Priority 2 — loading-buttons: disabled + spinner during async */}
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          style={{ touchAction: 'manipulation' }}
          className="w-full flex items-center justify-center gap-2 bg-ink text-bg font-semibold text-sm py-3.5 rounded-xl
                     hover:bg-ink/90 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed
                     transition-all duration-150 cursor-pointer"
        >
          {loading ? (
            <>
              <LoaderIcon className="w-4 h-4" />
              Analyzing — this takes a moment…
            </>
          ) : (
            <>
              Analyze Fit
              <ArrowRightIcon />
            </>
          )}
        </button>

        {/* Required field legend */}
        <p className="mt-3 text-xs text-ink-3 text-center">
          <span className="text-missing font-semibold">*</span> Required fields
        </p>
      </form>
    </div>
  )
}
