import React, { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import API, { getApiErrorMessage } from "../api";
import {
  FaBolt,
  FaCheckCircle,
  FaClipboardList,
  FaCopy,
  FaExclamationTriangle,
  FaLightbulb,
  FaPaperPlane,
  FaRobot,
  FaSearch,
  FaSync,
} from "react-icons/fa";

const QUICK_PROMPTS = [
  "Fix laptop power issue",
  "Fix internet issue",
  "Fix printer issue",
  "Fix login issue",
];

const KNOWLEDGE_BASE = [
  {
    id: "power",
    label: "Power / hardware",
    keywords: ["power", "turning on", "battery", "charge", "charger", "screen black", "boot", "fan"],
    severity: "High",
    summary: "This looks like a hardware or power-path issue.",
    cause: "Power source, adapter, battery, stuck hardware state, or display failure.",
    checks: [
      "Confirm the adapter, outlet, and charging indicator with a known working charger.",
      "Disconnect external devices, hold the power button for 20 seconds, then retry.",
      "Check for physical damage, unusual heat, liquid exposure, or battery swelling.",
      "If the asset has warranty coverage, record the serial number before opening a service request.",
    ],
    solutionSteps: [
      "Move the charger to a tested wall socket and remove extension boards or loose adapters.",
      "Try a known working charger with the same rating.",
      "Hold the power button for 20 seconds, wait 10 seconds, then power on again.",
      "If the screen stays black but lights or fans turn on, connect an external monitor.",
      "If there is swelling, burning smell, liquid damage, or no charging light with a known charger, stop using the device and raise urgent service.",
    ],
    nextAction: "Create a Service Desk request and mark it urgent if the user has no backup device.",
  },
  {
    id: "network",
    label: "Network",
    keywords: ["internet", "wifi", "wi-fi", "network", "lan", "ethernet", "vpn", "slow", "dns"],
    severity: "Medium",
    summary: "This sounds like a connectivity problem.",
    cause: "Wi-Fi/VPN session issue, bad LAN cable, router/site outage, DNS failure, or blocked network access.",
    checks: [
      "Test another website or internal app to separate internet failure from one-service failure.",
      "Toggle Wi-Fi, reseat the LAN cable, and restart VPN if one is active.",
      "Compare with another device on the same network and location.",
      "Capture the network name, IP address, and exact error message for escalation.",
    ],
    solutionSteps: [
      "Turn Wi-Fi off and on, then reconnect to the correct network.",
      "If using LAN, unplug and reconnect the cable; try another port or cable if available.",
      "Restart VPN and sign in again if only company apps are failing.",
      "Restart the device if DNS or gateway errors continue.",
      "If multiple users in the same area are down, raise it as a network incident instead of fixing one device.",
    ],
    nextAction: "If multiple users are affected, escalate as a site/network incident.",
  },
  {
    id: "printer",
    label: "Printer / peripheral",
    keywords: ["printer", "print", "scanner", "scan", "toner", "paper", "queue"],
    severity: "Medium",
    summary: "This appears to involve a printer or connected peripheral.",
    cause: "Printer offline state, wrong printer selection, stuck queue, paper/toner fault, or network printer issue.",
    checks: [
      "Check printer power, paper, toner, error lights, and network status.",
      "Clear stuck jobs from the print queue and send a test page.",
      "Confirm the user selected the correct printer and location.",
      "Record printer asset tag, room, and displayed error code.",
    ],
    solutionSteps: [
      "Cancel stuck jobs from the print queue and send a fresh test page.",
      "Set the correct printer as default for the user.",
      "Power-cycle the printer for 30 seconds if the queue shows offline.",
      "Replace paper or toner if the printer shows a supply warning.",
      "If several users cannot print to the same printer, restart the printer and assign to technician for network/printer check.",
    ],
    nextAction: "Assign the request to a technician if the device has a hardware fault or repeated queue failures.",
  },
  {
    id: "access",
    label: "Login / access",
    keywords: ["login", "password", "access", "locked", "permission", "role", "unauthorized", "token"],
    severity: "High",
    summary: "This is likely an account, role, or session problem.",
    cause: "Expired session, incorrect password, locked account, missing role permission, or invalid token.",
    checks: [
      "Confirm the user email and role in the Users page.",
      "Ask the user to sign out, clear the browser session, and sign in again.",
      "Check whether the issue happens for one user, one role, or everyone.",
      "Do not share or request passwords; use the approved reset process.",
    ],
    solutionSteps: [
      "Ask the user to sign out completely and sign in again.",
      "If login still fails, clear browser site data for this app and retry.",
      "Verify the user exists and has the correct role in the Users page.",
      "Reset the password or unlock the account using the approved admin process.",
      "If all users are affected, check backend/API availability before changing individual accounts.",
    ],
    nextAction: "Escalate to an admin if role permissions or account lockout are involved.",
  },
  {
    id: "assignment",
    label: "Asset assignment",
    keywords: ["assignment", "allocated", "missing asset", "not assigned", "wrong user", "allocation"],
    severity: "Medium",
    summary: "This looks related to asset allocation records.",
    cause: "Stale allocation record, wrong user selected, missing return entry, or asset status not updated.",
    checks: [
      "Search the asset tag in Asset Inventory and confirm its current status.",
      "Check Allocation Records for duplicate or stale assignments.",
      "Verify the user's department, location, and assigned date.",
      "Update the assignment only after confirming the physical device owner.",
    ],
    solutionSteps: [
      "Search the asset tag in Asset Inventory.",
      "Open Allocation Records and compare the assigned user with the physical device owner.",
      "If the asset is assigned to the wrong user, close or correct the stale assignment first.",
      "Create the correct assignment with user, date, department, and location.",
      "If ownership is unclear, create a Service Desk request before editing records.",
    ],
    nextAction: "Correct the assignment record and add a note to the service request for audit history.",
  },
  {
    id: "software",
    label: "Software",
    keywords: ["software", "app", "application", "crash", "freeze", "error", "install", "update"],
    severity: "Medium",
    summary: "This seems like an application or software configuration issue.",
    cause: "App crash, corrupted session/cache, missing update, license issue, or incompatible configuration.",
    checks: [
      "Capture the exact error message, app name, version, and when it started.",
      "Restart the app and device, then test with a second user profile if available.",
      "Check whether the app needs an update, license, or network access.",
      "Review recent changes, installs, or OS updates before escalating.",
    ],
    solutionSteps: [
      "Close the app fully from Task Manager and open it again.",
      "Restart the device if the app continues freezing.",
      "Check for app updates or missing license/sign-in prompts.",
      "Clear the app/browser cache if it is a web app.",
      "Reinstall or escalate only after capturing the error message and reproduction steps.",
    ],
    nextAction: "Attach screenshots and reproduction steps to the service request.",
  },
];

const DEFAULT_RESPONSE = {
  label: "General troubleshooting",
  severity: "Normal",
  summary: "I need a little more signal, so here is a safe first-pass diagnosis path.",
  cause: "The issue description does not match a specific known category yet.",
  checks: [
    "Identify who is affected: one user, one asset, one location, or everyone.",
    "Capture the asset tag, user name, location, exact error, and time the issue started.",
    "Try the smallest reversible fix first: restart the app, refresh the browser, or reconnect the device.",
    "Check whether there was a recent change such as assignment, update, password reset, relocation, or maintenance.",
  ],
  solutionSteps: [
    "Restart the affected app or device once.",
    "Confirm the issue still happens after signing out and back in.",
    "Try another browser, cable, charger, or network if relevant.",
    "Compare with another user or device to isolate whether it is account, asset, or site related.",
    "Create a Service Desk request if the issue repeats after these first checks.",
  ],
  nextAction: "Create or update a Service Desk request with the evidence collected.",
};

const detectIssue = (text) => {
  const lower = text.toLowerCase();
  const ranked = KNOWLEDGE_BASE.map((item) => ({
    ...item,
    score: item.keywords.reduce((total, keyword) => total + (lower.includes(keyword) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score);

  return ranked[0]?.score > 0 ? ranked[0] : DEFAULT_RESPONSE;
};

const buildResponse = (input) => {
  const issue = detectIssue(input);
  const urgentWords = ["urgent", "down", "critical", "everyone", "all users", "production", "cannot work"];
  const urgent = urgentWords.some((word) => input.toLowerCase().includes(word));
  const severity = urgent ? "Urgent" : issue.severity;

  return {
    type: "agent",
    text: issue.summary,
    category: issue.label,
    severity,
    cause: issue.cause,
    checks: issue.checks,
    solutionSteps: issue.solutionSteps,
    nextAction: urgent
      ? `${issue.nextAction} Treat this as urgent because the description suggests business impact.`
      : issue.nextAction,
  };
};

const initialMessages = [
  {
    type: "agent",
    text: "Hi, I am your troubleshooting assistant. Describe the problem, affected asset, user, and any error message. I will suggest checks, likely cause, severity, and the next action.",
    category: "Ready",
    severity: "Normal",
    cause: "Waiting for the user's issue details.",
    checks: [
      "Tell me what is not working.",
      "Mention the asset tag or device type if you know it.",
      "Include when it started and who is affected.",
    ],
    solutionSteps: [
      "Send a problem description.",
      "Choose a quick prompt if the issue is common.",
      "Review the fix steps and create a request if the fix does not solve it.",
    ],
    nextAction: "Pick a quick prompt or type the issue below.",
  },
];

const severityStyles = {
  Urgent: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  High: { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  Medium: { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  Normal: { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
};

export default function AIAgent() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [requestPromptShown, setRequestPromptShown] = useState(false);
  const [actionState, setActionState] = useState({ type: "idle", text: "" });
  const [requestForm, setRequestForm] = useState({
    asset_id: "",
    reported_by: "",
    issue_description: "",
    request_type: "Other",
    priority: "normal",
    location: "",
    department: "",
  });

  const storedUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; }
  }, []);
  const canManageRequests = ["admin", "technician"].includes(storedUser.role);

  const lastDiagnosis = useMemo(() => {
    return [...messages].reverse().find((message) => message.type === "agent");
  }, [messages]);

  const activeRequests = useMemo(() => {
    return requests.filter((request) => request.status !== "resolved").slice(0, 6);
  }, [requests]);

  const fetchWorkflowData = useCallback(async () => {
    setLoadingData(true);
    try {
      const calls = canManageRequests
        ? [API.get("/assets"), API.get("/users"), API.get("/maintenance")]
        : [API.get("/assets"), Promise.resolve({ data: [] }), API.get("/maintenance")];
      const [assetRes, userRes, requestRes] = await Promise.all(calls);
      setAssets(assetRes.data || []);
      setUsers(userRes.data || []);
      setRequests(requestRes.data || []);
    } catch (err) {
      setActionState({ type: "error", text: getApiErrorMessage(err, "Unable to load workflow data.") });
    } finally {
      setLoadingData(false);
    }
  }, [canManageRequests]);

  useEffect(() => {
    fetchWorkflowData();
  }, [fetchWorkflowData]);

  useEffect(() => {
    if (loadingData || requestPromptShown) return;

    if (activeRequests.length > 0) {
      const requestList = activeRequests
        .map((request) => `SR-${String(87000 + request.request_id).padStart(5, "0")} - ${request.asset_name || "Asset"}: ${request.issue_description}`)
        .join("\n");

      setMessages((current) => [
        ...current,
        {
          type: "agent",
          category: "Service Request Check",
          severity: activeRequests.some((request) => request.priority === "urgent") ? "Urgent" : "Medium",
          text: `I found ${activeRequests.length} open service request${activeRequests.length > 1 ? "s" : ""}. I can review each one and provide technician-style solution steps.`,
          cause: "Open Service Desk items need diagnosis, fix steps, and either resolution notes or escalation.",
          solutionSteps: [
            "Review the open requests in the Solve Requests panel.",
            "Click Get solution on a request to make me analyze that exact asset and issue.",
            "Try the recommended fix steps and collect the evidence I ask for.",
            "If the fix works, admins and technicians can mark the request resolved from this page.",
          ],
          checks: requestList.split("\n"),
          followUpQuestion: "Which service request should I solve first?",
          nextAction: "Use Get solution beside a request, then resolve it only after confirming the fix worked.",
          safetyNotes: ["Do not mark a request resolved until the user or technician confirms the issue is fixed."],
        },
      ]);
    } else {
      setMessages((current) => [
        ...current,
        {
          type: "agent",
          category: "Service Request Check",
          severity: "Normal",
          text: "I checked Service Desk and there are no open requests for your current view.",
          cause: "No pending or in-progress request needs action right now.",
          solutionSteps: [
            "Create a new request if a user reports an issue.",
            "Describe the symptom in chat if you want immediate troubleshooting steps.",
          ],
          checks: ["Service request queue checked.", "No unresolved request returned by the API."],
          followUpQuestion: "Do you want help with a new issue?",
          nextAction: "Type the problem or use the Create Request panel.",
          safetyNotes: [],
        },
      ]);
    }

    setRequestPromptShown(true);
  }, [activeRequests, loadingData, requestPromptShown, requests.length]);

  // Helper to find asset ID by name or tag from the text
  const findAssetInText = (text) => {
    const lowerText = text.toLowerCase();
    // Try to find an asset where the name or tag is mentioned in the chat
    const found = assets.find(a => 
      (a.asset_tag && lowerText.includes(a.asset_tag.toLowerCase())) || 
      (a.asset_name && lowerText.includes(a.asset_name.toLowerCase()))
    );
    return found ? found.asset_id : null;
  };

  const normalizeAgentMessage = (answer, originalText) => ({
    type: "agent",
    text: answer?.text || "I reviewed the issue and prepared technician steps.",
    category: answer?.category || "General troubleshooting",
    severity: answer?.severity || "Normal",
    cause: answer?.cause || "The issue needs more details.",
    checks: Array.isArray(answer?.checks) && answer.checks.length ? answer.checks : DEFAULT_RESPONSE.checks,
    solutionSteps: Array.isArray(answer?.solutionSteps) && answer.solutionSteps.length ? answer.solutionSteps : DEFAULT_RESPONSE.solutionSteps,
    followUpQuestion: answer?.followUpQuestion || "What happened after trying the first step?",
    nextAction: answer?.nextAction || "Create or update a Service Desk request if the issue continues.",
    safetyNotes: Array.isArray(answer?.safetyNotes) ? answer.safetyNotes : [],
    confidence: Number.isFinite(Number(answer?.confidence)) ? Number(answer.confidence) : null,
    scope: answer?.scope || "",
    impact: answer?.impact || "",
    estimatedTime: answer?.estimatedTime || "",
    escalationPath: answer?.escalationPath || "",
    resolutionNote: answer?.resolutionNote || "",
    quickReplies: Array.isArray(answer?.quickReplies) ? answer.quickReplies : [],
    matchedSignals: Array.isArray(answer?.matchedSignals) ? answer.matchedSignals : [],
    requestDraft: answer?.requestDraft || {
      issue_description: originalText,
      request_type: "Other",
      priority: "normal",
    },
    source: answer?.source || "local",
  });

  const performRequestCreation = async (data) => {
    setActionState({ type: "loading", text: "Agent is creating service request..." });
    try {
      const payload = {
        ...data,
        reported_by: canManageRequests ? data.reported_by || storedUser.user_id : storedUser.user_id,
        request_date: new Date().toISOString().split("T")[0],
      };

      await API.post("/maintenance", payload);
      
      setActionState({ type: "success", text: "Service request created automatically." });
      
      // Add a confirmation message to chat
      setMessages(prev => [...prev, {
        type: "agent",
        category: "System Action",
        severity: "Normal",
        text: `✅ I have successfully created a new Service Request for this issue. You can track it in the Maintenance panel.`,
        nextAction: "The request is now live. A technician will be notified."
      }]);

      await fetchWorkflowData();
      return true;
    } catch (err) {
      const msg = getApiErrorMessage(err, "Failed to create service request.");
      setActionState({ type: "error", text: msg });
      return false;
    }
  };

  const sendMessage = async (text = input) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    const userMessage = { type: "user", text: cleanText };
    setMessages((current) => [...current, userMessage]);
    setRequestForm((current) => ({
      ...current,
      issue_description: cleanText,
    }));
    setInput("");
    setThinking(true);

    try {
      const history = messages.slice(-8).map((message) => ({
        role: message.type === "user" ? "user" : "assistant",
        content: message.text,
      }));
      const res = await API.post("/ai/troubleshoot", {
        message: cleanText,
        history,
        context: {
          userRole: storedUser.role,
          assetCount: assets.length,
          openRequestCount: activeRequests.length,
        },
      });
      const agentMessage = normalizeAgentMessage(res.data, cleanText);
      setMessages((current) => [...current, agentMessage]);
      setRequestForm((current) => ({
        ...current,
        issue_description: agentMessage.requestDraft.issue_description || cleanText,
        request_type: agentMessage.requestDraft.request_type || current.request_type,
        priority: agentMessage.requestDraft.priority || current.priority,
      }));

      // --- AUTO-AGENT LOGIC ---
      // Check if user explicitly asked to create/open a request
      const createIntent = ["create", "open", "submit", "make"].some(v => cleanText.toLowerCase().includes(v)) &&
                           ["request", "ticket", "sr", "report"].some(v => cleanText.toLowerCase().includes(v));

      if (createIntent) {
        const targetAssetId = requestForm.asset_id || findAssetInText(cleanText) || findAssetInText(agentMessage.text);
        
        if (!targetAssetId) {
          setMessages(prev => [...prev, {
            type: "agent",
            text: "I'm ready to create that request for you, but I'm not sure which asset it's for. Please select an asset from the list on the right.",
            category: "Action Required",
            severity: "Medium"
          }]);
        } else {
          await performRequestCreation({ ...requestForm, asset_id: targetAssetId });
        }
      }
    } catch (err) {
      const fallback = normalizeAgentMessage(buildResponse(cleanText), cleanText);
      setMessages((current) => [...current, fallback]);
      setRequestForm((current) => ({
        ...current,
        issue_description: cleanText,
        request_type: fallback.requestDraft.request_type || current.request_type,
        priority: fallback.requestDraft.priority || current.priority,
      }));
      setActionState({ type: "error", text: getApiErrorMessage(err, "AI endpoint unavailable. Used local technician mode.") });
    } finally {
      setThinking(false);
    }
  };

  const askForRequestSolution = (request) => {
    const prompt = [
      `Solve this service request like an IT technician.`,
      `Service request: SR-${String(87000 + request.request_id).padStart(5, "0")}`,
      `Status: ${request.status || "pending"}`,
      `Priority: ${request.priority || "normal"}`,
      `Asset: ${request.asset_name || "Unknown asset"} ${request.asset_tag ? `(${request.asset_tag})` : ""}`,
      `Reported by: ${request.reported_by_name || "Unknown user"}`,
      `Type: ${request.request_type || "Other"}`,
      `Issue: ${request.issue_description}`,
      `Location: ${request.location || "Not provided"}`,
      `Department: ${request.department || "Not provided"}`,
      `Give exact fix steps, evidence to collect, and tell me when it is safe to resolve.`,
    ].join("\n");

    setRequestForm((current) => ({
      ...current,
      asset_id: request.asset_id || current.asset_id,
      reported_by: request.reported_by || current.reported_by,
      issue_description: request.issue_description || current.issue_description,
      request_type: request.request_type || current.request_type,
      priority: request.priority || current.priority,
      location: request.location || current.location,
      department: request.department || current.department,
    }));
    sendMessage(prompt);
  };

  const copyResolutionNote = async (note) => {
    if (!note) return;
    try {
      await navigator.clipboard.writeText(note);
      setActionState({ type: "success", text: "Resolution note copied." });
    } catch {
      setActionState({ type: "error", text: "Could not copy note. Select and copy it manually." });
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  const createRequest = async (event) => {
    event.preventDefault();
    if (!requestForm.asset_id || !requestForm.issue_description?.trim()) {
      setActionState({ type: "error", text: "Select an asset and describe the problem before creating a request." });
      return;
    }
    
    await performRequestCreation(requestForm);
    setRequestForm({
      asset_id: "",
      reported_by: "",
      issue_description: "",
      request_type: "Other",
      priority: "normal",
      location: "",
      department: "",
    });
  };

  const resolveRequest = async (request) => {
    const resolution = lastDiagnosis?.nextAction || "Resolved with AI troubleshooting guidance.";
    setActionState({ type: "loading", text: `Resolving SR-${String(87000 + request.request_id).padStart(5, "0")}...` });
    try {
      await API.put(`/maintenance/${request.request_id}`, {
        status: "resolved",
        resolved_date: new Date().toISOString().split("T")[0],
        checked_by: storedUser.user_id || null,
        resolution_notes: resolution,
        audit_note: "Resolved from AI Troubleshooter",
      });
      setActionState({ type: "success", text: "Request marked resolved and asset returned to available." });
      await fetchWorkflowData();
    } catch (err) {
      setActionState({ type: "error", text: getApiErrorMessage(err, "Failed to resolve request.") });
    }
  };

  const currentSeverity = severityStyles[lastDiagnosis?.severity] || severityStyles.Normal;

  return (
    <div>
      <PageHeader title="AI Troubleshooter" subtitle="Guided problem solving for users, assets, access, and service requests" />

      <div className="agent-shell">
        <section className="agent-chat-panel">
          <div className="agent-toolbar">
            <div className="agent-title-block">
              <div className="agent-avatar">
                <FaRobot />
              </div>
              <div>
                <h2>Troubleshooting Agent</h2>
                <p>Offline assistant for first response and escalation notes</p>
              </div>
            </div>
            <span className="agent-status simple">
              <FaBolt /> Online
            </span>
          </div>

          <div className="quick-prompt-grid">
            {QUICK_PROMPTS.map((prompt) => (
              <button key={prompt} type="button" onClick={() => sendMessage(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <div className="agent-messages">
            {messages.map((message, index) => {
              const style = severityStyles[message.severity] || severityStyles.Normal;
              return (
                <div key={`${message.type}-${index}`} className={`agent-message ${message.type}`}>
                  {message.type === "agent" ? (
                    <>
                      <div className="agent-message-header">
                        <span>{message.category}</span>
                        <strong style={{ background: style.bg, color: style.color, borderColor: style.border }}>
                          {message.severity}
                        </strong>
                      </div>
                      <p>{message.text}</p>
                      {message.cause && (
                        <div className="agent-cause-box">
                          <strong>Problem</strong>
                          <span>{message.cause}</span>
                        </div>
                      )}
                      <div className="agent-solution-box">
                        <strong>Try this</strong>
                        <ol>
                          {(message.solutionSteps || []).map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                      </div>
                      {message.followUpQuestion && (
                        <div className="agent-followup-box">
                          <FaRobot />
                          <span>{message.followUpQuestion}</span>
                        </div>
                      )}
                      {message.resolutionNote && (
                        <div className="agent-resolution-box">
                          <div className="agent-resolution-title">
                            <strong>Note</strong>
                            <button type="button" onClick={() => copyResolutionNote(message.resolutionNote)} title="Copy note">
                              <FaCopy />
                            </button>
                          </div>
                          <p>{message.resolutionNote}</p>
                        </div>
                      )}
                      {message.nextAction && (
                      <div className="agent-next-action compact">
                        <FaClipboardList />
                        <span>{message.nextAction}</span>
                      </div>
                      )}
                      {message.quickReplies?.length > 0 && (
                        <div className="agent-quick-replies">
                          {message.quickReplies.slice(0, 3).map((reply) => (
                            <button key={reply} type="button" onClick={() => sendMessage(reply)}>
                              {reply}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p>{message.text}</p>
                  )}
                </div>
              );
            })}
            {thinking && (
              <div className="agent-message agent">
                <div className="agent-thinking">
                  <span />
                  <span />
                  <span />
                  Technician is thinking...
                </div>
              </div>
            )}
          </div>

          <form className="agent-input-row" onSubmit={handleSubmit}>
            <div>
              <FaSearch />
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Example: User cannot login to assigned laptop and gets unauthorized error"
              />
            </div>
            <button type="submit" disabled={thinking}>
              <FaPaperPlane />
              {thinking ? "Thinking" : "Send"}
            </button>
          </form>
        </section>

        <aside className="agent-insights-panel">
          {canManageRequests && (
            <div className="agent-workflow-card simple-card">
              <div className="agent-side-heading">
                <h3>Open Requests</h3>
                <span>{activeRequests.length}</span>
              </div>
              {activeRequests.length > 0 ? activeRequests.map((request) => (
                <div className="agent-request-row" key={request.request_id}>
                  <div>
                    <strong>SR-{String(87000 + request.request_id).padStart(5, "0")}</strong>
                    <p>{request.asset_name || "Asset"} - {request.issue_description}</p>
                  </div>
                  <div className="agent-request-actions">
                    <button type="button" onClick={() => askForRequestSolution(request)} title="Get solution">
                      <FaRobot />
                    </button>
                    <button type="button" onClick={() => resolveRequest(request)} title="Resolve">
                      <FaCheckCircle />
                    </button>
                  </div>
                </div>
              )) : (
                <p className="agent-empty-copy">No open requests.</p>
              )}
            </div>
          )}

          <form className="agent-workflow-card" onSubmit={createRequest}>
            <div className="agent-side-heading">
              <h3>Create Request</h3>
              <button type="button" onClick={fetchWorkflowData} disabled={loadingData} title="Refresh workflow data">
                <FaSync />
              </button>
            </div>

            {actionState.text && (
              <div className={`agent-action-alert ${actionState.type}`}>
                {actionState.type === "success" ? <FaCheckCircle /> : <FaExclamationTriangle />}
                <span>{actionState.text}</span>
              </div>
            )}

            <label>
              Asset
              <select
                value={requestForm.asset_id}
                onChange={(event) => setRequestForm((current) => ({ ...current, asset_id: event.target.value }))}
                disabled={loadingData}
                required
              >
                <option value="">Select asset</option>
                {assets.map((asset) => (
                  <option key={asset.asset_id} value={asset.asset_id}>
                    {asset.asset_name} ({asset.asset_tag})
                  </option>
                ))}
              </select>
            </label>

            {canManageRequests && (
              <label>
                Reported By
                <select
                  value={requestForm.reported_by}
                  onChange={(event) => setRequestForm((current) => ({ ...current, reported_by: event.target.value }))}
                >
                  <option value="">Current user / requester</option>
                  {users.map((user) => (
                    <option key={user.user_id} value={user.user_id}>{user.full_name}</option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Problem
              <textarea
                value={requestForm.issue_description}
                onChange={(event) => setRequestForm((current) => ({ ...current, issue_description: event.target.value }))}
                placeholder="The agent fills this from your chat, or you can edit it here."
                required
              />
            </label>

            <div className="agent-form-grid">
              <label>
                Type
                <select
                  value={requestForm.request_type}
                  onChange={(event) => setRequestForm((current) => ({ ...current, request_type: event.target.value }))}
                >
                  <option value="Hardware Issue">Hardware Issue</option>
                  <option value="Software Issue">Software Issue</option>
                  <option value="Network Issue">Network Issue</option>
                  <option value="Facility Complaint">Facility Complaint</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label>
                Priority
                <select
                  value={requestForm.priority}
                  onChange={(event) => setRequestForm((current) => ({ ...current, priority: event.target.value }))}
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
            </div>

            <div className="agent-form-grid">
              <label>
                Location
                <input
                  value={requestForm.location}
                  onChange={(event) => setRequestForm((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Office / room"
                />
              </label>
              <label>
                Department
                <input
                  value={requestForm.department}
                  onChange={(event) => setRequestForm((current) => ({ ...current, department: event.target.value }))}
                  placeholder="Department"
                />
              </label>
            </div>

            <button type="submit" disabled={actionState.type === "loading" || loadingData}>
              <FaClipboardList />
              Create Request
            </button>
          </form>

          <div className="agent-insight-card primary">
            <div className="agent-insight-icon">
              <FaLightbulb />
            </div>
            <div>
              <p>Current Diagnosis</p>
              <h3>{lastDiagnosis?.category || "Ready"}</h3>
              <span style={{ background: currentSeverity.bg, color: currentSeverity.color, borderColor: currentSeverity.border }}>
                {lastDiagnosis?.severity || "Normal"}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
