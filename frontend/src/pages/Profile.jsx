import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaArrowRight, FaBookOpen, FaBriefcase, FaChartLine, FaComments, FaGraduationCap, FaPen, FaUserGraduate } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchStudentProfile, updateAcademicProfile } from "../services/studentService.js";
import { fetchLearningProgress, fetchQuizProgress } from "../services/progressService.js";
import { fetchRoadmaps } from "../services/aiRoadmapService.js";
import { searchResources } from "../services/resourceService.js";

const emptyAcademic = { rollNumber: "", phone: "", year: "", section: "", attendancePercentage: 0, cgpa: 0, courses: [], results: [] };
const idOf = (item) => item?._id || item?.id;

function percent(value) {
  return `${Math.max(0, Math.min(100, Number(value) || 0))}%`;
}

function ProgressBar({ value, tone = "primary" }) {
  return <div className="profile-progress"><div className={`profile-progress-fill ${tone}`} style={{ width: percent(value) }} /></div>;
}

function Detail({ label, value }) {
  return <div className="profile-detail"><span>{label}</span><strong>{value || "Not added"}</strong></div>;
}

function parseCourses(value) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [code = "", name = "", grade = "", credits = ""] = line.split("|").map((part) => part.trim());
    return { code, name, grade, ...(credits ? { credits: Number(credits) || 0 } : {}) };
  }).filter((course) => course.name);
}

function parseResults(value) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [semester = "", gpa = "", status = "Pass"] = line.split("|").map((part) => part.trim());
    return { semester, ...(gpa ? { gpa: Number(gpa) || 0 } : {}), status: ["Pass", "Fail", "Pending"].includes(status) ? status : "Pass" };
  }).filter((result) => result.semester);
}

