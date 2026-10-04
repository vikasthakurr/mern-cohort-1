/* =========================================================
   ResumeIQ — ATS Resume Analyzer (core logic)
   ========================================================= */

const keywordCategories = {
  technical: {
    label: "Technical Skills",
    keywords: [
      "javascript",
      "python",
      "java",
      "react",
      "angular",
      "vue",
      "node.js",
      "nodejs",
      "express",
      "mongodb",
      "postgresql",
      "mysql",
      "sql",
      "nosql",
      "html",
      "css",
      "typescript",
      "graphql",
      "rest api",
      "rest apis",
      "git",
      "github",
      "docker",
      "kubernetes",
      "aws",
      "azure",
      "gcp",
      "firebase",
      "redis",
      "webpack",
      "next.js",
      "nextjs",
      "tailwind",
      "bootstrap",
      "sass",
      "less",
      "jquery",
      "c++",
      "c#",
      "ruby",
      "php",
      "swift",
      "kotlin",
      "flutter",
      "react native",
      "django",
      "flask",
      "spring boot",
      "laravel",
      "ci/cd",
      "jenkins",
      "terraform",
      "linux",
      "agile",
      "scrum",
      "jira",
      "figma",
      "photoshop",
    ],
  },
  soft: {
    label: "Soft Skills",
    keywords: [
      "leadership",
      "communication",
      "teamwork",
      "problem-solving",
      "problem solving",
      "collaboration",
      "adaptability",
      "time management",
      "critical thinking",
      "creativity",
      "project management",
      "decision making",
      "presentation",
      "negotiation",
      "conflict resolution",
      "attention to detail",
    ],
  },
  action: {
    label: "Action Verbs",
    keywords: [
      "developed",
      "built",
      "designed",
      "implemented",
      "managed",
      "led",
      "created",
      "optimized",
      "improved",
      "increased",
      "reduced",
      "delivered",
      "architected",
      "deployed",
      "automated",
      "analyzed",
      "integrated",
      "launched",
      "maintained",
      "collaborated",
      "mentored",
      "spearheaded",
      "streamlined",
      "engineered",
      "established",
      "coordinated",
      "resolved",
      "contributed",
      "refactored",
    ],
  },
  metrics: {
    label: "Quantifiable Metrics",
    keywords: [
      "percent",
      "increased by",
      "reduced by",
      "improved by",
      "revenue",
      "users",
      "traffic",
      "performance",
      "efficiency",
      "cost",
      "budget",
      "team of",
      "clients",
      "projects",
      "applications",
    ],
  },
};

const resumeSections = [
  {
    name: "Contact Information",
    patterns: ["email", "phone", "@", "linkedin"],
  },
  {
    name: "Skills",
    patterns: ["skills", "technical skills", "technologies", "proficient"],
  },
  {
    name: "Experience",
    patterns: ["experience", "work history", "employment", "worked at"],
  },
  {
    name: "Education",
    patterns: [
      "education",
      "degree",
      "university",
      "college",
      "b.tech",
      "b.sc",
      "m.tech",
      "mba",
    ],
  },
  {
    name: "Projects",
    patterns: ["projects", "project", "built", "developed", "created"],
  },
  {
    name: "Certifications",
    patterns: ["certification", "certified", "certificate", "course"],
  },
];

const scoreMessages = [
  {
    min: 0,
    max: 30,
    message:
      "Needs significant improvement. Your resume doesn't match the job well.",
    color: "#ff6b6b",
  },
  {
    min: 31,
    max: 50,
    message:
      "Below average. Consider adding more relevant keywords and details.",
    color: "#ff9f43",
  },
  {
    min: 51,
    max: 70,
    message: "Decent match. A few improvements could boost your chances.",
    color: "#f0a500",
  },
  {
    min: 71,
    max: 85,
    message: "Good match! Your resume aligns well with the job description.",
    color: "#00d4aa",
  },
  {
    min: 86,
    max: 100,
    message: "Excellent match! Your resume is highly optimized for this role.",
    color: "#00ff88",
  },
];

const STORAGE_KEY = "resumeiq.inputs";

let lastMissing = [];

/* ---------------------------------------------------------
   Text helpers
   --------------------------------------------------------- */

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s/.#+@-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsTerm(normalizedText, term) {
  const t = term.toLowerCase();
  // Use word boundaries only when the term starts & ends with an alphanumeric
  // char; otherwise (e.g. "c++", "node.js", "@") fall back to substring match.
  if (/^[a-z0-9]/.test(t) && /[a-z0-9]$/.test(t)) {
    const pattern = new RegExp(
      "(^|[^a-z0-9])" + escapeRegex(t) + "([^a-z0-9]|$)",
      "i",
    );
    return pattern.test(normalizedText);
  }
  return normalizedText.includes(t);
}

