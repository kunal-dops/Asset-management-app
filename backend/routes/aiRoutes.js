const express = require("express");
const router = express.Router();

const KNOWLEDGE_BASE = [
  {
    label: "Power / hardware",
    keywords: ["power", "turning on", "battery", "charge", "charger", "screen black", "boot", "fan"],
    severity: "High",
    cause: "Power source, charger, battery, display, or stuck hardware state.",
    solutionSteps: [
      "Move the charger to a tested wall socket and remove loose extension boards.",
      "Try a known working charger with the same rating.",
      "Disconnect external devices, hold the power button for 20 seconds, wait 10 seconds, then power on.",
      "If lights or fans start but the screen stays black, connect an external monitor.",
      "Stop using the asset and create an urgent request if there is heat, swelling, liquid damage, or burning smell.",
    ],
    checks: ["Asset tag", "Charger tested", "Charging light status", "Physical damage", "User backup device"],
    requestType: "Hardware Issue",
  },
  {
    label: "Network",
    keywords: ["internet", "wifi", "wi-fi", "network", "lan", "ethernet", "vpn", "slow", "dns"],
    severity: "Medium",
    cause: "Wi-Fi/VPN session, LAN cable, router/site outage, DNS, or blocked network access.",
    solutionSteps: [
      "Turn Wi-Fi off and on, then reconnect to the correct network.",
      "If using LAN, reseat the cable and try another port or cable.",
      "Restart VPN and sign in again if only company apps are failing.",
      "Restart the device if DNS or gateway errors continue.",
      "If multiple users in the same area are down, escalate as a network incident.",
    ],
    checks: ["Network name", "One user or many", "VPN status", "IP address", "Exact error"],
    requestType: "Network Issue",
  },
  {
    label: "Printer / peripheral",
    keywords: ["printer", "print", "scanner", "scan", "toner", "paper", "queue"],
    severity: "Medium",
    cause: "Offline printer, wrong printer selection, stuck queue, paper/toner fault, or printer network issue.",
    solutionSteps: [
      "Cancel stuck jobs from the print queue and send a fresh test page.",
      "Set the correct nearby printer as default.",
      "Power-cycle the printer for 30 seconds if it shows offline.",
      "Replace paper or toner if the device shows a supply warning.",
      "If several users cannot print to the same printer, assign it to a technician for device/network checks.",
    ],
    checks: ["Printer asset tag", "Room/location", "Error code", "Queue status", "Users affected"],
    requestType: "Hardware Issue",
  },
  {
    label: "Login / access",
    keywords: ["login", "password", "access", "locked", "permission", "role", "unauthorized", "token"],
    severity: "High",
    cause: "Expired session, wrong credentials, locked account, missing role permission, or invalid token.",
    solutionSteps: [
      "Ask the user to sign out completely and sign in again.",
      "Clear browser site data for this app if the session keeps failing.",
      "Verify the user exists and has the correct role in the Users page.",
      "Use the approved admin process to reset password or unlock the account.",
      "If all users are affected, check backend/API health before changing individual accounts.",
    ],
    checks: ["User email", "Role", "Exact login error", "One user or all users", "Recent role change"],
    requestType: "Other",
  },
  {
    label: "Asset assignment",
    keywords: ["assignment", "allocated", "missing asset", "not assigned", "wrong user", "allocation"],
    severity: "Medium",
    cause: "Stale allocation record, wrong user, missing return entry, or asset status mismatch.",
    solutionSteps: [
      "Search the asset tag in Asset Inventory.",
      "Open Allocation Records and compare the assigned user with the physical device owner.",
      "Close or correct stale assignments before creating a new one.",
      "Create the correct assignment with user, date, department, and location.",
      "Create a Service Desk request first if ownership is unclear.",
    ],
    checks: ["Asset tag", "Current holder", "Expected holder", "Department", "Assignment date"],
    requestType: "Other",
  },
  {
    label: "Software",
    keywords: ["software", "app", "application", "crash", "freeze", "error", "install", "update"],
    severity: "Medium",
    cause: "Application crash, corrupted session/cache, missing update, license issue, or incompatible configuration.",
    solutionSteps: [
      "Close the app fully from Task Manager and open it again.",
      "Restart the device if the app keeps freezing.",
      "Check for updates, license prompts, or failed sign-in.",
      "Clear app/browser cache if it is a web app.",
      "Escalate with screenshot and reproduction steps if it repeats.",
    ],
    checks: ["App name", "Version", "Error text", "When it started", "Recent update"],
    requestType: "Software Issue",
  },
];

