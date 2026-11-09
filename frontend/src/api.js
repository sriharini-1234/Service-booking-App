const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
export function getToken(){ return localStorage.getItem('token') }
export async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`
  const response = await fetch(`${API}${path}`, { ...options, headers })
  const data = response.status === 204 ? null : await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.detail || 'Something went wrong')
  return data
}
