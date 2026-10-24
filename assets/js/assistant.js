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
      a: "Omar Hazeem is an Agentic Business Analyst at Netways, working remotely from Lebanon with clients in the UAE and Saudi Arabia. He leads client discovery, turns it into BRDs, process maps and working solutions, and uses AI at every step: Wispr Flow to capture meetings, Claude to structure the documents, and Claude Code with MCP to prototype. Right now he's on the Capital Market Authority's programme in the UAE, re-engineering the authority's services for a new portal.",
      f: ["ai", "method", "contact"] },
    { id: "role", k: { role: 2, job: 2, title: 2, position: 2, occupation: 2, profession: 2, analyst: 2, ba: 2, responsibilities: 2, duties: 2, daily: 1, day: 1, agentic: 3 },
      p: ["what does he do", "what does omar do", "what do you do", "business analyst", "day to day", "his work", "what is his job", "agentic ba"],
      a: "Omar is an Agentic Business Analyst at Netways. He leads requirements workshops with clients, writes BRDs, traceability matrices and minutes of meeting, designs workflow diagrams, prototypes solutions with Claude Code, and works alongside the developers in Azure DevOps until each feature is tested against its acceptance criteria.",
      f: ["ai", "deliverables", "current"] },
    { id: "netways", k: { netways: 4, company: 2, employer: 2, firm: 2, organisation: 1, organization: 1, employed: 2 },
      p: ["where does he work", "who does he work for", "which company"],
      a: "Netways is a technology consultancy serving governments and organisations across the Middle East, and a Microsoft Business Applications partner. Omar joined as a Business Analyst intern in December 2025 and has been a full-time Business Analyst there since March 2026.",
      f: ["projects", "experience"] },
    { id: "current", k: { cma: 5, sca: 5, uae: 3, emirates: 3, authority: 3, portal: 2, services: 2, capital: 2, markets: 2, market: 2, regulator: 2, regulatory: 2, current: 1, now: 1 },
      p: ["current project", "working on now", "working on right now", "what is he working on"],
      a: "Omar's current engagement, through Netways, is with the Capital Market Authority, the UAE's federal capital-markets regulator (formerly SCA). The programme re-engineers the authority's services end to end for a new e-services portal: a catalogue of 200+ services across 13 departments, with up to 120 in the redesign scope. He runs As-Is discovery with the departments and has captured the requirements for every Wave 1 BRD so far: 24 As-Is and To-Be BRDs and 9 SOPs, in Arabic and English.",
      f: ["method", "previous", "deliverables"] },
    { id: "previous", k: { previous: 2, before: 1, earlier: 2 },
      p: ["previous project", "last project"],
      a: "Before the Capital Market Authority, Omar worked on these Netways engagements in Saudi Arabia:\n- Royal Commission for Jubail and Yanbu: a KPI governance platform. He co-authored the BRD (37 use cases).\n- Saudi Chevron Phillips (S-Chem): 25 workflow applications moving to Liferay DXP. He authored or co-authored 10 of the 18 BRDs.\n- Bank Albilad: Phase 1 of an Arabic and English AI assistant and conversational IVR, with the BRD, inquiry flow and a 78-requirement RTM.\n- Social Development Bank: Arabic training materials for no-code financing engines on Dynamics 365.\n- NCGR: Arabic user stories for the Center's internal portal.",
      f: ["rcjy", "schem", "albilad"] },
    { id: "projects", k: { project: 2, projects: 2, clients: 2, client: 1, engagements: 2, engagement: 2, portfolio: 1, case: 1, studies: 1 },
      p: ["worked on", "who has he worked with", "case studies", "selected work"],
      a: "Six client engagements so far, all through Netways:\n- Capital Market Authority, UAE (current): re-engineering 200+ services for a new e-services portal.\n- Royal Commission for Jubail and Yanbu: a KPI governance platform.\n- Saudi Chevron Phillips (S-Chem): 25 workflow apps on Liferay DXP.\n- Bank Albilad: an AI assistant and conversational IVR.\n- Social Development Bank: financing-product engines on Dynamics 365.\n- NCGR: internal portal user stories.\nAsk me about any of them for the detail.",
      f: ["current", "albilad", "schem"] },
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
    { id: "tools", k: { liferay: 3, tool: 3, tools: 3, software: 3, know: 1, knows: 1, use: 1, uses: 1, familiar: 2, jira: 3, confluence: 3, visio: 3, excel: 3, sql: 3, power: 2, powerbi: 3, sap: 3, salesforce: 3, dynamics: 3, figma: 3, python: 3, lucidchart: 3, miro: 3, tableau: 3, servicenow: 3 },
      p: ["does he know", "does he use", "familiar with", "experience with", "which tools", "what tools", "power automate", "power bi", "power apps"],
      a: "Omar's working toolkit is Claude, Claude Code and MCP for structuring documents and prototyping, Wispr Flow for capturing meetings, and Azure DevOps for requirements, backlogs and test cases. His projects run on Microsoft Dynamics 365, Power Platform and Liferay DXP. For any other specific tool, Omar can tell you directly at {email}.",
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
      a: "Omar joined Netways as a Business Analyst intern in December 2025 and moved to a full-time Business Analyst role in March 2026. Since then he has worked for six clients in the UAE and Saudi Arabia, including the Capital Market Authority (UAE), Bank Albilad and Saudi Chevron Phillips.",
      f: ["projects", "education"] },
    { id: "location", k: { based: 4, location: 4, located: 4, live: 3, lives: 3, country: 3, city: 3, lebanon: 3, beirut: 3, remote: 3, remotely: 3, timezone: 3, relocate: 3, relocation: 3, onsite: 3, travel: 2, where: 1, from: 1 },
      p: ["where is he", "where does he live", "where is omar", "time zone", "on site"],
      a: "Omar is based in Lebanon and works remotely with clients in the UAE and Saudi Arabia. Anything about relocation or travel is best asked to him directly at {email}.",
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
      a: "Omar speaks three languages: English, Arabic and French. You can ask me your questions in English or Arabic.",
      f: ["contact", "location"] },
    { id: "personal", k: { age: 4, old: 2, hobbies: 4, hobby: 4, married: 4, wife: 4, family: 3, personal: 3, birthday: 4, religion: 4, nationality: 3, interests: 3, free: 1, weekend: 2, sports: 3 },
      p: ["how old", "free time", "outside work"],
      a: "I only know about Omar's professional side: his work, projects, skills and education. For anything else, feel free to email him at {email}.",
      f: ["about", "contact"] },
    { id: "why", k: { why: 2, hire: 2, strengths: 2, unique: 3, different: 2, value: 2, fit: 2, best: 1, recommend: 2, convince: 3 },
      p: ["why should", "why hire", "stand out", "good fit", "what makes him"],
      a: "In short: he can lead the client conversation and help build what comes out of it. He asks the detailed questions that surface how a process really runs, uses AI to turn them into clear requirements and working prototypes fast, and stays with the developers through testing. He's doing exactly that today on the Capital Market Authority's programme in the UAE.",
      f: ["method", "contact"] },
    { id: "site", k: { bpmn: 3, swimlane: 3, swimlanes: 3, website: 3, site: 3, page: 1, threejs: 3, three: 2, gsap: 3, blender: 3, animation: 2, animations: 2, chatbot: 1 },
      p: ["how was this", "who built", "who made", "how did you build", "this portfolio"],
      a: "Omar built this portfolio end to end with Claude Code. The 3D and scroll animation use Three.js and GSAP, the chrome thread and deliverable objects were modelled and rendered in Blender through MCP, and his process is drawn as BPMN swimlanes (client, Omar, AI agents, developers) with a token that moves through them as you scroll.",
      f: ["ai", "contact"] },
    { id: "rcjy", k: { rcjy: 5, jubail: 4, yanbu: 4, royal: 2, commission: 2, kpi: 3, kpis: 3, omnix: 4 },
      p: ["royal commission", "jubail and yanbu"],
      a: "For the Royal Commission for Jubail and Yanbu (Saudi Arabia), delivered by Netways with Omnix International, Omar co-authored the BRD for a KPI governance platform on Liferay DXP. It replaces Excel and email reporting with submit, review and approve workflows for about 100 strategic KPIs across four industrial cities, including a ministerial dashboard. The BRD has 37 use cases, with KPI use cases that set out formulas, frequencies and role-based approval.",
      f: ["projects", "contact"] },
    { id: "schem", k: { schem: 5, chevron: 5, phillips: 4, petrochemical: 3, petrochemicals: 3, liferay: 2, permits: 3, hse: 3 },
      p: ["s chem", "chevron phillips"],
      a: "For Saudi Chevron Phillips (S-Chem), a petrochemical joint venture in Jubail, Netways is modernising 25 employee-service and HSE workflow applications onto Liferay DXP. Omar took part in 16 requirements workshops and authored or co-authored 10 of the 18 BRDs, covering 13 applications such as access permits, material gate pass, job safety analysis, HR clearance, document review and turnaround requests. He revised them after stakeholder review and turned them into Azure DevOps backlogs.",
      f: ["projects", "contact"] },
    { id: "albilad", k: { albilad: 5, bilad: 5, bank: 1, ivr: 4 },
      p: ["bank albilad", "bank al bilad"],
      a: "For Bank Albilad (Saudi Arabia), Omar worked on Phase 1 of an Arabic and English AI assistant and conversational IVR across the bank's digital and voice channels: 14 channels on a four-phase roadmap. His work covered the Phase 1 BRD, the end-to-end inquiry flow (intent detection, knowledge-scope checks and live-agent handoff) and a traceability matrix of 78 requirements and 49 use cases.",
      f: ["projects", "contact"] },
    { id: "sdb", k: { sdb: 5, social: 3, development: 2, financing: 3, training: 3 },
      p: ["social development bank"],
      a: "For the Social Development Bank (Saudi Arabia), Netways is automating the bank's financing products on Microsoft Dynamics 365 with no-code business-rule, workflow and form engines. Omar produced Arabic end-user training materials for those engines, aligned with the functional specification (28 use cases, 22 user roles).",
      f: ["projects", "contact"] },
    { id: "ncgr", k: { ncgr: 5, resource: 2, resources: 2, government: 2, intranet: 3 },
      p: ["government resource"],
      a: "For the National Center for Government Resource Systems (NCGR, Saudi Arabia), Omar worked on enhancements to the Center's internal employee portal: Arabic user stories with acceptance criteria and linked screen designs, for a policy-acknowledgement flow and an auditor register with filtering and export.",
      f: ["projects", "contact"] },
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
  var CHIPS = { rcjy: "Tell me about RCJY", schem: "Tell me about S-Chem", albilad: "Tell me about Bank Albilad", sdb: "Tell me about SDB", ncgr: "Tell me about NCGR",
    about: "Who is Omar?", role: "What does Omar do?", netways: "Tell me about Netways", current: "What is Omar working on now?",
    previous: "His previous project", projects: "What has he worked on?", method: "How does he work?", ai: "How does Omar use AI?", site: "How was this site built?",
    deliverables: "What does he deliver?", tools: "Which tools does he use?", brd: "What's a BRD?", rtm: "What's an RTM?", mom: "Minutes of meeting?",
    testing: "Does he do testing?", skills: "What are his skills?", education: "Where did he study?",
    certs: "Which certificates does Omar have?", experience: "How long has he been a BA?", location: "Where is he based?",
    contact: "How can I contact Omar?", cv: "Can I download Omar's CV?", availability: "Is he open to new roles?", why: "Why work with Omar?"
  };
  var START = ["role", "contact", "ai", "current", "cv"];   // direct questions offered when the chat opens
  var byId = {};
  INTENTS.forEach(function (it) { byId[it.id] = it; });

  /* ---------- Arabic: keywords, phrases and the same approved answers ---------- */
  // Keywords are stems: a word in the question matches when it contains one (so شهادات and الشهادات both match شهاد).
  // Written in plain Arabic; they are normalised (أ/إ/آ to ا, ة to ه, ى to ي) when the page loads.
  var AR = {
    about: { k: { "نبذه": 3, "عرفني": 3, "تعريف": 2, "ملخص": 2 },
      p: ["من هو", "مين هو", "مين عمر", "من عمر", "عن عمر", "احكيلي عن", "اخبرني عن", "حدثني عن"],
      a: "عمر محلل أعمال يعتمد على وكلاء الذكاء الاصطناعي (Agentic Business Analyst) في Netways، يعمل عن بُعد من لبنان مع عملاء في الإمارات والسعودية. يقود جلسات استكشاف احتياجات العملاء، ويحوّلها إلى وثائق BRD وخرائط عمليات وحلول عملية، ويستخدم الذكاء الاصطناعي في كل خطوة: Wispr Flow لتوثيق الاجتماعات، وClaude لصياغة المستندات، وClaude Code مع MCP لبناء النماذج الأولية. يعمل حالياً على برنامج هيئة سوق رأس المال في الإمارات لإعادة هندسة خدماتها لبوابة جديدة." },
    role: { k: { "وظيف": 3, "يشتغل": 3, "بيشتغل": 3, "شغله": 3, "مهنت": 3, "منصب": 3, "محلل": 3, "مسؤوليات": 3, "مهام": 3, "يعمل": 2, "عمله": 2, "يفعل": 2 },
      p: ["ماذا يعمل", "شو بيشتغل", "شو يشتغل", "شو بيعمل", "ماذا يفعل", "محلل اعمال", "طبيعه عمله"],
      a: "عمر محلل أعمال (Agentic Business Analyst) في Netways. يقود ورش جمع المتطلبات مع العملاء، ويكتب وثائق متطلبات الأعمال (BRD) ومصفوفات التتبّع ومحاضر الاجتماعات، ويصمّم مخططات سير العمل، ويبني نماذج أولية للحلول باستخدام Claude Code، ويعمل جنباً إلى جنب مع المطورين في Azure DevOps حتى تُختبر كل ميزة وفق معايير القبول." },
    netways: { k: { "نتوايز": 4, "نتويز": 4, "شركه": 2, "الشركه": 2 },
      p: ["اين يعمل", "وين بيشتغل", "وين يشتغل", "لمن يعمل", "اي شركه", "نت وايز"],
      a: "Netways شركة استشارات تقنية تخدم الحكومات والمؤسسات في الشرق الأوسط، وهي شريك لـ Microsoft في تطبيقات الأعمال. انضم إليها عمر متدرّباً في تحليل الأعمال في ديسمبر 2025، ويعمل فيها محلل أعمال بدوام كامل منذ مارس 2026." },
    current: { k: { "هيئه سوق": 5, "الامارات": 3, "اماراتي": 3, "بوابه": 2, "خدمات": 2, "حالي": 3, "حاليا": 9, "الان": 6, "هلق": 6, "هيئه": 2, "سوق": 2, "تنظيمي": 2, "رقابي": 2 },
      p: ["يعمل الان", "يعمل حاليا", "يشتغل حاليا", "يشتغل هلق", "بيشتغل هلق", "المشروع الحالي", "سوق المال", "راس المال"],
      a: "يعمل عمر حالياً، من خلال Netways، مع هيئة سوق رأس المال، الجهة الاتحادية المنظِّمة لأسواق المال في الإمارات (هيئة الأوراق المالية والسلع سابقاً). يعيد البرنامج هندسة خدمات الهيئة من البداية إلى النهاية لبوابة خدمات إلكترونية جديدة: كتالوج يضم أكثر من 200 خدمة في 13 إدارة، منها حتى 120 خدمة ضمن نطاق إعادة التصميم. يدير عمر جلسات استكشاف الوضع الحالي (As-Is) مع الإدارات، وجمع متطلبات جميع وثائق BRD للموجة الأولى حتى الآن: 24 وثيقة للوضعين الحالي والمستقبلي و9 إجراءات تشغيل قياسية، بالعربية والإنجليزية." },
    previous: { k: { "سابق": 3, "بتروكيم": 4, "قبل": 1 },
      p: ["المشروع السابق", "اخر مشروع", "قبل هيك"],
      a: "قبل هيئة سوق رأس المال، عمل عمر على مشاريع Netways هذه في السعودية:\n- الهيئة الملكية للجبيل وينبع: منصة لحوكمة مؤشرات الأداء، وشارك في كتابة وثيقة BRD (37 حالة استخدام).\n- شيفرون فيليبس السعودية (S-Chem): نقل 25 تطبيقاً لسير العمل إلى Liferay DXP، وكتب أو شارك في كتابة 10 من أصل 18 وثيقة BRD.\n- بنك البلاد: المرحلة الأولى من مساعد ذكي بالعربية والإنجليزية ونظام رد صوتي تفاعلي، مع وثيقة BRD ومسار الاستفسارات ومصفوفة تتبّع من 78 متطلباً.\n- بنك التنمية الاجتماعية: مواد تدريبية بالعربية لمحركات منتجات التمويل على Dynamics 365.\n- المركز الوطني لنظم الموارد الحكومية: قصص مستخدم بالعربية للبوابة الداخلية." },
    projects: { k: { "مشاريع": 3, "مشروع": 2, "عملاء": 3, "عملائ": 3, "عميل": 2, "اعمال": 1 },
      p: ["عمل عليها", "اشتغل عليها", "مع من عمل", "مع مين اشتغل"],
      a: "ستة مشاريع لعملاء حتى الآن، جميعها من خلال Netways:\n- هيئة سوق رأس المال، الإمارات (حالياً): إعادة هندسة أكثر من 200 خدمة لبوابة خدمات إلكترونية جديدة.\n- الهيئة الملكية للجبيل وينبع: منصة لحوكمة مؤشرات الأداء.\n- شيفرون فيليبس السعودية (S-Chem): 25 تطبيقاً لسير العمل على Liferay DXP.\n- بنك البلاد: مساعد ذكي ونظام رد صوتي تفاعلي.\n- بنك التنمية الاجتماعية: محركات منتجات التمويل على Dynamics 365.\n- المركز الوطني لنظم الموارد الحكومية: قصص مستخدم للبوابة الداخلية.\nاسألني عن أيٍّ منها لمزيد من التفاصيل." },
    method: { k: { "منهجي": 3, "طريقه": 2, "طريقت": 2, "اسلوب": 3, "خطوات": 3, "مراحل": 2, "اتمت": 3, "يدوي": 2, "استكشاف": 2, "مقابلات": 2 },
      p: ["كيف يعمل", "كيف بيشتغل", "كيف يشتغل", "طريقه عمله", "الوضع الحالي", "الوضع المستقبلي", "جمع المتطلبات"],
      a: "يعمل عمر على أربع خطوات:\n- الاستماع: يقود جلسات الاستكشاف مع الأشخاص الذين يؤدّون العمل فعلياً، ويوثّق Wispr Flow كل جلسة.\n- رسم الوضع الحالي (As-Is): كل تسليم وموافقة وإعادة تدقيق، ويصيغها مع Claude في محاضر ومتطلبات.\n- تصميم الوضع المستقبلي (To-Be): مسارات عمل أبسط، مع نماذج أولية بـ Claude Code ليتفاعل أصحاب المصلحة مع شيء حقيقي.\n- الأتمتة: تُؤتمت الخطوات التي لا تحتاج إلى حُكم بشري، ثم يكتب قصص المستخدم في Azure DevOps ويختبر حتى الإطلاق." },
    ai: { k: { "ذكاء": 4, "اصطناعي": 4, "وكيل": 3, "وكلاء": 3, "كلود": 4, "ويسبر": 4, "نماذج اللغه": 3, "شات جي بي تي": 3 },
      p: ["الذكاء الاصطناعي", "ذكاء اصطناعي"],
      a: "يعمل عمر كمحلل أعمال يعتمد على وكلاء الذكاء الاصطناعي، والذكاء الاصطناعي حاضر في كل مرحلة:\n- التوثيق: يسجّل Wispr Flow كل جلسة مع العميل ويتيح له إملاء ملاحظاته أثناءها.\n- الصياغة: يحوّل Claude هذا السجل إلى مسودات أولى للمحاضر وأقسام BRD وصفوف مصفوفة التتبّع، ويراجع عمر كل سطر ويتحمّل مسؤوليته.\n- النماذج الأولية: يبني Claude Code مع MCP نماذج عملية ليتفاعل معها العميل قبل بدء التطوير.\n- التسليم: قصص المستخدم ومعايير القبول وحالات الاختبار في Azure DevOps.\nيتولّى الذكاء الاصطناعي الصياغة، أما الإصغاء والحُكم والعلاقة مع العميل فتبقى مسؤوليته." },
    deliverables: { k: { "مخرجات": 4, "تسليمات": 4, "يسلم": 3, "مستندات": 3, "وثائق": 3, "ينتج": 2 },
      p: ["ماذا يسلم", "شو بيسلم", "ما الذي يسلمه"],
      a: "في المشروع النموذجي يُعدّ عمر:\n- وثيقة متطلبات الأعمال (BRD)\n- مصفوفة تتبّع المتطلبات (RTM)\n- محاضر اجتماعات بعد كل جلسة مع العميل\n- مخططات سير العمل للوضعين الحالي (As-Is) والمستقبلي (To-Be)\n- حالات الاختبار في Azure DevOps\nاسألني عن أيٍّ منها لمزيد من التفاصيل." },
    brd: { k: {}, p: ["متطلبات الاعمال", "وثيقه متطلبات", "وثيقه المتطلبات"],
      a: "وثيقة BRD هي وثيقة متطلبات الأعمال: النطاق المتفق عليه وقواعد العمل والمتطلبات. يكتبها عمر بحيث يعتمدها العميل ويبني عليها فريق التطوير." },
    rtm: { k: { "تتبع": 4, "مصفوف": 3 }, p: ["مصفوفه تتبع"],
      a: "مصفوفة تتبّع المتطلبات (RTM) تربط كل متطلب بتصميمه واختباره، فلا يضيع شيء بين ورشة العمل والإطلاق. يحتفظ بها عمر إلى جانب وثيقة BRD." },
    mom: { k: { "محاضر": 4, "محضر": 4 }, p: ["محاضر الاجتماعات", "محضر اجتماع", "ملاحظات الاجتماع"],
      a: "يوثّق Wispr Flow كل جلسة مع العميل، ويساعد Claude عمر على صياغتها في محاضر اجتماعات: القرارات والمسؤولون وبنود العمل. يراجع كل سطر قبل إرساله، ما يحافظ على النطاق المتفق عليه ويُبقي الجميع على اطّلاع." },
    workflow: { k: { "مخطط": 3, "تدفق": 3, "رسوم": 2, "خرائط": 2 }, p: ["سير العمل", "خرائط العمليات", "مخططات سير"],
      a: "يصمّم عمر مخططات سير العمل للوضع الحالي (As-Is، أي كيف يجري العمل اليوم) وللوضع المستقبلي (To-Be، أي العملية المقترحة الأبسط). تساعد هذه المخططات أصحاب المصلحة والمطورين على الاتفاق على طريقة سير العملية." },
    testing: { k: { "اختبار": 4, "فحص": 3, "جوده": 2, "مطورين": 3, "المطور": 2, "ازور": 3 },
      p: ["حالات الاختبار", "معايير القبول", "مع المطورين"],
      a: "يبقى عمر مشاركاً خلال مرحلة البناء: يدير المتطلبات وقائمة المهام (Backlog) في Azure DevOps، ثم يكتب حالات الاختبار وينفّذها للتحقق من كل ميزة وفق معايير القبول قبل إطلاقها." },
    skills: { k: { "مهارات": 4, "مهاره": 4, "قدرات": 3, "اختصاص": 3, "تخصص": 2 },
      p: ["نقاط القوه", "اصحاب المصلحه", "شو بيعرف", "ماذا يجيد", "بماذا يتميز"],
      a: "مهارات عمر الأساسية: تحليل الأعمال، وجمع المتطلبات، وتصميم الحلول، ووكلاء الذكاء الاصطناعي، وإدارة أصحاب المصلحة. وإلى جانبها: وثائق BRD، وتتبّع المتطلبات، وتحليل الفجوات، وقصص المستخدم، وتصميم العمليات، واختبار قبول المستخدم، وإدارة ورش العمل، مدعومة بشهادة في علوم الحاسوب." },
    tools: { k: { "ادوات": 4, "اداه": 4, "برامج": 3, "برنامج": 2, "يستخدم": 2, "بيستعمل": 2 },
      p: ["هل يعرف", "هل يستخدم", "بيعرف يستعمل", "اي ادوات", "ما الادوات"],
      a: "أدوات عمر الأساسية: Claude وClaude Code وMCP لصياغة المستندات وبناء النماذج الأولية، وWispr Flow لتوثيق الاجتماعات، وAzure DevOps للمتطلبات وقوائم المهام وحالات الاختبار. وتعمل مشاريعه على Microsoft Dynamics 365 وPower Platform وLiferay DXP. للسؤال عن أي أداة أخرى، يمكنك مراسلة عمر مباشرة على {email}." },
    education: { k: { "تعليم": 4, "دراس": 4, "درس": 3, "جامع": 4, "بكالوريوس": 4, "تخرج": 4, "علوم": 2, "حاسوب": 2, "كمبيوتر": 2, "عميد": 3, "معدل": 2 },
      p: ["علوم الحاسوب", "لائحه الشرف", "قائمه الشرف", "الجامعه اللبنانيه الدوليه", "وين درس", "اين درس"],
      a: "درس عمر بكالوريوس علوم الحاسوب في الجامعة اللبنانية الدولية (LIU) من 2023 إلى 2026، ودخل لائحة الشرف (Dean's Honor List) ثلاث مرات: ربيع 2024، وربيع 2025، وخريف 2025." },
    certs: { k: { "شهاد": 4, "دورات": 4, "كورس": 4, "اعتماد": 3, "معتمد": 3, "انثروبيك": 4, "سيسكو": 4 },
      p: [],
      a: "يحمل عمر سبع شهادات من Anthropic:\n- Claude 101 وClaude Platform 101 وAI Fluency for Builders وAI Fluency for Creative Work وDeploying Claude Enterprise with Confidence (أكتوبر 2026)\n- Claude Code 101 وClaude Code in Action (أغسطس 2026)\nيمكن التحقق من كل منها في قسم Background في هذه الصفحة. ويحمل أيضاً Cisco CCNA I وJavaScript Fundamentals (2025)." },
    experience: { k: { "خبره": 4, "خبرت": 4, "سنوات": 3, "سنين": 3, "مسيره": 3, "متدرب": 4, "تدريب": 3, "بدا": 2, "قديش": 1, "منذ": 1 },
      p: ["كم سنه", "قديش صرله", "متي بدا", "منذ متي"],
      a: "انضم عمر إلى Netways متدرّباً في تحليل الأعمال في ديسمبر 2025، ثم انتقل إلى وظيفة محلل أعمال بدوام كامل في مارس 2026. ومنذ ذلك الحين عمل مع ستة عملاء في الإمارات والسعودية، منهم هيئة سوق رأس المال (الإمارات) وبنك البلاد وشيفرون فيليبس السعودية." },
    location: { k: { "يقيم": 4, "مقيم": 4, "ساكن": 4, "يسكن": 4, "عايش": 3, "يعيش": 3, "لبنان": 4, "بيروت": 4, "بلد": 3, "مدين": 3, "سفر": 3, "انتقال": 3, "موقع": 1, "وين": 1, "اين": 1 },
      p: ["عن بعد", "من وين", "من اين"],
      a: "يقيم عمر في لبنان ويعمل عن بُعد مع عملاء في الإمارات والسعودية. أما الانتقال أو السفر فمن الأفضل سؤاله مباشرة على {email}." },
    contact: { k: { "تواصل": 4, "اتواصل": 4, "اتصال": 4, "اتصل": 4, "ايميل": 4, "بريد": 4, "رقم": 3, "هاتف": 4, "تلفون": 4, "موبايل": 4, "جوال": 4, "واتساب": 4, "لينكد": 4, "راسل": 3, "مراسل": 3 },
      p: ["كيف اوصل", "كيف بقدر احكي", "كيف احكي معه", "كيف احكي مع"],
      a: "أسرع طريقة هي البريد الإلكتروني: {email}. يمكنك أيضاً الاتصال به على {phone} أو التواصل معه على {linkedin}. سيسعده أن يسمع منك." },
    cv: { k: { "سيره": 5, "سيرت": 5, "ذاتي": 2, "تحميل": 3, "تنزيل": 3, "نزل": 2 },
      p: ["السيره الذاتيه", "سي في"],
      a: "يمكنك تحميل سيرة عمر الذاتية من هنا: {cv}. تغطي خبرته في Netways ومهاراته وتعليمه وجميع شهاداته، بما فيها الشهادات السبع من Anthropic." },
    availability: { k: { "متاح": 4, "متوفر": 4, "توظيف": 4, "نوظف": 2, "راتب": 4, "اجر": 3, "سعر": 3, "تكلف": 3, "فرص": 3, "فرصه": 3, "شاغر": 3 },
      p: ["عمل حر", "فريلانس", "وظيفه جديده", "عرض عمل", "منفتح على"],
      a: "هذا سؤال لعمر نفسه، فليست لديّ معلومات عن توفّره أو أجوره أو الفرص الجديدة. راسله على {email} وسيردّ عليك." },
    languages: { k: { "لغات": 4, "لغه": 4, "عربي": 3, "انجليزي": 3, "انكليزي": 3, "فرنسي": 3, "يتكلم": 3, "بيحكي": 3, "يتحدث": 2 },
      p: [],
      a: "يتحدث عمر ثلاث لغات: العربية والإنجليزية والفرنسية. يمكنك أن تسألني بالعربية أو بالإنجليزية." },
    personal: { k: { "عمره": 4, "هوايات": 4, "هوايه": 4, "متزوج": 4, "زوج": 3, "عائل": 3, "عيلت": 3, "ديان": 4, "جنسي": 3, "فراغ": 3, "رياض": 3 },
      p: ["كم عمر", "قديش عمر", "عيد ميلاد", "خارج العمل"],
      a: "أعرف فقط الجانب المهني من عمر: عمله ومشاريعه ومهاراته وتعليمه. لأي شيء آخر، يمكنك مراسلته على {email}." },
    why: { k: { "لماذا": 2, "ليش": 2, "ليه": 2, "يميز": 3, "مميز": 3, "قيمه": 2, "نوظف": 2 },
      p: ["لماذا نوظف", "ليش نوظف", "ما الذي يميز", "شو بيميز", "لماذا اختار", "ليش اختار"],
      a: "باختصار: يستطيع أن يقود الحوار مع العميل، وأن يساعد في بناء ما ينتج عنه. يطرح الأسئلة التفصيلية التي تكشف كيف تسير العملية فعلاً، ويستخدم الذكاء الاصطناعي ليحوّلها بسرعة إلى متطلبات واضحة ونماذج أولية عملية، ويبقى مع المطورين حتى الاختبار. وهذا بالضبط ما يفعله اليوم في برنامج هيئة سوق رأس المال في الإمارات." },
    site: { k: { "موقع": 2, "تصميم": 2, "انيميشن": 3, "بلندر": 4, "ثلاثي": 3 },
      p: ["هذا الموقع", "بناء الموقع", "مين عمل الموقع", "من صمم", "كيف تم بناء", "كيف بني"],
      a: "بنى عمر هذا الموقع بالكامل باستخدام Claude Code. تعتمد المؤثرات ثلاثية الأبعاد وحركة التمرير على Three.js وGSAP، وصُمّم الخيط المعدني ومجسّمات المخرجات في Blender عبر MCP، وتُعرض طريقة عمله كمسارات BPMN (العميل، عمر، وكلاء الذكاء الاصطناعي، المطورون) يتحرك بينها رمز مع التمرير." },
    rcjy: { k: { "الجبيل": 5, "ينبع": 5, "الملكيه": 3, "مؤشرات": 3 },
      p: ["الهيئه الملكيه"],
      a: "للهيئة الملكية للجبيل وينبع (السعودية)، ومن خلال Netways مع Omnix International، شارك عمر في كتابة وثيقة BRD لمنصة حوكمة مؤشرات الأداء على Liferay DXP. تستبدل المنصة التقارير عبر Excel والبريد بسير عمل للتقديم والمراجعة والاعتماد لنحو 100 مؤشر استراتيجي في أربع مدن صناعية، منها لوحة للوزير. تضم الوثيقة 37 حالة استخدام، منها حالات لمؤشرات الأداء تحدد المعادلات والتكرار والاعتماد حسب الدور." },
    schem: { k: { "شيفرون": 5, "فيليبس": 4, "بتروكيم": 3, "تصاريح": 3 },
      p: [],
      a: "لشركة شيفرون فيليبس السعودية (S-Chem)، وهي مشروع مشترك للبتروكيماويات في الجبيل، تعمل Netways على تحديث 25 تطبيقاً لخدمات الموظفين والصحة والسلامة والبيئة على Liferay DXP. شارك عمر في 16 ورشة لجمع المتطلبات، وكتب أو شارك في كتابة 10 من أصل 18 وثيقة BRD تغطي 13 تطبيقاً، منها تصاريح الدخول وتصريح خروج المواد وتحليل سلامة العمل وإخلاء الطرف ومراجعة المستندات وطلبات الصيانة الدورية. ثم راجعها بعد ملاحظات أصحاب المصلحة وحوّلها إلى قوائم مهام في Azure DevOps." },
    albilad: { k: { "البلاد": 5, "الرد الصوتي": 3 },
      p: ["بنك البلاد"],
      a: "لبنك البلاد (السعودية)، عمل عمر على المرحلة الأولى من مساعد ذكي بالعربية والإنجليزية ونظام رد صوتي تفاعلي عبر القنوات الرقمية والصوتية للبنك: 14 قناة ضمن خارطة طريق من أربع مراحل. شمل عمله وثيقة BRD للمرحلة الأولى، ومسار الاستفسارات من البداية إلى النهاية (تحديد النية والتحقق من نطاق المعرفة والتحويل إلى موظف)، ومصفوفة تتبّع من 78 متطلباً و49 حالة استخدام." },
    sdb: { k: { "التنميه": 5, "الاجتماعيه": 4, "تمويل": 3 },
      p: ["بنك التنميه"],
      a: "لبنك التنمية الاجتماعية (السعودية)، تعمل Netways على أتمتة منتجات التمويل على Microsoft Dynamics 365 بمحركات قواعد عمل وسير عمل ونماذج بدون برمجة. أعدّ عمر مواد تدريبية بالعربية للمستخدمين على هذه المحركات، متوافقة مع المواصفات الوظيفية (28 حالة استخدام و22 دوراً للمستخدمين)." },
    ncgr: { k: { "الموارد": 4, "الحكوميه": 3, "المركز الوطني": 4 },
      p: ["نظم الموارد"],
      a: "للمركز الوطني لنظم الموارد الحكومية (السعودية)، عمل عمر على تحسينات البوابة الداخلية للموظفين: قصص مستخدم بالعربية مع معايير القبول وتصاميم الشاشات المرتبطة بها، لمسار الإقرار بالسياسات وسجل للمراجعين مع التصفية والتصدير." },
    bot: { k: { "روبوت": 3, "بوت": 3, "مساعد": 3, "انسان": 2, "حقيقي": 2 },
      p: ["من انت", "مين انت", "ما انت", "شو انت", "هل انت", "كيف تعرف"],
      a: "أنا المساعد في موقع عمر. أجيب من ملف معتمد وافق عليه عمر، فإذا لم أكن أعرف شيئاً سأقول ذلك بدلاً من التخمين." }
  };
  var SMALL_AR = {   // checked in this order: "مع السلامة" must not be read as a greeting
    bye: { k: ["مع السلامه", "باي", "وداعا", "الى اللقاء", "بخاطرك"],
      a: "شكراً لزيارتك! إذا أردت التواصل مع عمر، راسله على {email}" },
    thanks: { k: ["شكرا", "مشكور", "يعطيك", "تسلم", "ممتاز", "رائع", "حلو", "تمام", "اوك", "جميل"],
      a: "عفواً! هل تودّ معرفة شيء آخر عن عمر؟" },
    greeting: { k: ["مرحبا", "اهلا", "السلام", "سلام", "هاي", "هلا", "صباح", "مساء", "مرحبتين"],
      a: "أهلاً وسهلاً! أنا مساعد عمر. اسألني عن عمله أو مشاريعه أو طريقة عمله أو كيف تتواصل معه." }
  };
  var FALLBACK_AR = "لست متأكداً من هذه. أجيب فقط من ملف عمر المعتمد، لذلك لن أخمّن. جرّب أحد هذه الأسئلة، أو اسأل عمر مباشرة على {email}";
  var CHIPS_AR = { rcjy: "حدّثني عن الهيئة الملكية للجبيل وينبع", schem: "حدّثني عن شيفرون فيليبس", albilad: "حدّثني عن بنك البلاد", sdb: "حدّثني عن بنك التنمية الاجتماعية", ncgr: "حدّثني عن المركز الوطني لنظم الموارد الحكومية",
    about: "من هو عمر؟", role: "ماذا يعمل عمر؟", netways: "حدّثني عن Netways", current: "على ماذا يعمل عمر حالياً؟",
    previous: "مشروعه السابق", projects: "ما المشاريع التي عمل عليها؟", method: "كيف يعمل عمر؟", ai: "كيف يستخدم عمر الذكاء الاصطناعي؟", site: "كيف بُني هذا الموقع؟",
    deliverables: "ما الذي يسلّمه؟", tools: "ما الأدوات التي يستخدمها؟", brd: "ما هي وثيقة BRD؟", rtm: "ما هي مصفوفة RTM؟", mom: "محاضر الاجتماعات؟",
    testing: "هل يقوم بالاختبار؟", skills: "ما هي مهاراته؟", education: "أين درس؟",
    certs: "ما الشهادات التي يحملها عمر؟", experience: "منذ متى يعمل محلّلاً؟", location: "أين يقيم؟",
    contact: "كيف أتواصل مع عمر؟", cv: "هل يمكنني تحميل سيرة عمر الذاتية؟", availability: "هل هو متاح لفرص جديدة؟", why: "لماذا العمل مع عمر؟"
  };
  function normAr(s) {
    return (" " + s.toLowerCase()
      .replace(/[ً-ْـ]/g, "")   // short vowels and tatweel
      .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
      .replace(/[^a-z0-9ء-ي]+/g, " ") + " ").replace(/\s+/g, " ");
  }
  INTENTS.forEach(function (it) {
    var d = AR[it.id];
    it.ka = {};
    for (var w in d.k) it.ka[normAr(w).trim()] = d.k[w];
    it.pa = d.p.map(function (ph) { return normAr(ph).trim(); });
    it.aa = d.a;
  });
  for (var sk in SMALL_AR) SMALL_AR[sk].k = SMALL_AR[sk].k.map(function (w) { return normAr(w).trim(); });
  function isArabic(text) { return /[؀-ۿ]/.test(text); }
  function classifyAr(text) {
    var n = normAr(text);
    var toks = n.trim().split(" ").filter(Boolean);
    var scored = INTENTS.map(function (it) {
      var s = 0;
      toks.forEach(function (t) {
        var best = 0, w;
        for (w in it.ka) if (t === w || (w.length >= 3 && t.indexOf(w) !== -1)) best = Math.max(best, it.ka[w]);
        for (w in it.k) if (t === w) best = Math.max(best, it.k[w]);   // English terms inside an Arabic question (BRD, Claude, CV…)
        s += best;
      });
      it.pa.forEach(function (ph) { if (n.indexOf(ph) !== -1) s += 4; });
      return { it: it, s: s };
    }).sort(function (a, b) { return b.s - a.s; });
    // small talk only when the message is short and has no real question in it
    if (toks.length <= 4 && scored[0].s < 3) {
      for (var key in SMALL_AR) if (SMALL_AR[key].k.some(function (w) { return n.indexOf(w) !== -1; })) return { small: key };
    }
    return { top: scored[0], second: scored[1] };
  }

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
  function localAnswer(text, forced) {
    var ar = isArabic(text);
    function say(it) { return ar ? it.aa : it.a; }
    if (forced && byId[forced]) { lastIntent = forced; return { text: say(byId[forced]), chips: byId[forced].f, rtl: ar }; }
    var n = ar ? normAr(text) : norm(text);
    var more = ar ? /^ (المزيد|اكثر|كمان|تابع|اكمل|تفاصيل|وبعدين|احكي اكثر|اخبرني المزيد|قل لي المزيد) $/
                  : /^ (tell me )?(more|and|go on|continue|details|elaborate|explain more|more please|what else) $/;
    if (lastIntent && more.test(n)) {
      var nxt = byId[lastIntent].f[0];
      lastIntent = nxt;
      return { text: say(byId[nxt]), chips: byId[nxt].f, rtl: ar };
    }
    var c = ar ? classifyAr(text) : classify(text);
    if (c.small) return { text: (ar ? SMALL_AR : SMALL)[c.small].a, chips: START, rtl: ar };
    if (!c.top || c.top.s < 1.8) return { text: ar ? FALLBACK_AR : FALLBACK, chips: START, miss: true, rtl: ar };
    var parts = [c.top.it];
    // two clearly asked things: answer both
    if (c.second && c.second.s >= 3 && c.second.s >= c.top.s * 0.8) parts.push(c.second.it);
    lastIntent = parts[parts.length - 1].id;
    var chips = [];
    parts.forEach(function (p) { p.f.forEach(function (f) { if (chips.indexOf(f) === -1 && parts.every(function (q) { return q.id !== f; })) chips.push(f); }); });
    return { text: parts.map(say).join("\n\n"), chips: chips.slice(0, 3), rtl: ar };
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
  // The assistant's face: the page's own process token, a lime disc riding a sequence flow, with eyes that
  // blink and follow the pointer and a mouth that moves while it greets the visitor.
  var botN = 0;
  function bot(cls) {
    var n = ++botN, w = el("span", "bot " + (cls || ""));
    w.setAttribute("aria-hidden", "true");
    w.innerHTML = '<svg viewBox="0 0 124 124">' +
      '<defs>' +
        '<radialGradient id="tc' + n + '" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#EDFFB8"/><stop offset=".55" stop-color="#C9F25B"/><stop offset="1" stop-color="#93C42C"/></radialGradient>' +
        '<marker id="ta' + n + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" class="bot__head"/></marker>' +
      '</defs>' +
      '<path class="bot__flow" d="M2 64H118" marker-end="url(#ta' + n + ')"/>' +
      '<circle class="bot__halo" cx="62" cy="62" r="52"/>' +
      '<g class="bot__turn">' +
      '<circle cx="62" cy="62" r="42" fill="url(#tc' + n + ')" class="bot__disc"/>' +
      '<ellipse cx="48" cy="40" rx="13" ry="7" fill="#fff" opacity=".35" transform="rotate(-30 48 40)"/>' +
      '<g class="bot__face">' +
      '<g class="bot__eyes"><ellipse cx="50" cy="58" rx="9" ry="10.5" fill="#fff"/><ellipse cx="76" cy="58" rx="9" ry="10.5" fill="#fff"/>' +
      '<circle class="bot__pupil" cx="52" cy="60" r="4.6"/><circle class="bot__pupil" cx="78" cy="60" r="4.6"/></g>' +
      '<path class="bot__smile" d="M55 78 q8 6.5 16 0"/>' +
      '<ellipse class="bot__talk" cx="63" cy="80" rx="5.4" ry="3.6"/>' +
      '</g></g>' +
    '</svg>';
    return w;
  }

  // The token watches the pointer. Far away, only its pupils follow it inside the eyes; once the pointer
  // comes within about 300px the whole head leans and turns toward it too. On touch screens it glances at
  // a tap, then looks ahead again. Calm motion keeps it still.
  (function () {
    var px = null, py = null, idle = null, running = false, state = new WeakMap();
    function point(e) {
      px = e.clientX; py = e.clientY;
      clearTimeout(idle);
      if (e.pointerType && e.pointerType !== "mouse") idle = setTimeout(function () { px = null; kick(); }, 1600);
      kick();
    }
    window.addEventListener("pointermove", point, { passive: true });
    window.addEventListener("pointerdown", point, { passive: true });
    document.addEventListener("mouseout", function (e) { if (!e.relatedTarget) { px = null; kick(); } });
    function kick() { if (!running) { running = true; requestAnimationFrame(tick); } }
    function ease(st, key, to, k) { st[key] += (to - st[key]) * k; return Math.abs(to - st[key]) > 0.02; }
    function tick() {
      var busy = false;
      document.querySelectorAll(".bot").forEach(function (b) {
        var pupils = b.querySelectorAll(".bot__pupil"), head = b.querySelector(".bot__turn");
        if (!pupils.length || !head) return;
        var r = b.getBoundingClientRect(), st = state.get(b) || { ex: 0, ey: 0, hx: 0, hy: 0, a: 0 };
        var ex = 0, ey = 0, hx = 0, hy = 0, a = 0;
        if (px !== null && r.width && motionOn()) {
          var dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2), d = Math.hypot(dx, dy) || 1;
          var reach = Math.min(1, d / 90);                                  // pupils travel less when the pointer is on the token
          ex = dx / d * 3.6 * reach; ey = dy / d * 3.8 * reach;
          var near = 1 - Math.min(1, Math.max(0, (d - 90) / 210));        // 1 within 90px, 0 beyond 300px
          hx = dx / d * 7 * near; hy = dy / d * 5 * near; a = dx / d * 10 * near;
        }
        busy = ease(st, "ex", ex, 0.18) | ease(st, "ey", ey, 0.18) | ease(st, "hx", hx, 0.1) | ease(st, "hy", hy, 0.1) | ease(st, "a", a, 0.1) || busy;
        state.set(b, st);
        pupils.forEach(function (pu) { pu.setAttribute("transform", "translate(" + st.ex.toFixed(2) + " " + st.ey.toFixed(2) + ")"); });
        head.setAttribute("transform", "translate(" + st.hx.toFixed(2) + " " + st.hy.toFixed(2) + ") rotate(" + st.a.toFixed(2) + " 62 62)");
      });
      if (busy) requestAnimationFrame(tick); else running = false;
    }
  })();

  var launcher = el("button", "assistant-launcher");
  launcher.type = "button";
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-controls", "assistant-panel");
  launcher.setAttribute("aria-label", "Ask about Omar: open the AI assistant");
  launcher.setAttribute("data-cursor-text", "Ask");
  launcher.appendChild(bot("bot--launcher"));
  launcher.appendChild(el("span", "sr-only", "Ask about Omar"));

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
  input.id = "assistant-input"; input.rows = 1; input.maxLength = 600; input.dir = "auto";
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
    var ar = node.lang === "ar";
    text.split("\n\n").forEach(function (para) {
      var lines = para.split("\n");
      var p = el("p"), list = null;
      lines.forEach(function (line) {
        if (/^- /.test(line)) {
          if (!list) { list = el("ul"); }
          var li = el("li"); appendRich(li, line.slice(2), ar); list.appendChild(li);
        } else {
          if (p.childNodes.length) p.appendChild(document.createTextNode(" "));
          appendRich(p, line, ar);
        }
      });
      if (p.childNodes.length) node.appendChild(p);
      if (list) node.appendChild(list);
    });
  }
  function appendRich(parent, text, ar) {
    text.split(/(\{email\}|\{linkedin\}|\{phone\}|\{cv\})/).forEach(function (bit) {
      if (bit === "{email}") { var a = el("a", null, EMAIL); a.href = "mailto:" + EMAIL; a.dir = "ltr"; parent.appendChild(a); }
      else if (bit === "{linkedin}") { var l = el("a", null, "LinkedIn"); l.href = LINKEDIN; l.target = "_blank"; l.rel = "noopener"; parent.appendChild(l); }
      else if (bit === "{phone}") { var t = el("a", null, PHONE); t.href = "tel:" + PHONE.replace(/\s/g, ""); t.dir = "ltr"; parent.appendChild(t); }
      else if (bit === "{cv}") { var c = el("a", null, ar ? "تحميل السيرة الذاتية (PDF)" : "Download CV (PDF)"); c.href = CV; c.setAttribute("download", "Omar Hazeem - Agentic Business Analyst CV.pdf"); c.setAttribute("data-cv", ""); parent.appendChild(c); }
      else if (bit) parent.appendChild(document.createTextNode(bit));
    });
  }
  function addUser(text) {
    var m = el("div", "msg msg--user"); m.dir = "auto"; m.textContent = text; log.appendChild(m); scroll();
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
  function setChips(ids, ar) {
    chipsRow.textContent = "";
    ids.forEach(function (id) {
      var text = (ar ? CHIPS_AR : CHIPS)[id];
      if (!text) return;
      var b = el("button", "chip", text); b.type = "button"; b.dir = "auto"; if (ar) b.lang = "ar";
      b.addEventListener("click", function () {
        ask(text, id);
        // the chip is removed on click, so keep keyboard focus in the panel (not on phones: no surprise keyboard)
        if (!window.matchMedia("(pointer: coarse)").matches) input.focus({ preventScroll: true }); else panel.focus({ preventScroll: true });
      });
      chipsRow.appendChild(b);
    });
    scroll();
  }

  function answerLocally(q, then, forced) {
    var r = localAnswer(q, forced);
    setTimeout(function () {
      typing(false);
      var bubble = addBot();
      if (r.rtl) { bubble.dir = "rtl"; bubble.lang = "ar"; }
      reveal(bubble, r.text, function () {
        history.push({ role: "assistant", content: r.text.replace(/\{email\}/g, EMAIL).replace(/\{linkedin\}/g, "LinkedIn").replace(/\{phone\}/g, PHONE).replace(/\{cv\}/g, "the Download CV button") }); save();
        setChips(r.chips || START, r.rtl); then();
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
                if (!bubble) { typing(false); bubble = addBot(); bubble.dir = "auto"; }
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
      setChips(START, isArabic(q)); then();
    });
  }

  function ask(q, forced) {
    q = (q || "").trim();
    if (!q || busy) return;
    busy = true; sendBtn.disabled = true;
    addUser(q);
    history.push({ role: "user", content: q.slice(0, 600) }); save();
    chipsRow.textContent = "";
    typing(true);
    var done = function () { busy = false; sendBtn.disabled = false; };
    if (endpoint) answerWithAI(q, done); else answerLocally(q, done, forced);
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); var q = input.value; input.value = ""; autosize(); ask(q); });
  input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit")); } });
  function autosize() { input.style.height = "auto"; input.style.height = Math.min(120, input.scrollHeight) + "px"; }
  input.addEventListener("input", autosize);

  /* ---------- The robot greets visitors ---------- */
  // A speech bubble beside the robot runs through greetings while its mouth moves, then settles on an invitation.
  // Clicking the bubble opens the chat; its x dismisses it for the rest of the visit.
  var GREETINGS = [
    { t: "Hi! 👋" }, { t: "Hello!" }, { t: "السلام عليكم!", rtl: true }, { t: "Bonjour!" }, { t: "Ask me about Omar", last: true }
  ];
  var hello = el("div", "assistant-say");
  hello.hidden = true;
  var helloText = el("button", "assistant-say__text");
  helloText.type = "button";
  var helloClose = el("button", "assistant-say__close");
  helloClose.type = "button"; helloClose.setAttribute("aria-label", "Dismiss the greeting");
  helloClose.appendChild(svg(ICON.close));
  hello.appendChild(helloText); hello.appendChild(helloClose);
  document.body.appendChild(hello);
  var sayTimer = null, sayStep = 0, sayDone = false, mouthTimer = null;
  try { sayDone = sessionStorage.getItem("oh-hello") === "1"; } catch (e) {}
  function setLine(g) {
    helloText.textContent = g.t;
    helloText.dir = g.rtl ? "rtl" : "ltr";
    hello.classList.toggle("is-invite", !!g.last);
    hello.classList.remove("is-pop"); void hello.offsetWidth; hello.classList.add("is-pop");
    if (motionOn()) {   // the mouth moves while a line is "spoken"
      launcher.classList.add("is-talking");
      clearTimeout(mouthTimer); mouthTimer = setTimeout(function () { launcher.classList.remove("is-talking"); }, 900);
    }
  }
  function hideHello(forever) {
    clearTimeout(sayTimer);
    launcher.classList.remove("is-talking");
    if (forever) { sayDone = true; try { sessionStorage.setItem("oh-hello", "1"); } catch (e) {} }
    if (hello.hidden) return;
    hello.classList.remove("is-shown");
    setTimeout(function () { if (!hello.classList.contains("is-shown")) hello.hidden = true; }, motionOn() ? 300 : 0);
  }
  function launcherVisible() { var cs = getComputedStyle(launcher); return cs.visibility !== "hidden" && parseFloat(cs.opacity) > 0.5; }
  function showHello(tries, fromStart) {
    if (!panel.hidden || sayDone) return;
    // on phones the bubble would sit over the hero buttons, so it waits until the visitor has scrolled a little
    var heroInTheWay = window.matchMedia("(max-width: 767px)").matches && window.scrollY < window.innerHeight * 0.45;
    if (!launcherVisible() || heroInTheWay) { if (tries < 40) sayTimer = setTimeout(function () { showHello(tries + 1, fromStart); }, 1500); return; }
    clearTimeout(sayTimer);
    hello.hidden = false;
    requestAnimationFrame(function () { hello.classList.add("is-shown"); });
    sayStep = fromStart ? 0 : GREETINGS.length - 1;
    (function next() {
      setLine(GREETINGS[sayStep]);
      if (GREETINGS[sayStep].last) { sayTimer = setTimeout(function () { hideHello(false); }, 7000); return; }
      sayStep++; sayTimer = setTimeout(next, motionOn() ? 1700 : 2200);
    })();
  }
  helloText.addEventListener("click", function () { hideHello(true); open(); });
  helloClose.addEventListener("click", function () { hideHello(true); });
  // hovering the robot brings the invitation back
  launcher.addEventListener("mouseenter", function () { if (panel.hidden && !sayDone && hello.hidden) showHello(0, false); });
  setTimeout(function () { showHello(0, true); }, 2500);

  /* ---------- Open / close ---------- */
  var started = false;
  function open() {
    hideHello(true);
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
        renderInto(hi, "Hi! \uD83D\uDC4B I'm Omar's AI assistant. Pick a question below, or type your own in English or Arabic.");
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