function countWords(text) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/* ---------------------------------------------------------
   Analysis steps
   --------------------------------------------------------- */

function extractJobKeywords(jobText) {
  const normalized = normalizeText(jobText);
  const found = [];

  Object.keys(keywordCategories).forEach(function (category) {
    keywordCategories[category].keywords.forEach(function (keyword) {
      if (containsTerm(normalized, keyword) && found.indexOf(keyword) === -1) {
        found.push(keyword);
      }
    });
  });
  return found;
}

function matchKeywords(resumeText, jobKeywords) {
  const normalizedResume = normalizeText(resumeText);
  const matched = [];
  const missing = [];

  jobKeywords.forEach(function (keyword) {
    if (containsTerm(normalizedResume, keyword)) {
      matched.push(keyword);
    } else {
      missing.push(keyword);
    }
  });
  return { matched: matched, missing: missing };
}

function analyzeSections(resumeText) {
  const normalizedResume = normalizeText(resumeText);
  return resumeSections.map(function (section) {
    const found = section.patterns.some(function (pattern) {
      return containsTerm(normalizedResume, pattern);
    });
    return { name: section.name, found: found };
  });
}

/* ---------------------------------------------------------
   Scoring
   --------------------------------------------------------- */

function calculateATSScore(matchedCount, total, sectionResults, wordCount) {
  // Keyword relevance (up to 60), section completeness (up to 25),
  // resume length signal (up to 15).
  const keywordScore = total > 0 ? (matchedCount / total) * 60 : 0;

  const sectionsFound = sectionResults.filter(function (s) {
    return s.found;
  }).length;
  const sectionScore = (sectionsFound / sectionResults.length) * 25;

  let lengthScore = 0;
  if (wordCount > 200) lengthScore = 15;
  else if (wordCount > 100) lengthScore = 10;
  else if (wordCount > 50) lengthScore = 5;

  return Math.min(100, Math.round(keywordScore + sectionScore + lengthScore));
}

function getScoreMessage(score) {
  return (
    scoreMessages.find(function (msg) {
      return score >= msg.min && score <= msg.max;
    }) || scoreMessages[scoreMessages.length - 1]
  );
}

/* ---------------------------------------------------------
   Suggestions (local, rule-based)
   --------------------------------------------------------- */

function generateSuggestions(missing, sectionResults, score) {
  const suggestions = [];

  sectionResults.forEach(function (section) {
    if (!section.found) {
      suggestions.push('Add a "' + section.name + '" section to your resume.');
    }
  });

  if (missing.length > 3) {
    suggestions.push(
      "Weave in more relevant keywords — " +
        missing.length +
        " job keywords are missing from your resume.",
    );
  }

  const missingMetrics = missing.filter(function (kw) {
    return keywordCategories.metrics.keywords.indexOf(kw) !== -1;
  });
  if (missingMetrics.length > 0) {
    suggestions.push(
      'Use quantifiable metrics in your experience section (e.g. "reduced load time by 40%").',
    );
  }

  if (score < 50) {
    suggestions.push(
      "Consider rewriting the resume to include more role-specific keywords.",
    );
    suggestions.push(
      "Add a professional summary that highlights your top achievements and skills.",
    );
  } else if (score < 75) {
    suggestions.push(
      "Good start — add a few more technical keywords to strengthen the match.",
    );
  }

  if (suggestions.length === 0) {
    suggestions.push("Your resume looks well optimized. Keep it up!");
  }

  return suggestions;
}

/* ---------------------------------------------------------
   Persistence
   --------------------------------------------------------- */

function saveInputs(resumeText, jobText) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ resumeText: resumeText, jobText: jobText }),
    );
  } catch (e) {
    /* ignore storage errors */
  }
}

function loadInputs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/* ---------------------------------------------------------
   Rendering
   --------------------------------------------------------- */

function renderScore(score) {
  const info = getScoreMessage(score);
  const scoreValue = document.getElementById("scoreValue");
  const scoreMessage = document.getElementById("scoreMessage");
  const ring = document.getElementById("scoreRing");

  scoreValue.textContent = score;
  scoreValue.style.color = info.color;
  scoreMessage.textContent = info.message;

  if (ring) {
    ring.style.background =
      "conic-gradient(" + info.color + " " + score + "%, var(--ring-track) 0)";
  }
}