const detectIssue = (text) => {
  const lower = String(text || "").toLowerCase();
  const ranked = KNOWLEDGE_BASE.map((item) => ({
    ...item,
    score: item.keywords.reduce((total, keyword) => total + (lower.includes(keyword) ? 2 : 0), 0),
  })).sort((a, b) => b.score - a.score);

  const fallback = {
    label: "General troubleshooting",
    severity: "Normal",
    cause: "The description is not specific enough yet.",
    solutionSteps: [
      "Restart the affected app or device once.",
      "Confirm whether the issue affects one user, one asset, one location, or everyone.",
      "Try a known-good alternative: browser, cable, charger, network, or account.",
      "Capture the exact error, asset tag, user, location, and time it started.",
      "Create a Service Desk request if the issue repeats after these checks.",
    ],
    checks: ["Asset tag", "User affected", "Error message", "Start time", "Recent change"],
    requestType: "Other",
  };

  const issue = ranked[0]?.score > 0 ? ranked[0] : fallback;
  return {
    ...issue,
    confidence: ranked[0]?.score > 0 ? Math.min(94, 55 + ranked[0].score * 8) : 42,
    matchedSignals: ranked[0]?.score > 0
      ? issue.keywords.filter((keyword) => lower.includes(keyword)).slice(0, 5)
      : [],
  };
};

const includesAny = (text, words) => words.some((word) => text.includes(word));

const inferScope = (lower) => {
  if (includesAny(lower, ["everyone", "all users", "whole office", "entire", "site down", "department"])) {
    return "Multiple users or a site may be affected";
  }
  if (includesAny(lower, ["one user", "single user", "only me", "my laptop", "one device"])) {
    return "Likely isolated to one user or one asset";
  }
  return "Scope is unknown; confirm whether one user, one asset, or many users are affected";
};

const inferImpact = (lower, severity) => {
  if (severity === "Urgent" || includesAny(lower, ["cannot work", "blocked", "production", "down", "critical"])) {
    return "Work is blocked or business impact may be high";
  }
  if (includesAny(lower, ["slow", "intermittent", "sometimes", "delay"])) {
    return "User can likely work, but productivity is degraded";
  }
  return "Impact not fully known; confirm whether the user has a workaround";
};

const estimateTime = (category, severity) => {
  if (severity === "Urgent") return "15-30 minutes for first response";
  if (category.includes("Network")) return "10-20 minutes for basic checks";
  if (category.includes("Power")) return "10-25 minutes for adapter/display isolation";
  if (category.includes("Software")) return "15-30 minutes for restart, cache, update, and reproduction checks";
  return "10-20 minutes for first-line troubleshooting";
};

const buildResolutionNote = ({ issue, severity, message }) => {
  return [
    `AI diagnosis: ${issue.label}.`,
    `Severity: ${severity}.`,
    `Likely cause: ${issue.cause}`,
    `Recommended fix: ${issue.solutionSteps[0] || "Run standard troubleshooting and confirm with user."}`,
    `Original issue: ${String(message).slice(0, 220)}`,
  ].join(" ");
};

const buildEscalationPath = ({ issue, lower, canResolve }) => {
  if (includesAny(lower, ["everyone", "all users", "site down", "network down"])) {
    return "Escalate to network/admin team as a possible site incident.";
  }
  if (issue.label.includes("Login")) {
    return "Escalate to admin for role, account lockout, or password reset actions.";
  }
  if (issue.label.includes("Power")) {
    return "Escalate to hardware technician or vendor support if known charger/display checks fail.";
  }
  if (!canResolve) {
    return "Create a Service Desk request if the user cannot complete the fix steps.";
  }
  return "Keep ownership as technician; escalate only if first-line fix steps fail.";
};

const buildQuickReplies = (issue) => [
  `Create request for ${issue.label}`,
  "What should I check first?",
  "Write resolution note",
  "When should I escalate?",
];

const makeTechnicianPlan = ({ issue, severity, lower, canResolve, message }) => {
  const scope = inferScope(lower);
  const impact = inferImpact(lower, severity);
  const escalationPath = buildEscalationPath({ issue, lower, canResolve });
  const resolutionNote = buildResolutionNote({ issue, severity, message });

  return {
    scope,
    impact,
    estimatedTime: estimateTime(issue.label, severity),
    escalationPath,
    resolutionNote,
    quickReplies: buildQuickReplies(issue),
    confidence: issue.confidence,
    matchedSignals: issue.matchedSignals,
  };
};