export default function Profile() {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [learning, setLearning] = useState(null);
  const [quizzes, setQuizzes] = useState(null);
  const [roadmaps, setRoadmaps] = useState([]);
  const [resources, setResources] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyAcademic);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const student = await fetchStudentProfile();
        const [learningData, quizData, roadmapData, resourceData] = await Promise.all([
          fetchLearningProgress(),
          fetchQuizProgress(),
          fetchRoadmaps({ limit: 10 }),
          searchResources({ branch: student.branch, q: student.preferences?.targetRole || undefined, limit: 3 }),
        ]);
        const academic = { ...emptyAcademic, ...(student.academic || {}) };
        setProfile(student);
        setForm(academic);
        setLearning(learningData);
        setQuizzes(quizData);
        setRoadmaps(roadmapData.data || []);
        setResources(resourceData.data || []);
      } catch {
        toast.error("Failed to load your profile");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await updateAcademicProfile({ ...form, attendancePercentage: Number(form.attendancePercentage) || 0, cgpa: Number(form.cgpa) || 0 });
      setProfile(updated);
      setForm({ ...emptyAcademic, ...(updated.academic || {}) });
      updateUser(updated);
      setEditing(false);
      toast.success("Academic profile updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update academic profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="empty"><div className="icon"><i className="fa fa-spinner fa-spin" /></div><p>Loading your profile...</p></div>;
  if (!profile) return <div className="empty"><p>We could not load your profile.</p></div>;

  const academic = profile.academic || emptyAcademic;
  const preferences = profile.preferences || {};
  const currentRoadmap = roadmaps[0];
  const currentRole = preferences.targetRole || currentRoadmap?.roleTitle || "Choose a career role";
  const skills = preferences.skills || [];
  const formValue = (key) => form[key] ?? "";
  const courseText = (form.courses || []).map((course) => [course.code, course.name, course.grade, course.credits].filter((value) => value !== undefined && value !== "").join(" | ")).join("\n");
  const resultText = (form.results || []).map((result) => [result.semester, result.gpa, result.status].join(" | ")).join("\n");

  return (
    <div>
      <div className="page-hero profile-hero-head">
        <div><h1>My <span>Profile</span></h1><p>Your academic record and career direction in one place.</p></div>
        <button className="btn btn-outline" onClick={() => setEditing((value) => !value)}><FaPen /> {editing ? "Close editor" : "Edit academic details"}</button>
      </div>

      <div className="section profile-page">
        <section className="profile-overview profile-panel">
          <div className="profile-avatar"><FaUserGraduate /></div>
          <div className="profile-overview-copy"><span className="profile-kicker">STUDENT PROFILE</span><h2>{profile.name}</h2><p>{profile.email}</p></div>
          <div className="profile-overview-meta"><span className="branch-tag">{profile.branch || "Branch not set"}</span><span className="type-badge badge-core">{academic.year || "Year not set"}</span></div>
        </section>

        {editing && (
          <form className="profile-panel profile-form" onSubmit={save}>
            <div className="profile-section-title"><div><span className="profile-kicker">ACADEMIC RECORD</span><h2>Update your details</h2></div></div>
            <div className="profile-form-grid">
              {[['rollNumber', 'Roll number'], ['phone', 'Phone'], ['year', 'Year'], ['section', 'Section'], ['attendancePercentage', 'Attendance %'], ['cgpa', 'CGPA']].map(([name, label]) => (
                <label key={name}>{label}<input type={name === "attendancePercentage" || name === "cgpa" ? "number" : "text"} step="0.1" min="0" value={formValue(name)} onChange={(event) => setForm((value) => ({ ...value, [name]: event.target.value }))} /></label>
              ))}
              <label className="profile-form-wide">Courses <span>one per line: code | name | grade | credits</span><textarea rows="4" value={courseText} onChange={(event) => setForm((value) => ({ ...value, courses: parseCourses(event.target.value) }))} /></label>
              <label className="profile-form-wide">Academic results <span>one per line: semester | GPA | status</span><textarea rows="3" value={resultText} onChange={(event) => setForm((value) => ({ ...value, results: parseResults(event.target.value) }))} /></label>
            </div>
            <button className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save academic details"}</button>
          </form>
        )}

        <section className="profile-panel">
          <div className="profile-section-title"><div><span className="profile-kicker">PERSONAL INFORMATION</span><h2>Student details</h2></div></div>
          <div className="profile-details-grid"><Detail label="Name" value={profile.name} /><Detail label="Roll number" value={academic.rollNumber} /><Detail label="Email" value={profile.email} /><Detail label="Phone" value={academic.phone} /><Detail label="Branch" value={profile.branch} /><Detail label="Year" value={academic.year} /><Detail label="Section" value={academic.section} /></div>
        </section>

        <div className="profile-grid-2">
          <section className="profile-panel"><div className="profile-section-title"><div><span className="profile-kicker">ACADEMIC SUMMARY</span><h2>How you are doing</h2></div><FaGraduationCap /></div><div className="profile-metric-grid"><div><strong>{academic.attendancePercentage || 0}%</strong><span>Attendance</span><ProgressBar value={academic.attendancePercentage} /></div><div><strong>{academic.cgpa || 0}</strong><span>CGPA / 10</span><ProgressBar value={(Number(academic.cgpa) || 0) * 10} tone="secondary" /></div></div><div className="profile-list">{academic.courses?.length ? academic.courses.map((course) => <div className="profile-list-row" key={`${course.code}-${course.name}`}><span>{course.code || "Course"}</span><strong>{course.name}</strong><em>{course.grade || "-"}</em></div>) : <p className="profile-muted">Add your courses from the editor above.</p>}</div></section>
          <section className="profile-panel"><div className="profile-section-title"><div><span className="profile-kicker">RESULTS</span><h2>Academic results</h2></div><FaChartLine /></div><div className="profile-list">{academic.results?.length ? academic.results.map((result) => <div className="profile-list-row" key={result.semester}><span>{result.semester}</span><strong>{result.gpa ?? "-"} GPA</strong><em className={`profile-status ${result.status.toLowerCase()}`}>{result.status}</em></div>) : <p className="profile-muted">Add semester results from the editor above.</p>}</div></section>
        </div>

        <section className="profile-panel"><div className="profile-section-title"><div><span className="profile-kicker">CAREER SUMMARY</span><h2>Your direction</h2></div><FaBriefcase /></div><div className="career-summary-grid"><div className="career-role"><span>Interested career role</span><strong>{currentRole}</strong><p>{preferences.aiProfileSummary || "Complete your learning profile to make this summary more personal."}</p></div><div><span className="profile-label">Roadmap completion</span><strong className="career-number">{learning?.overallProgress || 0}%</strong><ProgressBar value={learning?.overallProgress} /></div><div><span className="profile-label">Latest quiz score</span><strong className="career-number">{quizzes?.averageScore || 0}%</strong><ProgressBar value={quizzes?.averageScore} tone="secondary" /></div></div><div className="profile-tags">{skills.length ? skills.map((skill) => <span className="type-badge badge-core" key={skill.name}>{skill.name} · {skill.level}</span>) : <span className="profile-muted">No skills added yet.</span>}</div></section>

        <section className="profile-panel"><div className="profile-section-title"><div><span className="profile-kicker">RECOMMENDED RESOURCES</span><h2>Keep learning</h2></div><FaBookOpen /></div>{resources.length ? <div className="resource-profile-grid">{resources.map((resource) => <a className="resource-profile-card" href={resource.url} target="_blank" rel="noreferrer" key={idOf(resource)}><span>{resource.type}</span><strong>{resource.title}</strong><small>{resource.technology}</small></a>)}</div> : <p className="profile-muted">Resources will appear here as your career interests become more specific.</p>}</section>

        <section className="profile-panel quick-actions"><div className="profile-section-title"><div><span className="profile-kicker">QUICK ACTIONS</span><h2>Continue from here</h2></div></div><div className="quick-action-grid"><button onClick={() => navigate("/roadmaps")}><FaArrowRight /><span>View Roadmap</span></button><button onClick={() => navigate("/quiz")}><FaGraduationCap /><span>Take Quiz</span></button><button onClick={() => navigate("/chat")}><FaComments /><span>Open AI Assistant</span></button><button onClick={() => navigate("/resources")}><FaBookOpen /><span>View Resources</span></button></div></section>
      </div>
    </div>
  );
}