import api from "./api.js";

export function fetchStudentProfile() {
  return api.get("/students/me").then((r) => r.data.data);
}

export function updateAcademicProfile(payload) {
  return api.put("/students/profile/academic", payload).then((r) => r.data.data);
}

export function getInterestForRole(roleId) {
  return api.get(`/students/interest/${roleId}`).then((r) => r.data.data);
}

export function recordInterest(roleId, committed) {
  return api.post("/students/interest", { roleId, committed }).then((r) => r.data.data);
}

// ── AI learning profile ──
export function extractProfile(text) {
  return api.post("/students/profile/extract", { text }).then((r) => r.data.data);
}

export function updatePreferences(payload) {
  return api.put("/students/profile/preferences", payload).then((r) => r.data.data);
}

export function skipOnboarding() {
  return api.post("/students/profile/skip-onboarding").then((r) => r.data.data);
}