const buildLocalAnswer = ({ message, context = {} }) => {
  const issue = detectIssue(message);
  const lower = String(message || "").toLowerCase();
  const urgent = ["urgent", "critical", "down", "everyone", "all users", "cannot work", "production"].some((word) => lower.includes(word));
  const severity = urgent ? "Urgent" : issue.severity;
  const canResolve = ["admin", "technician"].includes(context.userRole);
  const technicianPlan = makeTechnicianPlan({ issue, severity, lower, canResolve, message });

  return {
    source: "local-technician",
    category: issue.label,
    severity,
    confidence: technicianPlan.confidence,
    text: `I analyzed this as a ${issue.label.toLowerCase()} case with ${technicianPlan.confidence}% confidence. ${technicianPlan.impact}.`,
    cause: issue.cause,
    solutionSteps: [
      `Start here: ${issue.solutionSteps[0]}`,
      ...issue.solutionSteps.slice(1),
      "After each step, ask the user to confirm whether the symptom changed.",
      "If the issue is fixed, record the resolution note before closing the request.",
    ],
    checks: [
      `Scope: ${technicianPlan.scope}.`,
      `Impact: ${technicianPlan.impact}.`,
      ...issue.checks.map((check) => `Collect: ${check}.`),
    ],
    followUpQuestion: issue.label === "General troubleshooting"
      ? "Which asset, user, exact error, and start time should I use to narrow this down?"
      : "Did the first fix step change the symptom, or is the issue still exactly the same?",
    nextAction: canResolve
      ? "Try the first two fix steps, confirm with the user, then either resolve with the AI resolution note or escalate using the escalation path."
      : "Try the fix steps. If it is still failing, create a Service Desk request from this page.",
    safetyNotes: [
      "Do not ask users for passwords.",
      "Stop using hardware with battery swelling, burning smell, liquid damage, or electrical heat.",
      "Record changes in Service Desk for audit history.",
    ],
    ...technicianPlan,
    requestDraft: {
      request_type: issue.requestType,
      priority: severity === "Urgent" || severity === "High" ? "urgent" : "normal",
      issue_description: message,
    },
  };
};

const tryOpenAI = async ({ message, history, context }) => {
  if (!process.env.OPENAI_API_KEY || typeof fetch !== "function") return null;

  const systemPrompt = `You are an expert IT asset-management technician inside an AssetSphere Pro app.
Return ONLY valid JSON with these keys:
category, severity, confidence, text, cause, solutionSteps, checks, followUpQuestion, nextAction, safetyNotes, scope, impact, estimatedTime, escalationPath, resolutionNote, quickReplies, matchedSignals, requestDraft.
Rules:
- solutionSteps: direct fix steps.
- checks: evidence to collect.
- requestDraft: { request_type, priority, issue_description }.
- Never request passwords.
- confidence: number 0-100.
Context:
User role: ${context.userRole || "user"}
Assets loaded: ${context.assetCount || 0}
Open requests: ${context.openRequestCount || 0}`;

  const userPrompt = `Recent chat history: ${JSON.stringify(history || []).slice(0, 2000)}\n\nCurrent Problem: ${message}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("OpenAI API Error:", response.status, errText);
    return null;
  }

  const data = await response.json();
  const output = data.choices?.[0]?.message?.content;
  if (!output) return null;

  try {
    const parsed = JSON.parse(output);
    return { source: "openai", ...parsed };
  } catch (err) {
    console.error("AI JSON Parse Error:", err);
    return null;
  }
};

router.post("/troubleshoot", async (req, res) => {
  const { message, history = [], context = {} } = req.body;
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "message is required" });
  }

  const safeContext = {
    userRole: req.user?.role || context.userRole || "user",
    assetCount: Number(context.assetCount || 0),
    openRequestCount: Number(context.openRequestCount || 0),
  };

  try {
    const aiAnswer = await tryOpenAI({ message, history, context: safeContext }).catch((err) => {
      console.error("AI provider failed:", err.message);
      return null;
    });
    res.json(aiAnswer || buildLocalAnswer({ message, context: safeContext }));
  } catch (err) {
    console.error("AI TROUBLESHOOT ERROR:", err);
    res.json(buildLocalAnswer({ message, context: safeContext }));
  }
});

// Export logic for unit tests
router._internals = {
  detectIssue,
  inferScope,
  inferImpact,
  estimateTime,
  buildResolutionNote,
  buildEscalationPath,
  makeTechnicianPlan,
  buildLocalAnswer,
};

module.exports = router;
