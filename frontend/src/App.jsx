import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { fetchInvestigations } from "./features/investigation/investigationSlice";
import {
  ClipboardList,
  CheckCircle,
  Clock,
  Plus,
  RefreshCw,
  X,
  Save,
  BrainCircuit,
  WandSparkles,
  FileText,
  AlertCircle,
  Upload,
  Send,
} from "lucide-react";
import "./App.css";

const API = "http://127.0.0.1:8000";

const initialForm = {
  incident_id: "",
  product_name: "",
  batch_number: "",
  equipment: "",
  incident_type: "",
  description: "",
  expected_value: "",
  actual_value: "",
};

function App() {
  const dispatch = useDispatch();

  const { items = [], loading, error } = useSelector(
    (state) => state.investigations
  );

  const [activePage, setActivePage] = useState("dashboard");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [incidentText, setIncidentText] = useState("");
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuccess, setAiSuccess] = useState("");

  const [extractedData, setExtractedData] = useState(null);
  const [rcaData, setRcaData] = useState(null);
  const [savedInvestigationId, setSavedInvestigationId] = useState(null);
const [workflowStatus, setWorkflowStatus] = useState("");
const [reviewerName, setReviewerName] = useState("");
const [reviewComments, setReviewComments] = useState("");
const [workflowBusy, setWorkflowBusy] = useState(false);
const [workflowMessage, setWorkflowMessage] = useState("");
const [workflowError, setWorkflowError] = useState("");


  // RCA Copilot states
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I'm your AIVOA RCA Copilot. Upload an incident PDF or describe a manufacturing incident. I can help extract details and generate a structured root cause analysis.",
    },
  ]);

  useEffect(() => {
    dispatch(fetchInvestigations());
  }, [dispatch]);

  useEffect(() => {
    document.body.style.overflow = showForm ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [showForm]);

  const total = items.length;

  const underReview = items.filter(
    (item) => item.status === "Under Review"
  ).length;

 const completed = items.filter(
  (item) =>
    item.status === "Committed" ||
    item.status === "Completed"
).length;

  function handleNavigation(page) {
    setActivePage(page);
    setSuccessMessage("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Save investigation to PostgreSQL
  
async function handleSubmit(event) {
  event.preventDefault();

  setSaving(true);
  setFormError("");
console.log("EXTRACTED DATA:", extractedData);
console.log("COMPLETE RCA DATA:", rcaData);
  const payload = {
    ...form,

    // Complete RCA information
    five_whys: rcaData?.five_whys || [],
    fishbone: rcaData?.fishbone || {},
    potential_causes:
      rcaData?.potential_causes ||
      extractedData?.possible_causes ||
      [],
    missing_evidence:
      rcaData?.missing_evidence ||
      extractedData?.missing_evidence ||
      [],
    capa_recommendations: rcaData?.capa || {},
  };

  try {
    const response = await axios.post(
      `${API}/api/investigations`,
      payload
    );

    setSavedInvestigationId(response.data.id);
    setWorkflowStatus(response.data.status || "Draft");
    setWorkflowMessage("Investigation and complete RCA saved successfully.");
    setWorkflowError("");

    setShowForm(false);
    setActivePage("ai");

    await dispatch(fetchInvestigations());
  } catch (err) {
    setFormError(
      err.response?.data?.detail ||
        "Unable to save investigation. Please try again."
    );
  } finally {
    setSaving(false);
  }
}

async function saveReviewedChanges() {
  if (!savedInvestigationId) return;

  setWorkflowBusy(true);
  setWorkflowError("");
  setWorkflowMessage("");

  try {
    const payload = {
      product_name: extractedData?.product_name ?? form.product_name,
      batch_number: extractedData?.batch_number ?? form.batch_number,
      equipment: extractedData?.equipment ?? form.equipment,
      incident_type: extractedData?.incident_type ?? form.incident_type,
      description: extractedData?.description ?? form.description,
      expected_value: extractedData?.expected_value ?? form.expected_value,
      actual_value: extractedData?.actual_value ?? form.actual_value,

      five_whys: rcaData?.five_whys || [],
      fishbone: rcaData?.fishbone || {},
      potential_causes: rcaData?.potential_causes || [],
      missing_evidence: rcaData?.missing_evidence || [],
      capa_recommendations: rcaData?.capa || {},
    };

    await axios.patch(
      `${API}/api/investigations/${savedInvestigationId}`,
      payload
    );

    setWorkflowMessage("Reviewed RCA changes saved successfully.");
    await dispatch(fetchInvestigations());
  } catch (err) {
    setWorkflowError(
      err.response?.data?.detail || "Unable to save reviewed changes."
    );
  } finally {
    setWorkflowBusy(false);
  }
}


async function submitForReview() {
  if (!savedInvestigationId) return;

  setWorkflowBusy(true);
  setWorkflowError("");
  setWorkflowMessage("");

  try {
    await axios.patch(
      `${API}/api/investigations/${savedInvestigationId}`,
      {
        product_name: extractedData?.product_name ?? form.product_name,
        batch_number: extractedData?.batch_number ?? form.batch_number,
        equipment: extractedData?.equipment ?? form.equipment,
        incident_type: extractedData?.incident_type ?? form.incident_type,
        description: extractedData?.description ?? form.description,
        expected_value: extractedData?.expected_value ?? form.expected_value,
        actual_value: extractedData?.actual_value ?? form.actual_value,
        five_whys: rcaData?.five_whys || [],
        fishbone: rcaData?.fishbone || {},
        potential_causes: rcaData?.potential_causes || [],
        missing_evidence: rcaData?.missing_evidence || [],
        capa_recommendations: rcaData?.capa || {},
      }
    );

    const response = await axios.post(
      `${API}/api/investigations/${savedInvestigationId}/submit-review`
    );

    setWorkflowStatus(response.data.status);
    setWorkflowMessage("Investigation submitted for review.");

    await dispatch(fetchInvestigations());
  } catch (err) {
    setWorkflowError(
      err.response?.data?.detail || "Unable to submit investigation."
    );
  } finally {
    setWorkflowBusy(false);
  }
}


async function approveInvestigation() {
  if (!savedInvestigationId) return;

  if (!reviewerName.trim()) {
    setWorkflowError("Please enter the investigator's name.");
    return;
  }

  setWorkflowBusy(true);
  setWorkflowError("");
  setWorkflowMessage("");

  try {
    const response = await axios.post(
      `${API}/api/investigations/${savedInvestigationId}/approve`,
      {
        reviewer_name: reviewerName,
        review_comments: reviewComments,
      }
    );

    setWorkflowStatus(response.data.status);
    setWorkflowMessage("Investigation approved successfully.");

    await dispatch(fetchInvestigations());
  } catch (err) {
    setWorkflowError(
      err.response?.data?.detail || "Unable to approve investigation."
    );
  } finally {
    setWorkflowBusy(false);
  }
}

async function commitInvestigation() {
  if (!savedInvestigationId) return;

  const confirmed = window.confirm(
    "Are you sure you want to commit this approved investigation to the QMS Ledger?"
  );

  if (!confirmed) return;

  setWorkflowBusy(true);
  setWorkflowError("");
  setWorkflowMessage("");

  try {
    const response = await axios.post(
      `${API}/api/investigations/${savedInvestigationId}/commit`
    );

    setWorkflowStatus(response.data.status);
    setWorkflowMessage("Investigation committed to QMS Ledger successfully.");

    await dispatch(fetchInvestigations());
  } catch (err) {
    setWorkflowError(
      err.response?.data?.detail || "Unable to commit investigation."
    );
  } finally {
    setWorkflowBusy(false);
  }
}

  // Upload PDF and extract text
  async function handlePdfUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setPdfError("");
    setAiError("");
    setAiSuccess("");
    setExtractedData(null);
    setRcaData(null);

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setPdfError("Please select a PDF file.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setPdfError("PDF must be smaller than 10 MB.");
      event.target.value = "";
      return;
    }

    setSelectedPdf(file);
    setUploadingPdf(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        `${API}/api/upload-pdf`,
        formData
      );

      setIncidentText(response.data.extracted_text || "");

      setAiSuccess(
        `Text extracted from ${response.data.filename || file.name}. Review it below, then click Analyze with AI.`
      );
    } catch (err) {
      setPdfError(
        err.response?.data?.detail ||
          "PDF upload failed. Check that the backend is running."
      );

      setSelectedPdf(null);
    } finally {
      setUploadingPdf(false);
      event.target.value = "";
    }
  }

  // Generate complete RCA using LangGraph and Groq
  async function handleAIAnalysis() {
    if (!incidentText.trim()) {
      setAiError("Please enter an incident report first.");
      return;
    }

    setAnalyzing(true);
    setAiError("");
    setAiSuccess("");
    setExtractedData(null);
    setRcaData(null);

    try {
      const response = await axios.post(`${API}/api/rca`, {
        incident_text: incidentText,
      });

      setExtractedData(response.data.extracted_data);
      setRcaData(response.data.rca);

      setAiSuccess(
        "Incident extraction and Root Cause Analysis completed. Review and edit the results below."
      );

      setChatMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: "Your incident report has been analyzed successfully. The extracted details and RCA findings are available in the investigation workspace.",
        },
      ]);
    } catch (err) {
      setAiError(
        err.response?.data?.detail ||
          "AI analysis failed. Please try again."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  // Edit extracted incident information
  function handleExtractedChange(event) {
    const { name, value } = event.target;

    setExtractedData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Edit Five Whys
  function updateFiveWhy(index, field, value) {
    setRcaData((previous) => ({
      ...previous,
      five_whys: previous.five_whys.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: value }
          : item
      ),
    }));
  }

  // Edit Fishbone categories
  function updateFishbone(category, value) {
    setRcaData((previous) => ({
      ...previous,
      fishbone: {
        ...previous.fishbone,
        [category]: value
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      },
    }));
  }

  // Edit potential causes and missing evidence
  function updateListItem(field, index, value) {
    setRcaData((previous) => ({
      ...previous,
      [field]: previous[field].map((item, itemIndex) =>
        itemIndex === index
          ? typeof item === "string"
            ? value
            : { ...item, cause: value }
          : item
      ),
    }));
  }

  // Edit CAPA recommendations
  function updateCapa(actionType, index, field, value) {
    setRcaData((previous) => ({
      ...previous,
      capa: {
        ...previous.capa,
        [actionType]: previous.capa[actionType].map(
          (item, itemIndex) =>
            itemIndex === index
              ? { ...item, [field]: value }
              : item
        ),
      },
    }));
  }

  // Move extracted information to investigation form
  function createFromAI() {
    setForm({
      ...initialForm,
      product_name: extractedData.product_name ?? "",
      batch_number: extractedData.batch_number ?? "",
      equipment: extractedData.equipment ?? "",
      incident_type: extractedData.incident_type ?? "",
      description: extractedData.description ?? "",
      expected_value: extractedData.expected_value ?? "",
      actual_value: extractedData.actual_value ?? "",
    });

    setFormError("");
    setShowForm(true);
  }

  // RCA Copilot chat function
  async function handleChatSend(event) {
    event.preventDefault();

    const message = chatInput.trim();

    if (!message || sendingChat) return;

    setChatMessages((previous) => [
      ...previous,
      { role: "user", text: message },
    ]);

    setChatInput("");

    // Simple correction commands
    const correctionFields = {
      "product name": "product_name",
      "batch number": "batch_number",
      equipment: "equipment",
      "incident type": "incident_type",
      description: "description",
      "expected value": "expected_value",
      "actual value": "actual_value",
    };

    const correctionMatch = message.match(
      /(?:change|update|correct|set)\s+(product name|batch number|equipment|incident type|description|expected value|actual value)\s+(?:to|as)\s+(.+)/i
    );

    if (correctionMatch && extractedData) {
      const field =
        correctionFields[correctionMatch[1].toLowerCase()];

      const newValue = correctionMatch[2]
        .trim()
        .replace(/[.!?]$/, "");

      setExtractedData((previous) => ({
        ...previous,
        [field]: newValue,
      }));

      setForm((previous) => ({
        ...previous,
        [field]: newValue,
      }));

      setChatMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: `I've updated ${correctionMatch[1]} to "${newValue}". Please verify the change in the extracted investigation details.`,
        },
      ]);

      return;
    }

    // Analyze report through existing RCA API
    const reportToAnalyze = incidentText.trim() || message;

    setSendingChat(true);
    setAiError("");

    try {
      const response = await axios.post(`${API}/api/rca`, {
        incident_text: reportToAnalyze,
      });

      setExtractedData(response.data.extracted_data);
      setRcaData(response.data.rca);

      if (!incidentText.trim()) {
        setIncidentText(message);
      }

      setAiSuccess("RCA generated successfully through Copilot.");

      setChatMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: "I've analyzed the incident and updated the investigation workspace with extracted details, Five Whys, Fishbone analysis, potential causes, missing evidence and CAPA recommendations. Please review the results before approval.",
        },
      ]);
    } catch (err) {
      setChatMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text:
            err.response?.data?.detail ||
            "I couldn't complete the analysis. Please check that the backend is running and try again.",
        },
      ]);
    } finally {
      setSendingChat(false);
    }
  }

  return (
    <div className="app-layout">

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">A</div>

          <div>
            <h2>AIVOA</h2>
            <span>QUALITY INTELLIGENCE</span>
          </div>
        </div>

        <p className="nav-heading">WORKSPACE</p>

        <button
          type="button"
          className={`nav-item ${
            activePage === "dashboard" ? "active" : ""
          }`}
          onClick={() => handleNavigation("dashboard")}
        >
          <ClipboardList size={18} />
          Dashboard
        </button>

        <button
          type="button"
          className={`nav-item ${
            activePage === "ai" ? "active" : ""
          }`}
          onClick={() => handleNavigation("ai")}
        >
          <BrainCircuit size={18} />
          AI Analysis
        </button>

        <div className="sidebar-footer">
          <span className="online-dot"></span>
          System operational
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">

        <header className="topbar">
          <div>
            <p className="breadcrumb">
              Workspace /{" "}
              {activePage === "dashboard"
                ? "Dashboard"
                : "AI Analysis"}
            </p>

            <h1>
              {activePage === "dashboard"
                ? "Investigation Dashboard"
                : "AI Incident Analysis"}
            </h1>

            <p className="subtitle">
              {activePage === "dashboard"
                ? "Monitor pharmaceutical quality incidents and investigations."
                : "Analyze pharmaceutical incident reports using artificial intelligence."}
            </p>
          </div>

          <div className="user-avatar">QA</div>
        </header>

        {/* DASHBOARD PAGE */}
        {activePage === "dashboard" && (
          <div className="page-content" key="dashboard">

            {successMessage && (
              <p className="success-message">
                {successMessage}
              </p>
            )}

            <section className="stats-grid">

              <div className="stat-card">
                <div className="stat-icon blue">
                  <ClipboardList size={21} />
                </div>

                <p>Total Investigations</p>
                <h2>{total}</h2>
                <span>All recorded incidents</span>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange">
                  <Clock size={21} />
                </div>

                <p>Under Review</p>
                <h2>{underReview}</h2>
                <span>Awaiting investigation</span>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">
                  <CheckCircle size={21} />
                </div>

                <p>Completed</p>
                <h2>{completed}</h2>
                <span>Closed investigations</span>
              </div>

            </section>

            <section className="investigation-panel">

              <div className="panel-header">
                <div>
                  <h2>Recent Investigations</h2>
                  <p>Incidents retrieved from your database</p>
                </div>

                <div className="panel-actions">

                  <button
                    className="refresh-button"
                    onClick={() =>
                      dispatch(fetchInvestigations())
                    }
                  >
                    <RefreshCw size={16} />
                    Refresh
                  </button>

                  <button
                    className="primary-button"
                    onClick={() => {
                      setForm(initialForm);
                      setFormError("");
                      setShowForm(true);
                    }}
                  >
                    <Plus size={17} />
                    New Investigation
                  </button>

                </div>
              </div>

              {loading && (
                <p className="message">
                  Loading investigations...
                </p>
              )}

              {error && (
                <p className="error-message">
                  Unable to load investigations: {error}
                </p>
              )}

              {!loading && !error && items.length === 0 && (
                <div className="empty-state">
                  <ClipboardList size={35} />
                  <h3>No investigations yet</h3>
                  <p>
                    Click New Investigation to record an incident.
                  </p>
                </div>
              )}

              {!loading && !error && items.length > 0 && (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Incident ID</th>
                        <th>Product</th>
                        <th>Batch Number</th>
                        <th>Equipment</th>
                        <th>Incident Type</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="incident-id">
                            {item.incident_id}
                          </td>

                          <td>{item.product_name || "—"}</td>
                          <td>{item.batch_number || "—"}</td>
                          <td>{item.equipment || "—"}</td>
                          <td>{item.incident_type || "—"}</td>

                          <td>
                            <span
                              className={`status ${
                                item.status === "Completed"
                                  ? "status-completed"
                                  : "status-review"
                              }`}
                            >
                              {item.status || "Under Review"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </section>
          </div>
        )}

        {/* AI ANALYSIS PAGE */}
        {activePage === "ai" && (
          <div className="ai-workspace" key="ai">

            <div className="ai-heading">
              <div className="ai-heading-icon">
                <BrainCircuit size={25} />
              </div>

              <div>
                <h2>AI Incident Analysis</h2>
                <p>
                  Extract pharmaceutical incident information using Groq AI.
                </p>
              </div>
            </div>

            {/* INCIDENT INPUT AND RCA COPILOT */}
            <div className="ai-top-grid">

              {/* INCIDENT INPUT */}
              <div className="ai-input-card">

                <label>Incident Report</label>

                {/* PDF UPLOAD */}
                <div
                  className="pdf-upload-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px",
                    padding: "16px",
                    marginBottom: "18px",
                    border: "1px dashed #9bb8df",
                    borderRadius: "10px",
                    background: "#f7faff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <Upload size={20} color="#2869c7" />

                    <div>
                      <strong
                        style={{
                          display: "block",
                          color: "#243d5c",
                          fontSize: "13px",
                        }}
                      >
                        Upload incident report PDF
                      </strong>

                      <span
                        style={{
                          color: "#8594a9",
                          fontSize: "12px",
                        }}
                      >
                        PDF only · Maximum 10 MB · Selectable text PDFs
                      </span>
                    </div>
                  </div>

                  <label
                    className="primary-button"
                    style={{
                      margin: 0,
                      cursor: uploadingPdf ? "wait" : "pointer",
                    }}
                  >
                    <Upload size={16} />

                    {uploadingPdf
                      ? "Extracting PDF..."
                      : "Choose PDF"}

                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handlePdfUpload}
                      disabled={uploadingPdf}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>

                {selectedPdf && !uploadingPdf && !pdfError && (
                  <p className="message">
                    <FileText size={16} />
                    Selected: {selectedPdf.name}
                  </p>
                )}

                {uploadingPdf && (
                  <p className="message">
                    Uploading PDF and extracting text...
                  </p>
                )}

                {pdfError && (
                  <p className="error-message">
                    <AlertCircle size={16} />
                    {pdfError}
                  </p>
                )}

                <textarea
                  value={incidentText}
                  onChange={(event) =>
                    setIncidentText(event.target.value)
                  }
                  placeholder="Paste your pharmaceutical manufacturing incident report or email here..."
                  rows={9}
                />

                <div className="ai-input-footer">
                  <span>
                    <FileText size={15} />
                    Paste text from an incident report or email.
                  </span>

                  <button
                    className="primary-button"
                    onClick={handleAIAnalysis}
                    disabled={analyzing}
                  >
                    <WandSparkles size={17} />

                    {analyzing
                      ? "Analyzing..."
                      : "Analyze with AI"}
                  </button>
                </div>

                {analyzing && (
                  <p className="message">
                    <BrainCircuit size={17} />
                    AI is analyzing your incident report...
                  </p>
                )}

                {aiError && (
                  <p className="error-message">
                    <AlertCircle size={16} />
                    {aiError}
                  </p>
                )}

                {aiSuccess && (
                  <p className="success-message">
                    <CheckCircle size={16} />
                    {aiSuccess}
                  </p>
                )}

              </div>

              {/* RIGHT SIDE RCA COPILOT */}
              <aside className="rca-copilot">

                <div className="copilot-header">
                  <div className="copilot-avatar">
                    <BrainCircuit size={22} />
                  </div>

                  <div className="copilot-title">
                    <h3>RCA Copilot</h3>
                    <span>AI Quality Investigation Assistant</span>
                  </div>

                  <span
                    className="copilot-online"
                    title="Ready"
                  />
                </div>

                <div className="copilot-welcome">
                  <strong>
                    How can I help with your investigation?
                  </strong>

                  <p>
                    Describe an incident, ask for an RCA,
                    or correct extracted investigation details.
                  </p>
                </div>

                <div
                  className="copilot-messages"
                  aria-live="polite"
                >
                  {chatMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`chat-message ${
                        message.role === "user"
                          ? "user-message"
                          : "assistant-message"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <BrainCircuit size={16} />
                      )}

                      <p>{message.text}</p>
                    </div>
                  ))}

                  {sendingChat && (
                    <div className="chat-message assistant-message">
                      <BrainCircuit size={16} />
                      <p>Analyzing your incident...</p>
                    </div>
                  )}
                </div>

                <form
                  className="copilot-input"
                  onSubmit={handleChatSend}
                >
                  <textarea
                    value={chatInput}
                    onChange={(event) =>
                      setChatInput(event.target.value)
                    }
                    placeholder="Describe an incident or ask for RCA..."
                    rows={2}
                    aria-label="Message the RCA Copilot"
                  />

                  <button
                    type="submit"
                    disabled={sendingChat || !chatInput.trim()}
                    aria-label="Send message"
                    title="Send message"
                  >
                    <Send size={18} />
                  </button>
                </form>

                <p className="copilot-disclaimer">
                  AI suggestions require investigator verification.
                </p>

              </aside>

            </div>

            {/* AI RESULTS */}
            {extractedData && (
              <div className="ai-results-card">

                <div className="panel-header">
                  <div>
                    <h2>Extracted Investigation Details</h2>
                    <p>
                      Review and edit the AI-generated information.
                    </p>
                  </div>

                  <span className="status status-completed">
                    Extraction Complete
                  </span>
                </div>

                {/* EXTRACTED FIELDS */}
                <div className="extracted-grid">
                  {[
                    ["Product Name", "product_name"],
                    ["Batch Number", "batch_number"],
                    ["Equipment", "equipment"],
                    ["Incident Type", "incident_type"],
                    ["Incident Date", "incident_date"],
                    ["Expected Value", "expected_value"],
                    ["Actual Value", "actual_value"],
                  ].map(([label, key]) => (
                    <label key={key}>
                      {label}

                      <input
                        name={key}
                        value={extractedData[key] ?? ""}
                        onChange={handleExtractedChange}
                        placeholder="Not provided in report"
                      />
                    </label>
                  ))}

                  <label className="full-width">
                    Incident Description

                    <textarea
                      name="description"
                      rows={4}
                      value={extractedData.description ?? ""}
                      onChange={handleExtractedChange}
                    />
                  </label>
                </div>

                {/* POSSIBLE CAUSES */}
                <div className="analysis-list">
                  <h3>Possible Causes — AI Hypotheses</h3>

                  {extractedData.possible_causes?.length > 0 ? (
                    <ul>
                      {extractedData.possible_causes.map(
                        (cause, index) => (
                          <li key={index}>{cause}</li>
                        )
                      )}
                    </ul>
                  ) : (
                    <p>No possible causes identified.</p>
                  )}

                  <h3>Missing Evidence</h3>

                  {extractedData.missing_evidence?.length > 0 ? (
                    <ul>
                      {extractedData.missing_evidence.map(
                        (evidence, index) => (
                          <li key={index}>{evidence}</li>
                        )
                      )}
                    </ul>
                  ) : (
                    <p>No missing evidence identified.</p>
                  )}
                </div>

                {/* COMPLETE RCA RESULTS */}
                {rcaData && (
                  <section
                    className="analysis-list rca-review-section"
                    style={{
                      marginTop: "28px",
                      paddingTop: "22px",
                      borderTop: "1px solid #e5eaf1",
                    }}
                  >
                    <div className="panel-header">
                      <div>
                        <h2>Root Cause Analysis</h2>
                        <p>
                          Review and edit AI-generated findings below.
                        </p>
                      </div>

                      <span className="status status-review">
                        Human review required
                      </span>
                    </div>

                    {/* FIVE WHYS */}
                    <h3>1. Five Whys Analysis</h3>

                    {(rcaData.five_whys || []).map(
                      (item, index) => (
                        <div
                          className="rca-edit-card"
                          key={`why-${index}`}
                          style={{
                            padding: "14px",
                            margin: "12px 0",
                            border: "1px solid #e5eaf1",
                            borderRadius: "10px",
                            background: "#fbfcfe",
                          }}
                        >
                          <strong>
                            Why {item.why || index + 1}
                          </strong>

                          <label>
                            Question

                            <input
                              value={item.question || ""}
                              onChange={(event) =>
                                updateFiveWhy(
                                  index,
                                  "question",
                                  event.target.value
                                )
                              }
                            />
                          </label>

                          <label>
                            Analysis / Answer

                            <textarea
                              rows={2}
                              value={item.answer || ""}
                              onChange={(event) =>
                                updateFiveWhy(
                                  index,
                                  "answer",
                                  event.target.value
                                )
                              }
                            />
                          </label>
                        </div>
                      )
                    )}

                    {/* FISHBONE */}
                    <h3>2. Fishbone (Ishikawa) Analysis</h3>

                    <p>
                      Edit each category. Enter one contributing
                      factor per line.
                    </p>

                    <div className="extracted-grid">
                      {Object.entries(
                        rcaData.fishbone || {}
                      ).map(([category, factors]) => (
                        <label key={category}>
                          {category}

                          <textarea
                            rows={3}
                            value={(factors || []).join("\n")}
                            onChange={(event) =>
                              updateFishbone(
                                category,
                                event.target.value
                              )
                            }
                            placeholder="No supported factors identified"
                          />
                        </label>
                      ))}
                    </div>

                    {/* POTENTIAL CAUSES */}
                    <h3>3. Potential Causes (Hypotheses)</h3>

                    {(rcaData.potential_causes || []).map(
                      (item, index) => (
                        <div
                          className="rca-edit-card"
                          key={`cause-${index}`}
                          style={{
                            padding: "14px",
                            margin: "12px 0",
                            border: "1px solid #e5eaf1",
                            borderRadius: "10px",
                            background: "#fbfcfe",
                          }}
                        >
                          <label>
                            Potential cause

                            <textarea
                              rows={2}
                              value={item.cause || ""}
                              onChange={(event) =>
                                updateListItem(
                                  "potential_causes",
                                  index,
                                  event.target.value
                                )
                              }
                            />
                          </label>

                          <p>{item.reason || ""}</p>

                          <span className="status status-review">
                            {item.status || "Hypothesis"}
                          </span>
                        </div>
                      )
                    )}

                    {/* MISSING EVIDENCE */}
                    <h3>4. Missing Evidence</h3>

                    {(rcaData.missing_evidence || []).map(
                      (item, index) => (
                        <label
                          className="rca-edit-card"
                          key={`evidence-${index}`}
                          style={{
                            display: "block",
                            padding: "14px",
                            margin: "12px 0",
                            border: "1px solid #e5eaf1",
                            borderRadius: "10px",
                            background: "#fbfcfe",
                          }}
                        >
                          Evidence required {index + 1}

                          <textarea
                            rows={2}
                            value={item}
                            onChange={(event) =>
                              updateListItem(
                                "missing_evidence",
                                index,
                                event.target.value
                              )
                            }
                          />
                        </label>
                      )
                    )}

                    {/* CAPA */}
                    <h3>5. CAPA Recommendations</h3>

                    <p>
                      Review and edit the proposed corrective
                      and preventive actions.
                    </p>

                    {[
                      "corrective_actions",
                      "preventive_actions",
                    ].map((actionType) => (
                      <div key={actionType}>
                        <h4>
                          {actionType === "corrective_actions"
                            ? "Corrective Actions"
                            : "Preventive Actions"}
                        </h4>

                        {(rcaData.capa?.[actionType] || []).map(
                          (item, index) => (
                            <div
                              className="rca-edit-card"
                              key={`${actionType}-${index}`}
                              style={{
                                padding: "14px",
                                margin: "12px 0",
                                border: "1px solid #e5eaf1",
                                borderRadius: "10px",
                                background: "#fbfcfe",
                              }}
                            >
                              <label>
                                Action

                                <textarea
                                  rows={2}
                                  value={item.action || ""}
                                  onChange={(event) =>
                                    updateCapa(
                                      actionType,
                                      index,
                                      "action",
                                      event.target.value
                                    )
                                  }
                                />
                              </label>

                              <div className="extracted-grid">
                                <label>
                                  Priority

                                  <select
                                    value={
                                      item.priority || "Medium"
                                    }
                                    onChange={(event) =>
                                      updateCapa(
                                        actionType,
                                        index,
                                        "priority",
                                        event.target.value
                                      )
                                    }
                                  >
                                    <option>High</option>
                                    <option>Medium</option>
                                    <option>Low</option>
                                  </select>
                                </label>

                                <label>
                                  Responsible role

                                  <input
                                    value={
                                      item.responsible_role || ""
                                    }
                                    onChange={(event) =>
                                      updateCapa(
                                        actionType,
                                        index,
                                        "responsible_role",
                                        event.target.value
                                      )
                                    }
                                  />
                                </label>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ))}

                    <p className="review-note">
                      {rcaData.human_review_note ||
                        "AI-generated findings are suggestions. A qualified investigator must verify evidence, approve the root cause and authorize CAPA actions."}
                    </p>
                  </section>
                )}

                <p className="review-note">
                  AI-generated information must be reviewed and
                  verified by a qualified investigator before
                  it is treated as a finding.
                </p>

                <button
                  className="primary-button"
                  onClick={createFromAI}
                >
                  <Plus size={17} />
                  Review and Create Investigation
                </button>
              
{savedInvestigationId && (
  <section className="workflow-panel">
    <h2>Investigation Review & Approval</h2>

    <p>
      Investigation ID: {savedInvestigationId}
    </p>

    <p>
      Current Status: <strong>{workflowStatus}</strong>
    </p>

    {workflowMessage && (
      <p className="success-message">{workflowMessage}</p>
    )}

    {workflowError && (
      <p className="error-message">{workflowError}</p>
    )}

    <button
      type="button"
      className="primary-button"
      onClick={saveReviewedChanges}
      disabled={workflowBusy || workflowStatus !== "Draft"}
    >
      Save Reviewed Changes
    </button>

    {workflowStatus === "Draft" && (
      <button
        type="button"
        className="primary-button"
        onClick={submitForReview}
        disabled={workflowBusy}
      >
        Submit for Review
      </button>
    )}

    {workflowStatus === "Under Review" && (
      <>
        <label>
          Investigator / Reviewer Name
          <input
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            placeholder="Enter reviewer name"
          />
        </label>

        <label>
          Review Comments
          <textarea
            rows={3}
            value={reviewComments}
            onChange={(e) => setReviewComments(e.target.value)}
            placeholder="Enter review comments"
          />
        </label>

        <button
          type="button"
          className="primary-button"
          onClick={approveInvestigation}
          disabled={workflowBusy}
        >
          Approve Investigation
        </button>
      </>
    )}

    {workflowStatus === "Approved" && (
      <button
        type="button"
        className="primary-button"
        onClick={commitInvestigation}
        disabled={workflowBusy}
      >
        Commit to QMS Ledger
      </button>
    )}

    {workflowStatus === "Committed" && (
      <p className="success-message">
        Investigation successfully committed to QMS Ledger.
      </p>
    )}

    {workflowBusy && (
      <p className="message">Processing...</p>
    )}
  </section>
)}

              </div>
            )}
          </div>
        )}

        {/* CREATE INVESTIGATION MODAL */}
        {showForm && (
          <div className="modal-overlay">

            <div className="investigation-form-card">

              <div className="form-header">
                <div>
                  <h2>Create New Investigation</h2>
                  <p>
                    Enter the pharmaceutical quality incident details.
                  </p>
                </div>

                <button
                  className="close-button"
                  onClick={() => setShowForm(false)}
                  type="button"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>

                <div className="form-grid">

                  <label>
                    Incident ID *

                    <input
                      name="incident_id"
                      value={form.incident_id}
                      onChange={handleChange}
                      placeholder="Example: API-2026-107"
                      required
                    />
                  </label>

                  <label>
                    Product Name

                    <input
                      name="product_name"
                      value={form.product_name}
                      onChange={handleChange}
                      placeholder="Example: Paracetamol API"
                    />
                  </label>

                  <label>
                    Batch Number

                    <input
                      name="batch_number"
                      value={form.batch_number}
                      onChange={handleChange}
                      placeholder="Example: BATCH-107"
                    />
                  </label>

                  <label>
                    Equipment

                    <input
                      name="equipment"
                      value={form.equipment}
                      onChange={handleChange}
                      placeholder="Example: Reactor 3"
                    />
                  </label>

                  <label>
                    Incident Type

                    <select
                      name="incident_type"
                      value={form.incident_type}
                      onChange={handleChange}
                    >
                      <option value="">
                        Select incident type
                      </option>

                      <option value="Temperature Deviation">
                        Temperature Deviation
                      </option>

                      <option value="Pressure Deviation">
                        Pressure Deviation
                      </option>

                      <option value="Out of Specification">
                        Out of Specification
                      </option>

                      <option value="Equipment Failure">
                        Equipment Failure
                      </option>

                      <option value="Contamination">
                        Contamination
                      </option>

                      <option value="Other">Other</option>
                    </select>
                  </label>

                  <label>
                    Expected Value

                    <input
                      name="expected_value"
                      value={form.expected_value}
                      onChange={handleChange}
                      placeholder="Example: 75-80°C"
                    />
                  </label>

                  <label>
                    Actual Value

                    <input
                      name="actual_value"
                      value={form.actual_value}
                      onChange={handleChange}
                      placeholder="Example: 87°C"
                    />
                  </label>

                  <label className="full-width">
                    Incident Description

                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Describe what happened during manufacturing..."
                      rows={4}
                    />
                  </label>

                </div>

                {formError && (
                  <p className="error-message">
                    {formError}
                  </p>
                )}

                <div className="form-actions">

                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={saving}
                  >
                    <Save size={16} />

                    {saving
                      ? "Saving..."
                      : "Save Investigation"}
                  </button>

                </div>
              </form>
            </div>
          </div>
        )}

        <footer className="app-footer">
          AIVOA AI Root Cause Analysis · Pharmaceutical Quality Management
        </footer>

      </main>
    </div>
  );
}

export default App;