function renderKeywordTags(elementId, keywords, variant) {
  const container = document.getElementById(elementId);
  container.innerHTML = "";
  if (keywords.length === 0) {
    const empty = document.createElement("span");
    empty.className = "tag tag--empty";
    empty.textContent = "None";
    container.appendChild(empty);
    return;
  }
  keywords.forEach(function (kw) {
    const tag = document.createElement("span");
    tag.className = "tag tag--" + variant;
    tag.textContent = kw;
    container.appendChild(tag);
  });
}

function renderSections(sectionResults) {
  const list = document.getElementById("sectionList");
  list.innerHTML = "";
  sectionResults.forEach(function (section) {
    const li = document.createElement("li");
    li.className =
      "section-item " + (section.found ? "is-found" : "is-missing");
    li.innerHTML =
      '<span class="section-icon">' +
      (section.found ? "✓" : "✕") +
      "</span>" +
      '<span class="section-name">' +
      section.name +
      "</span>";
    list.appendChild(li);
  });
}

function renderSuggestions(suggestions) {
  const list = document.getElementById("suggestionList");
  list.innerHTML = "";
  suggestions.forEach(function (item) {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });
}

/* ---------------------------------------------------------
   Main orchestration
   --------------------------------------------------------- */

function analyzeResume() {
  const resumeText = document.getElementById("resumeInput").value;
  const jobText = document.getElementById("jobInput").value;
  const error = document.getElementById("inputError");

  if (!resumeText.trim() || !jobText.trim()) {
    error.textContent =
      "Please paste both your resume and the job description.";
    error.classList.remove("hidden");
    return;
  }
  error.classList.add("hidden");

  saveInputs(resumeText, jobText);

  const jobKeywords = extractJobKeywords(jobText);
  const match = matchKeywords(resumeText, jobKeywords);
  const sectionResults = analyzeSections(resumeText);
  const wordCount = countWords(resumeText);

  const score = calculateATSScore(
    match.matched.length,
    jobKeywords.length,
    sectionResults,
    wordCount,
  );

  const suggestions = generateSuggestions(match.missing, sectionResults, score);

  lastMissing = match.missing;

  renderScore(score);
  renderKeywordTags("matchedKeywords", match.matched, "matched");
  renderKeywordTags("missingKeywords", match.missing, "missing");
  renderSections(sectionResults);
  renderSuggestions(suggestions);

  document.getElementById("results").classList.remove("hidden");

  // Expose for the Gemini module and notify it analysis is ready.
  window.ResumeIQ = {
    score: score,
    matched: match.matched,
    missing: match.missing,
    resumeText: resumeText,
    jobText: jobText,
  };
  document.dispatchEvent(new CustomEvent("resumeiq:analyzed"));

  document.getElementById("results").scrollIntoView({ behavior: "smooth" });
}

function copyMissingKeywords() {
  const status = document.getElementById("copyStatus");

  if (lastMissing.length === 0) {
    status.textContent = "Nothing to copy.";
    return;
  }

  navigator.clipboard.writeText(lastMissing.join(", ")).then(
    function () {
      status.textContent = "Copied " + lastMissing.length + " keyword(s).";
    },
    function () {
      status.textContent = "Copy failed.";
    },
  );
}

/* ---------------------------------------------------------
   Theme toggle (two color themes)
   --------------------------------------------------------- */

const THEME_KEY = "resumeiq.theme";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = theme === "light" ? "🌙" : "☀️";
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    /* ignore */
  }
}

function initTheme() {
  let theme = "dark";
  try {
    theme = localStorage.getItem(THEME_KEY) || "dark";
  } catch (e) {
    /* ignore */
  }
  applyTheme(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(current === "dark" ? "light" : "dark");
}

/* ---------------------------------------------------------
   Init
   --------------------------------------------------------- */

function init() {
  initTheme();

  const saved = loadInputs();
  if (saved) {
    if (saved.resumeText)
      document.getElementById("resumeInput").value = saved.resumeText;
    if (saved.jobText)
      document.getElementById("jobInput").value = saved.jobText;
  }

  document
    .getElementById("analyseBtn")
    .addEventListener("click", analyzeResume);
  document
    .getElementById("copyBtn")
    .addEventListener("click", copyMissingKeywords);
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
}

document.addEventListener("DOMContentLoaded", init);
