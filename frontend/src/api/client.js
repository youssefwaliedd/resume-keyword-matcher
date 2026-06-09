import axios from 'axios'

// In production set VITE_API_URL to the deployed backend, e.g.
// https://resume-matcher-api.onrender.com — in local dev the Vite proxy
// handles "/api" so we default to a relative path.
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api'

const api = axios.create({ baseURL })

export async function uploadResume(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/resume/upload', form)
  return data
}

export async function createJD({ text, title, company }) {
  const { data } = await api.post('/jd', { text, title, company })
  return data
}

export async function analyze({ resume_id, jd_id }) {
  const { data } = await api.post('/analyze', { resume_id, jd_id })
  return data
}

export async function getAnalysis(id) {
  const { data } = await api.get(`/analysis/${id}`)
  return data
}

export async function listAnalyses(resume_id) {
  const params = resume_id != null ? { resume_id } : {}
  const { data } = await api.get('/analyses', { params })
  return data
}

export async function getSuggestions(id) {
  const { data } = await api.post(`/analysis/${id}/suggest`)
  return data
}

export async function deleteAnalysis(id) {
  await api.delete(`/analysis/${id}`)
}
