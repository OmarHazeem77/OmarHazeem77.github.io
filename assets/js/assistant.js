/* Ask-about-Omar: a friendly assistant that answers questions about Omar.
   Instant mode (default): matches the question to a verified fact sheet below and never guesses.
   AI mode: when window.OH_ASSISTANT_ENDPOINT is set, questions go to assistant-server/ (Claude),
   which is grounded in the same facts; any failure falls back to instant mode.
   Keep the answers here in step with assistant-server/src/knowledge.js. */
(function () {
  "use strict";

  var EMAIL = "omarhazeem2005@gmail.com";
  var LINKEDIN = "https://www.linkedin.com/in/omar-hazeem-71991427b/";
  var PHONE = "+961 71 829 730";
  var CV = "assets/cv/Omar-Hazeem-Agentic-Business-Analyst-CV.pdf";
  var root = document.documentElement;
  var motionOn = function () { return root.getAttribute("data-motion") === "on"; };

  /* ---------- Knowledge: intents, keywords and approved answers ---------- */
  // k: keyword weights (single words, matched exactly or with a small typo); p: phrases (bonus)
  var INTENTS = [
    { id: "about", k: { who: 1, about: 1, introduce: 2, introduction: 2, summary: 2, overview: 2, bio: 2, profile: 1 },
      p: ["who is omar", "who is he", "tell me about", "about omar", "about him"],
      a: "Omar Hazeem is an Agentic Business Analyst at Netways, working remotely from Lebanon with clients in Saudi Arabia. He leads client discovery, turns it into BRDs, workflows and working solutions, and uses AI at every step: Wispr Flow to capture meetings, Claude to structure the documents, and Claude Code with MCP to prototype. Right now he's on a project for a Saudi capital-markets regulator.",
      f: ["ai", "method", "contact"] },
    { id: "role", k: { role: 2, job: 2, title: 2, position: 2, occupation: 2, profession: 2, analyst: 2, ba: 2, responsibilities: 2, duties: 2, daily: 1, day: 1, agentic: 3 },
      p: ["what does he do", "what does omar do", "what do you do", "business analyst", "day to day", "his work", "what is his job", "agentic ba"],
      a: "Omar is an Agentic Business Analyst at Netways. He leads requirements workshops with clients, writes BRDs, traceability matrices and minutes of meeting, designs workflow diagrams, prototypes solutions with Claude Code, and works alongside the developers in Azure DevOps until each feature is tested against its acceptance criteria.",
      f: ["ai", "deliverables", "current"] },
    { id: "netways", k: { netways: 4, company: 2, employer: 2, firm: 2, organisation: 1, organization: 1, employed: 2 },
      p: ["where does he work", "who does he work for", "which company"],
      a: "Netways is a technology consultancy serving governments and organisations across the Middle East, and a Microsoft Business Applications partner. Omar joined as a Business Analyst intern in December 2025 and has been a full-time Business Analyst there since March 2026.",
      f: ["projects", "experience"] },
    { id: "current", k: { capital: 2, markets: 2, market: 2, regulator: 2, regulatory: 2, current: 1, now: 1 },
      p: ["current project", "working on now", "working on right now", "what is he working on"],
      a: "Omar's current project, through Netways, is with a capital-markets regulator in Saudi Arabia. He runs discovery workshops with the regulator's teams, documents how the work runs today (the As-Is), and proposes enhancements and To-Be workflows that reduce the manual effort. Client names aren't shared publicly.",
      f: ["method", "previous", "deliverables"] },
    { id: "previous", k: { petrochemical: 3, petrochemicals: 3, previous: 1, before: 1 },
      p: ["previous project", "last project"],
      a: "Before his current project, Omar worked on a Netways engagement for a petrochemical company's operations in Saudi Arabia, covering client sessions, requirements documentation and workflow design. Client names and finer details aren't public, so for specifics it's best to ask Omar directly at {email}.",
      f: ["current", "projects"] },
    { id: "projects", k: { project: 2, projects: 2, clients: 2, client: 1, engagements: 2, engagement: 2, portfolio: 1, case: 1, studies: 1 },
      p: ["worked on", "who has he worked with", "case studies", "selected work"],
      a: "Two client engagements so far, both through Netways in Saudi Arabia, plus one of his own:\n- A capital-markets regulator (current): As-Is discovery, then enhancements and To-Be workflows.\n- A petrochemical company (previous): client sessions, requirements documentation and workflow design.\n- This portfolio: built end to end with Claude Code, with 3D modelled in Blender through MCP.",
      f: ["current", "ai", "deliverables"] },
    { id: "method", k: { approach: 3, process: 2, method: 3, methodology: 3, steps: 2, how: 1, asis: 2, tobe: 2, automate: 2, automation: 2, manual: 2, discovery: 2, questions: 1, interview: 2 },
      p: ["how does he work", "how does omar work", "as is", "to be", "his process", "manual effort", "requirements gathering"],
      a: "Omar works in four steps:\n- Listen: he leads discovery sessions with the people who do the work, and Wispr Flow captures every session.\n- Map the As-Is: every hand-off, approval and re-check, structured with Claude into minutes and requirements.\n- Design the To-Be: leaner workflows, prototyped with Claude Code so stakeholders can react to something real.\n- Automate: steps that need no judgment get automated, then he writes the stories in Azure DevOps and tests until it ships.",
      f: ["ai", "deliverables", "testing"] },
    { id: "ai", k: { ai: 4, agentic: 4, agent: 3, agents: 3, claude: 4, anthropic: 3, wispr: 4, flow: 1, llm: 3, gpt: 2, chatgpt: 2, genai: 3, generative: 3, mcp: 4, prompt: 2, prompting: 2, automation: 1 },
      p: ["use ai", "uses ai", "with ai", "claude code", "wispr flow", "artificial intelligence", "agentic ba", "ai tools", "model context protocol"],
      a: "Omar works as an agentic BA, and AI runs through every stage:\n- Capture: Wispr Flow records each client session and lets him dictate observations as they happen.\n- Structure: Claude turns that record into first drafts of minutes, BRD sections and traceability rows. He reviews and owns every line.\n- Prototype: Claude Code and MCP build working prototypes so the client can react before development starts.\n- Deliver: user stories, acceptance criteria and test cases in Azure DevOps.\nThe AI handles the structuring; listening, judgment and the client relationship stay with him.",
      f: ["method", "certs", "site"] },
    { id: "deliverables", k: { deliverables: 4, deliverable: 4, deliver: 3, documents: 2, documentation: 2, artifacts: 3, artefacts: 3, outputs: 2, produce: 2, produces: 2 },
      p: ["what does he deliver", "what does he produce", "what documents"],
      a: "On a typical engagement Omar produces:\n- A Business Requirements Document (BRD)\n- A Requirements Traceability Matrix (RTM)\n- Minutes of meeting after each client session\n- As-Is and To-Be workflow diagrams\n- Test cases in Azure DevOps\nAsk me about any of them for more detail.",
      f: ["brd", "rtm", "testing"] },
    { id: "brd", k: { brd: 4, brds: 4 }, p: ["business requirements", "requirements document"],
      a: "A BRD is the Business Requirements Document: the agreed scope, business rules and requirements. Omar writes it so the client can sign it off and the development team can build from it.",
      f: ["rtm", "mom"] },
    { id: "rtm", k: { rtm: 4, traceability: 4, matrix: 2, trace: 2 }, p: ["traceability matrix"],
      a: "The Requirements Traceability Matrix links every requirement to its design and its test, so nothing gets lost between the workshop and the release. Omar keeps it alongside the BRD.",
      f: ["brd", "testing"] },
    { id: "mom", k: { minutes: 4, mom: 3 }, p: ["minutes of meeting", "meeting notes", "meeting minutes"],
      a: "Wispr Flow captures every client session, and Claude helps Omar structure it into minutes of meeting: decisions, owners and action items. He reviews every line before it goes out, which keeps scope agreed and everyone on the same page.",
      f: ["brd", "method"] },
    { id: "workflow", k: { workflow: 3, workflows: 3, diagram: 3, diagrams: 3, flowchart: 3, flowcharts: 3, bpmn: 3, flows: 2, mapping: 2 },
      p: ["process map", "process maps", "workflow diagrams"],
      a: "Omar designs workflow diagrams for both the As-Is (how work happens today) and the To-Be (the leaner proposed process). They help stakeholders and developers agree on how the process should run.",
      f: ["method", "deliverables"] },
    { id: "testing", k: { test: 3, tests: 3, testing: 3, qa: 3, uat: 3, devops: 3, azure: 3, backlog: 3, backlogs: 3, acceptance: 2, quality: 1, developers: 2, build: 1 },
      p: ["test cases", "acceptance criteria", "azure devops", "with developers"],
      a: "Omar stays involved through the build: he manages requirements and the backlog in Azure DevOps, then writes and runs test cases to check each feature against its acceptance criteria before it ships.",
      f: ["rtm", "skills"] },
    { id: "skills", k: { skills: 4, skill: 4, strengths: 2, expertise: 3, competencies: 3, toolkit: 3, capabilities: 2, stakeholder: 2, stakeholders: 2, communication: 2, technical: 2 },
      p: ["good at", "stakeholder management"],
      a: "Omar's core skills are business analysis, requirements gathering, solution design, AI agents and stakeholder management. Around them: BRDs, requirements traceability, gap analysis, user stories, business process design, user acceptance testing and workshop facilitation, backed by a Computer Science degree.",
      f: ["ai", "education"] },
    { id: "tools", k: { tool: 3, tools: 3, software: 3, know: 1, knows: 1, use: 1, uses: 1, familiar: 2, jira: 3, confluence: 3, visio: 3, excel: 3, sql: 3, power: 2, powerbi: 3, sap: 3, salesforce: 3, dynamics: 3, figma: 3, python: 3, lucidchart: 3, miro: 3, tableau: 3, servicenow: 3 },
      p: ["does he know", "does he use", "familiar with", "experience with", "which tools", "what tools", "power automate", "power bi", "power apps"],
      a: "Omar's working toolkit is Claude, Claude Code and MCP for structuring documents and prototyping, Wispr Flow for capturing meetings, and Azure DevOps for requirements, backlogs and test cases. For any other specific tool, Omar can tell you directly at {email}.",
      f: ["ai", "testing"] },
    { id: "education", k: { education: 4, degree: 4, university: 4, study: 3, studied: 3, studies: 2, college: 3, liu: 4, bachelor: 4, bsc: 4, science: 2, computer: 2, graduate: 3, graduated: 3, graduation: 3, honor: 3, honors: 3, dean: 3, gpa: 2, school: 2 },
      p: ["computer science", "lebanese international university", "deans list", "honor list"],
      a: "Omar studied for a BSc in Computer Science at the Lebanese International University (2023 to 2026) and made the Dean's Honor List three times: Spring 2024, Spring 2025 and Fall 2025.",
      f: ["certs", "skills"] },
    { id: "certs", k: { certificate: 4, certificates: 4, certification: 4, certifications: 4, certified: 4, ccna: 4, cisco: 4, course: 3, courses: 3, credentials: 3, academy: 3, fluency: 3, verify: 3 },
      p: [],
      a: "Omar holds seven Anthropic certificates:\n- Claude 101, Claude Platform 101, AI Fluency for Builders, AI Fluency for Creative Work and Deploying Claude Enterprise with Confidence (October 2026)\n- Claude Code 101 and Claude Code in Action (August 2026)\nEach one can be verified from the Background section of this page. He also holds Cisco CCNA I and JavaScript Fundamentals (2025).",
      f: ["education", "skills"] },
    { id: "experience", k: { experience: 3, experienced: 3, years: 2, career: 3, started: 2, start: 1, intern: 3, internship: 3, history: 2, timeline: 2, since: 1, seniority: 2, senior: 2, junior: 2 },
      p: ["how long", "how many years", "work experience", "when did he start"],
      a: "Omar joined Netways as a Business Analyst intern in December 2025 and was promoted to a full-time Business Analyst role in March 2026. Since then he has worked on client projects in Saudi Arabia for a petrochemical company and, currently, a capital-markets regulator.",
      f: ["projects", "education"] },
    { id: "location", k: { based: 4, location: 4, located: 4, live: 3, lives: 3, country: 3, city: 3, lebanon: 3, beirut: 3, remote: 3, remotely: 3, timezone: 3, relocate: 3, relocation: 3, onsite: 3, travel: 2, where: 1, from: 1 },
      p: ["where is he", "where does he live", "where is omar", "time zone", "on site"],
      a: "Omar is based in Lebanon and works remotely with clients in Saudi Arabia. Anything about relocation or travel is best asked to him directly at {email}.",
      f: ["contact", "netways"] },
    { id: "contact", k: { contact: 4, email: 4, mail: 3, reach: 3, linkedin: 4, phone: 3, call: 2, message: 2, connect: 3, hire: 2, talk: 2, meet: 2 },
      p: ["get in touch", "how can i reach", "how do i contact", "get hold of"],
      a: "The quickest way is email: {email}. You can also call him on {phone} or connect on {linkedin}. He'd be glad to hear from you.",
      f: ["cv", "availability"] },
    { id: "cv", k: { cv: 5, resume: 5, résumé: 5, download: 3, pdf: 3, curriculum: 4, vitae: 4 },
      p: ["his cv", "download cv", "download his cv", "get his cv", "his resume"],
      a: "You can download Omar's CV here: {cv}. It covers his experience at Netways, his skills, his education and all of his certificates, including the seven from Anthropic.",
      f: ["certs", "contact"] },
    { id: "availability", k: { available: 4, availability: 4, hiring: 3, freelance: 4, salary: 4, rate: 3, rates: 3, cost: 2, price: 2, pricing: 2, notice: 3, opportunities: 3, opportunity: 3, offer: 2, vacancy: 3, recruit: 3, recruiting: 3, contract: 2 },
      p: ["open to work", "open to new", "looking for a job", "is he available", "can we hire", "job offer"],
      a: "That's one for Omar himself. I don't have details on availability, rates or new roles. Drop him a line at {email} and he'll get back to you.",
      f: ["contact", "skills"] },
    { id: "languages", k: { language: 4, languages: 4, arabic: 3, english: 3, french: 3, speak: 3, speaks: 3, fluent: 3 },
      p: ["what languages"],
      a: "His LinkedIn profile lists English. For other languages, it's best to ask Omar directly at {email}.",
      f: ["contact", "location"] },
    { id: "personal", k: { age: 4, old: 2, hobbies: 4, hobby: 4, married: 4, wife: 4, family: 3, personal: 3, birthday: 4, religion: 4, nationality: 3, interests: 3, free: 1, weekend: 2, sports: 3 },
      p: ["how old", "free time", "outside work"],
      a: "I only know about Omar's professional side: his work, projects, skills and education. For anything else, feel free to email him at {email}.",
      f: ["about", "contact"] },
    { id: "why", k: { why: 2, hire: 2, strengths: 2, unique: 3, different: 2, value: 2, fit: 2, best: 1, recommend: 2, convince: 3 },
      p: ["why should", "why hire", "stand out", "good fit", "what makes him"],
      a: "In short: he can lead the client conversation and help build what comes out of it. He asks the detailed questions that surface how a process really runs, uses AI to turn them into clear requirements and working prototypes fast, and stays with the developers through testing. He's doing exactly that today on a project for a Saudi capital-markets regulator.",
      f: ["method", "contact"] },
    { id: "site", k: { website: 3, site: 3, page: 1, threejs: 3, three: 2, gsap: 3, blender: 3, animation: 2, animations: 2, chatbot: 1 },
      p: ["how was this", "who built", "who made", "how did you build", "this portfolio"],
      a: "Omar built this portfolio end to end with Claude Code. The 3D and scroll animation use Three.js and GSAP, and the chrome thread and deliverable objects were modelled and rendered in Blender, driven through MCP.",
      f: ["ai", "contact"] },
    { id: "bot", k: { bot: 3, chatbot: 3, assistant: 3, robot: 3, real: 1, human: 2 },
      p: ["who are you", "what are you", "are you real", "are you a bot", "are you omar", "how do you know", "how do you work"],
      a: "I'm the assistant on Omar's portfolio. I answer from a verified profile Omar has approved, so if I don't know something I'll say so rather than guess.",
      f: ["about", "contact"] }
  ];
  var SMALL = {
    greeting: { k: ["hi", "hello", "hey", "hiya", "salam", "marhaba", "yo", "greetings", "morning", "evening", "afternoon"],
      a: "Hi there! I'm Omar's assistant. Ask me about his work, projects, how he works or how to reach him." },
    thanks: { k: ["thanks", "thank", "thx", "appreciate", "appreciated", "cheers", "great", "perfect", "awesome", "nice", "cool", "ok", "okay"],
      a: "You're welcome! Anything else you'd like to know about Omar?" },
    bye: { k: ["bye", "goodbye", "later", "cya"],
      a: "Thanks for stopping by! If you'd like to talk to Omar, he's at {email}." }
  };
  var FALLBACK = "I'm not sure about that one. I only answer from Omar's verified profile, so I won't guess. You could try one of these, or ask Omar directly at {email}.";
  var ARABIC = "أهلاً وسهلاً! أجيب حالياً باللغة الإنجليزية فقط. جرّب أن تكتب سؤالك بالإنجليزية، أو راسل عمر مباشرة على {email}";
  var CHIPS = {
    about: "Who is Omar?", role: "What does he do?", netways: "Tell me about Netways", current: "What's he working on now?",
    previous: "His previous project", projects: "What has he worked on?", method: "How does he work?", ai: "How does he use AI?", site: "How was this site built?",
    deliverables: "What does he deliver?", tools: "Which tools does he use?", brd: "What's a BRD?", rtm: "What's an RTM?", mom: "Minutes of meeting?",
    testing: "Does he do testing?", skills: "What are his skills?", education: "Where did he study?",
    certs: "Any certificates?", experience: "How long has he been a BA?", location: "Where is he based?",
    contact: "How can I contact him?", cv: "Can I get his CV?", availability: "Is he open to new roles?", why: "Why work with Omar?"
  };
  var START = ["role", "ai", "current", "contact"];
  var byId = {};
  INTENTS.forEach(function (it) { byId[it.id] = it; });

  /* ---------- Matching ---------- */
  var STOP = { the: 1, a: 1, an: 1, is: 1, are: 1, was: 1, were: 1, do: 1, does: 1, did: 1, of: 1, to: 1, in: 1, on: 1, at: 1, for: 1, and: 1, or: 1, me: 1, i: 1, you: 1, he: 1, his: 1, him: 1, omar: 1, omars: 1, hazeem: 1, can: 1, could: 1, would: 1, please: 1, tell: 1, what: 1, whats: 1, any: 1, there: 1, it: 1, this: 1, that: 1, with: 1, has: 1, have: 1, be: 1, my: 1, your: 1, so: 1, about: 0 };
  function norm(s) {
    return (" " + s.toLowerCase().replace(/['’]/g, "").replace(/as-is/g, "asis").replace(/to-be/g, "tobe").replace(/[^a-z0-9؀-ۿ]+/g, " ") + " ").replace(/\s+/g, " ");
  }
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 3;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  function tokenHit(tok, word) {
    if (tok === word) return 1;
    if (tok.length >= 5 && word.length >= 5) {
      var d = lev(tok, word);
      if (d <= 1 || (d === 2 && word.length >= 8)) return 0.8;
    }
    return 0;
  }
  function classify(text) {
    var n = norm(text);
    var toks = n.trim().split(" ").filter(Boolean);
    var content = toks.filter(function (t) { return !STOP[t]; });
    // small talk only when the message is short and has no real question in it
    if (toks.length <= 4) {
      for (var key in SMALL) {
        if (toks.some(function (t) { return SMALL[key].k.indexOf(t) !== -1; }) && content.length <= 2) {
          var hasIntent = INTENTS.some(function (it) { return content.some(function (t) { return (it.k[t] || 0) >= 3; }); });
          if (!hasIntent) return { small: key };
        }
      }
    }
    var scored = INTENTS.map(function (it) {
      var s = 0;
      toks.forEach(function (t) {
        var best = 0;
        for (var w in it.k) { var h = tokenHit(t, w); if (h) best = Math.max(best, it.k[w] * h); }
        s += best;
      });
      it.p.forEach(function (ph) { if (n.indexOf(" " + ph + " ") !== -1) s += 3; });
      return { it: it, s: s };
    }).sort(function (a, b) { return b.s - a.s; });
    return { top: scored[0], second: scored[1] };
  }

  var lastIntent = null;
  function localAnswer(text) {
    if (/[؀-ۿ]/.test(text)) return { text: ARABIC, chips: START, rtl: true };
    var n = norm(text);
    if (lastIntent && /^ (tell me )?(more|and|go on|continue|details|elaborate|explain more|more please|what else) $/.test(n)) {
      var nxt = byId[lastIntent].f[0];
      lastIntent = nxt;
      return { text: byId[nxt].a, chips: byId[nxt].f };
    }
    var c = classify(text);
    if (c.small) return { text: SMALL[c.small].a, chips: START };
    if (!c.top || c.top.s < 1.8) return { text: FALLBACK, chips: START, miss: true };
    var parts = [c.top.it];
    // two clearly asked things: answer both
    if (c.second && c.second.s >= 3 && c.second.s >= c.top.s * 0.8) parts.push(c.second.it);
    lastIntent = parts[parts.length - 1].id;
    var chips = [];
    parts.forEach(function (p) { p.f.forEach(function (f) { if (chips.indexOf(f) === -1 && parts.every(function (q) { return q.id !== f; })) chips.push(f); }); });
    return { text: parts.map(function (p) { return p.a; }).join("\n\n"), chips: chips.slice(0, 3) };
  }

  /* ---------- UI ---------- */
  var ICON = {
    close: "M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z",
    send: "M205.66,117.66a8,8,0,0,1-11.32,0L136,59.31V216a8,8,0,0,1-16,0V59.31L61.66,117.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0l72,72A8,8,0,0,1,205.66,117.66Z"
  };
  // Phosphor Icons (regular): x, arrow-up
  function svg(path) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 256 256"); s.setAttribute("aria-hidden", "true");
    var p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", path); s.appendChild(p);
    return s;
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  // The assistant's face: a small robot head on a lime disc (antenna, ears, screen eyes that blink, a smile)
  function bot(cls) {
    var w = el("span", "bot " + (cls || ""));
    w.setAttribute("aria-hidden", "true");
    w.innerHTML = '<svg viewBox="0 0 40 40"><circle class="bot__bg" cx="20" cy="20" r="20"/>' +
      '<path class="bot__stem" d="M20 7.6v4"/><circle class="bot__tip" cx="20" cy="6.4" r="2.1"/>' +
      '<rect class="bot__ink" x="7.2" y="18" width="2.6" height="6.4" rx="1.3"/><rect class="bot__ink" x="30.2" y="18" width="2.6" height="6.4" rx="1.3"/>' +
      '<rect class="bot__ink" x="10" y="11.6" width="20" height="17.4" rx="6.2"/>' +
      '<g class="bot__eyes"><ellipse cx="15.9" cy="19.6" rx="2.1" ry="2.5"/><ellipse cx="24.1" cy="19.6" rx="2.1" ry="2.5"/></g>' +
      '<path class="bot__smile" d="M16.4 24.2q3.6 2.7 7.2 0"/></svg>';
    return w;
  }

  var launcher = el("button", "assistant-launcher");
  launcher.type = "button";
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-controls", "assistant-panel");
  launcher.setAttribute("aria-label", "Ask about Omar: open the AI assistant");
  launcher.setAttribute("data-cursor-text", "Ask");
  launcher.appendChild(bot("bot--launcher"));
  var launchText = el("span", "assistant-launcher__label");
  launchText.appendChild(el("span", "assistant-launcher__title", "Ask about Omar"));
  launchText.appendChild(el("span", "assistant-launcher__sub", "AI assistant · online"));
  launcher.appendChild(launchText);

  var panel = el("section", "assistant");
  panel.id = "assistant-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Ask about Omar");
  panel.hidden = true;
  panel.tabIndex = -1;
  panel.setAttribute("data-lenis-prevent", "");
  panel.addEventListener("mouseenter", function () { root.classList.add("assistant-hover"); });
  panel.addEventListener("mouseleave", function () { root.classList.remove("assistant-hover"); });

  var head = el("header", "assistant__head");
  var titles = el("div");
  titles.appendChild(el("h2", "assistant__title", "Ask about Omar"));
  var modeLine = el("p", "assistant__sub", "");
  titles.appendChild(modeLine);
  var closeBtn = el("button", "assistant__close");
  closeBtn.type = "button"; closeBtn.setAttribute("aria-label", "Close the assistant");
  closeBtn.appendChild(svg(ICON.close));
  var who = el("div", "assistant__who");
  who.appendChild(bot("bot--head")); who.appendChild(titles);
  head.appendChild(who); head.appendChild(closeBtn);

  var log = el("div", "assistant__log");
  log.setAttribute("role", "log"); log.setAttribute("aria-live", "polite");
  log.setAttribute("data-lenis-prevent", "");

  var chipsRow = el("div", "assistant__chips");

  var form = el("form", "assistant__form");
  var label = el("label", "sr-only", "Your question");
  label.setAttribute("for", "assistant-input");
  var input = el("textarea", "assistant__input");
  input.id = "assistant-input"; input.rows = 1; input.maxLength = 600;
  input.placeholder = "Ask anything about Omar…";
  var sendBtn = el("button", "assistant__send");
  sendBtn.type = "submit"; sendBtn.setAttribute("aria-label", "Send");
  sendBtn.appendChild(svg(ICON.send));
  form.appendChild(label); form.appendChild(input); form.appendChild(sendBtn);

  var note = el("p", "assistant__note", "");
  panel.appendChild(head); panel.appendChild(log); panel.appendChild(chipsRow); panel.appendChild(form); panel.appendChild(note);
  document.body.appendChild(panel);
  document.body.appendChild(launcher);

  var endpoint = (window.OH_ASSISTANT_ENDPOINT || "").trim();
  function setMode(ai) {
    modeLine.textContent = ai ? "Online · powered by Claude" : "Online · verified answers";
    note.textContent = ai ? "Powered by Claude. Answers come only from Omar's profile." : "If I don't know, I'll say so. I never guess.";
  }
  setMode(!!endpoint);

  /* ---------- Messages ---------- */
  var history = [];            // {role, content} for AI mode and the saved session
  var busy = false;
  function save() { try { sessionStorage.setItem("oh-chat", JSON.stringify(history.slice(-20))); } catch (e) {} }

  // Render answer text: "\n- " lines become a list, {email} and {linkedin} become links. Never uses innerHTML.
  function renderInto(node, text) {
    node.textContent = "";
    text.split("\n\n").forEach(function (para) {
      var lines = para.split("\n");
      var p = el("p"), list = null;
      lines.forEach(function (line) {
        if (/^- /.test(line)) {
          if (!list) { list = el("ul"); }
          var li = el("li"); appendRich(li, line.slice(2)); list.appendChild(li);
        } else {
          if (p.childNodes.length) p.appendChild(document.createTextNode(" "));
          appendRich(p, line);
        }
      });
      if (p.childNodes.length) node.appendChild(p);
      if (list) node.appendChild(list);
    });
  }
  function appendRich(parent, text) {
    text.split(/(\{email\}|\{linkedin\}|\{phone\}|\{cv\})/).forEach(function (bit) {
      if (bit === "{email}") { var a = el("a", null, EMAIL); a.href = "mailto:" + EMAIL; parent.appendChild(a); }
      else if (bit === "{linkedin}") { var l = el("a", null, "LinkedIn"); l.href = LINKEDIN; l.target = "_blank"; l.rel = "noopener"; parent.appendChild(l); }
      else if (bit === "{phone}") { var t = el("a", null, PHONE); t.href = "tel:" + PHONE.replace(/\s/g, ""); parent.appendChild(t); }
      else if (bit === "{cv}") { var c = el("a", null, "Download CV (PDF)"); c.href = CV; c.setAttribute("download", "Omar Hazeem - Agentic Business Analyst CV.pdf"); c.setAttribute("data-cv", ""); parent.appendChild(c); }
      else if (bit) parent.appendChild(document.createTextNode(bit));
    });
  }
  function addUser(text) {
    var m = el("div", "msg msg--user"); m.textContent = text; log.appendChild(m); scroll();
  }
  function addBot() { var m = el("div", "msg msg--bot"); log.appendChild(m); scroll(); return m; }
  function scroll() { log.scrollTop = log.scrollHeight; }
  function typing(on) {
    var t = log.querySelector(".msg--typing");
    if (on && !t) { t = el("div", "msg msg--bot msg--typing"); t.setAttribute("aria-label", "Typing"); t.appendChild(el("span")); t.appendChild(el("span")); t.appendChild(el("span")); log.appendChild(t); scroll(); }
    if (!on && t) t.remove();
  }
  // Type the answer out quickly (instant when motion is off)
  function reveal(node, text, done) {
    if (!motionOn()) { renderInto(node, text); scroll(); done(); return; }
    var i = 0, step = Math.max(2, Math.round(text.length / 90));
    (function tick() {
      i = Math.min(text.length, i + step);
      renderInto(node, text.slice(0, i).replace(/\{[a-z]*$/, ""));   // hide a half-typed {token}
      scroll();
      if (i < text.length) setTimeout(tick, 16); else { renderInto(node, text); done(); }
    })();
  }
  function setChips(ids) {
    chipsRow.textContent = "";
    ids.forEach(function (id) {
      if (!CHIPS[id]) return;
      var b = el("button", "chip", CHIPS[id]); b.type = "button";
      b.addEventListener("click", function () {
        ask(CHIPS[id]);
        // the chip is removed on click, so keep keyboard focus in the panel (not on phones: no surprise keyboard)
        if (!window.matchMedia("(pointer: coarse)").matches) input.focus({ preventScroll: true }); else panel.focus({ preventScroll: true });
      });
      chipsRow.appendChild(b);
    });
    scroll();
  }

  function answerLocally(q, then) {
    var r = localAnswer(q);
    setTimeout(function () {
      typing(false);
      var bubble = addBot();
      if (r.rtl) { bubble.dir = "rtl"; bubble.lang = "ar"; }
      reveal(bubble, r.text, function () {
        history.push({ role: "assistant", content: r.text.replace(/\{email\}/g, EMAIL).replace(/\{linkedin\}/g, "LinkedIn").replace(/\{phone\}/g, PHONE).replace(/\{cv\}/g, "the Download CV button") }); save();
        setChips(r.chips || START); then();
      });
    }, motionOn() ? 420 : 0);
  }

  // AI mode: stream from the server; fall back to local answers on any failure
  function answerWithAI(q, then) {
    var bubble = null, text = "", failed = false;
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 20000);
    fetch(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
      body: JSON.stringify({ messages: history.slice(-16) })
    }).then(function (res) {
      if (!res.ok || !res.body) throw new Error("http " + res.status);
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = "";
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) return;
          buf += dec.decode(r.value, { stream: true });
          var parts = buf.split("\n\n"); buf = parts.pop();
          parts.forEach(function (chunk) {
            var line = chunk.replace(/^data: /, "");
            try {
              var ev = JSON.parse(line);
              if (ev.t) {
                if (!bubble) { typing(false); bubble = addBot(); }
                text += ev.t; bubble.textContent = text; scroll();
              } else if (ev.error) { failed = true; }
            } catch (e) {}
          });
          return pump();
        });
      }
      return pump();
    }).catch(function () { failed = true; }).then(function () {
      clearTimeout(timer);
      if (!text) { answerLocally(q, then); return; }
      typing(false);
      renderInto(bubble, text);
      history.push({ role: "assistant", content: text }); save();
      setChips(START); then();
    });
  }

  function ask(q) {
    q = (q || "").trim();
    if (!q || busy) return;
    busy = true; sendBtn.disabled = true;
    addUser(q);
    history.push({ role: "user", content: q.slice(0, 600) }); save();
    chipsRow.textContent = "";
    typing(true);
    var done = function () { busy = false; sendBtn.disabled = false; };
    if (endpoint) answerWithAI(q, done); else answerLocally(q, done);
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); var q = input.value; input.value = ""; autosize(); ask(q); });
  input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit")); } });
  function autosize() { input.style.height = "auto"; input.style.height = Math.min(120, input.scrollHeight) + "px"; }
  input.addEventListener("input", autosize);

  /* ---------- A one-time hello beside the launcher ---------- */
  // Once per visit, a few seconds after the launcher is on screen, the bot says hi; clicking it opens the chat.
  var hello = el("div", "assistant-hello");
  hello.hidden = true;
  var helloText = el("button", "assistant-hello__text");
  helloText.type = "button";
  helloText.appendChild(el("strong", null, "Hi! 👋 "));
  helloText.appendChild(document.createTextNode("I'm Omar's assistant. Ask me anything about his work."));
  var helloClose = el("button", "assistant-hello__close");
  helloClose.type = "button"; helloClose.setAttribute("aria-label", "Dismiss the greeting");
  helloClose.appendChild(svg(ICON.close));
  hello.appendChild(helloText); hello.appendChild(helloClose);
  document.body.appendChild(hello);
  var helloTimer = null;
  function hideHello() {
    clearTimeout(helloTimer);
    try { sessionStorage.setItem("oh-hello", "1"); } catch (e) {}
    if (hello.hidden) return;
    hello.classList.remove("is-shown");
    setTimeout(function () { hello.hidden = true; }, motionOn() ? 300 : 0);
  }
  function launcherVisible() { var cs = getComputedStyle(launcher); return cs.visibility !== "hidden" && parseFloat(cs.opacity) > 0.5; }
  function showHello(tries) {
    if (!panel.hidden) return;
    // on phones the bubble would sit over the hero buttons, so it waits until the visitor has scrolled a little
    var heroInTheWay = window.matchMedia("(max-width: 767px)").matches && window.scrollY < window.innerHeight * 0.45;
    if (!launcherVisible() || heroInTheWay) { if (tries < 30) setTimeout(function () { showHello(tries + 1); }, 2000); return; }
    hello.hidden = false;
    requestAnimationFrame(function () { hello.classList.add("is-shown"); });
    helloTimer = setTimeout(hideHello, 9000);
  }
  helloText.addEventListener("click", function () { hideHello(); open(); });
  helloClose.addEventListener("click", hideHello);
  var helloSeen = null;
  try { helloSeen = sessionStorage.getItem("oh-hello"); } catch (e) {}
  if (!helloSeen) setTimeout(function () { showHello(0); }, 6000);

  /* ---------- Open / close ---------- */
  var started = false;
  function open() {
    hideHello();
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    root.classList.add("assistant-open");
    if (!started) {
      started = true;
      var saved = null;
      try { saved = JSON.parse(sessionStorage.getItem("oh-chat") || "null"); } catch (e) {}
      if (saved && saved.length) {
        history = saved;
        saved.forEach(function (m) { if (m.role === "user") addUser(m.content); else renderInto(addBot(), m.content); });
        setChips(START);
      } else {
        var hi = addBot();
        renderInto(hi, "Hi! I'm Omar's assistant. Ask me anything about his work, his projects, how he works or how to reach him.");
        setChips(START);
      }
    }
    requestAnimationFrame(function () { panel.classList.add("is-open"); input.focus({ preventScroll: true }); });
  }
  function close() {
    panel.classList.remove("is-open");
    launcher.setAttribute("aria-expanded", "false");
    root.classList.remove("assistant-open");
    setTimeout(function () { if (!panel.classList.contains("is-open")) panel.hidden = true; }, motionOn() ? 320 : 0);
    launcher.focus({ preventScroll: true });
  }
  launcher.addEventListener("click", function () { if (panel.hidden) open(); else close(); });
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) close(); });
  // phones: the chat is a floating card, so a tap on the page above it closes it
  document.addEventListener("click", function (e) {
    if (panel.hidden || !window.matchMedia("(max-width: 767px)").matches) return;
    if (!e.target.isConnected) return;   // a suggestion chip removes itself when tapped: that tap was inside
    if (panel.contains(e.target) || launcher.contains(e.target) || hello.contains(e.target)) return;
    close();
  });
  // keep the launcher clear of the reduced-motion prompt when it is showing
  var promptBox = document.querySelector("[data-motion-prompt-box]");
  function syncPrompt() { root.classList.toggle("has-motion-prompt", !!promptBox && !promptBox.hidden); }
  if (promptBox && window.MutationObserver) new MutationObserver(syncPrompt).observe(promptBox, { attributes: true, attributeFilter: ["hidden"] });
  syncPrompt();

  // reveal the launcher after the first screen (CSS applies this on phones only)
  function syncReady() { root.classList.toggle("assistant-ready", window.scrollY > window.innerHeight * 0.45 || !panel.hidden); }
  window.addEventListener("scroll", syncReady, { passive: true });
  syncReady();

  window.OHAssistant = { open: open, close: close, ask: ask, _answer: localAnswer };
})();
