/* School Activity Hub portfolio prototype — shared data and UI.
   Every option page uses this file, so an entry added in one shows up in the others.
   Data lives in this browser only (localStorage). */
(function () {
  const KEY = "sah-portfolio-prototype-v1";
  const CLUBS = ["Robotics Club", "Debate Club", "Volunteers Union"];
  const SKILLS = ["Teamwork", "Arduino", "Public speaking", "Design", "Leadership", "Research", "Writing", "Problem solving"];
  const KINDS = {
    reflection: { label: "Reflection", hint: "A few honest lines about what happened and what you learned." },
    photos: { label: "Photos", hint: "Pictures from an activity, with a short caption." },
    project: { label: "Project", hint: "Something you made or built, and how you did it." },
    achievement: { label: "Achievement", hint: "A medal, certificate, role or milestone." },
  };
  const VIS = {
    me: { label: "Only me", hint: "Private notes. Nobody else sees them." },
    teachers: { label: "Teachers", hint: "Your teachers and club advisors at school." },
    school: { label: "My school", hint: "Teachers and students at your school." },
  };
  const PROMPTS = [
    "What did I do?",
    "What was hard?",
    "What surprised me?",
    "What did I learn?",
    "What would I do differently?",
    "What will I do next?",
  ];

  const ICONS = {
    reflection: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>',
    photos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 8"/></svg>',
    project: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>',
    achievement: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 21l5-3 5 3-1.5-7"/></svg>',
  };

  // Illustrations standing in for students' own photos in the sample data.
  const ART = {
    robot: '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A line-following robot on a test track"><rect width="400" height="300" fill="#e3e6f7"/><rect y="200" width="400" height="100" fill="#d7dcef"/><path d="M-10 255 C 90 215, 170 290, 260 240 S 380 220, 420 250" stroke="#16140f" stroke-width="10" fill="none"/><rect x="140" y="135" width="130" height="70" rx="12" fill="#2340d9"/><rect x="150" y="120" width="110" height="22" rx="6" fill="#16140f"/><circle cx="165" cy="210" r="18" fill="#16140f"/><circle cx="245" cy="210" r="18" fill="#16140f"/><circle cx="165" cy="210" r="7" fill="#ffc23d"/><circle cx="245" cy="210" r="7" fill="#ffc23d"/><rect x="175" y="150" width="60" height="30" rx="4" fill="#ffc23d"/><circle cx="190" cy="165" r="5" fill="#16140f"/><circle cx="220" cy="165" r="5" fill="#16140f"/><rect x="198" y="92" width="6" height="30" fill="#16140f"/><circle cx="201" cy="88" r="9" fill="#ff6b4a"/><circle cx="330" cy="70" r="34" fill="#ffc23d" opacity="0.9"/></svg>',
    medal: '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A bronze medal on a ribbon"><rect width="400" height="300" fill="#fff3d1"/><path d="M160 0 L200 130 L240 0 Z" fill="#2340d9"/><path d="M190 0 L200 130 L210 0 Z" fill="#ff6b4a"/><circle cx="200" cy="185" r="70" fill="#c9824a"/><circle cx="200" cy="185" r="52" fill="#e0a06a"/><text x="200" y="205" text-anchor="middle" font-family="PT Serif, Georgia, serif" font-size="56" font-weight="700" fill="#7a4a22">3</text></svg>',
    river: '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Students collecting litter by a river"><rect width="400" height="300" fill="#cfe3ff"/><path d="M0 140 L90 70 L160 130 L240 60 L330 125 L400 90 L400 170 L0 170 Z" fill="#9fb7d8"/><rect y="160" width="400" height="140" fill="#8bc39b"/><path d="M-20 230 C 80 200, 160 260, 260 225 S 380 210, 420 230 L420 300 L-20 300 Z" fill="#5b9bd5"/><circle cx="110" cy="150" r="11" fill="#16140f"/><rect x="100" y="162" width="20" height="40" rx="8" fill="#ff6b4a"/><circle cx="170" cy="155" r="11" fill="#16140f"/><rect x="160" y="167" width="20" height="38" rx="8" fill="#2340d9"/><circle cx="290" cy="148" r="11" fill="#16140f"/><rect x="280" y="160" width="20" height="40" rx="8" fill="#ffc23d"/><ellipse cx="135" cy="205" rx="14" ry="18" fill="#2b2b2b"/><ellipse cx="315" cy="203" rx="14" ry="18" fill="#2b2b2b"/><ellipse cx="335" cy="208" rx="12" ry="15" fill="#2b2b2b"/></svg>',
    bags: '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Full litter bags piled on grass"><rect width="400" height="300" fill="#cfe3ff"/><rect y="150" width="400" height="150" fill="#8bc39b"/><ellipse cx="120" cy="215" rx="55" ry="60" fill="#2b2b2b"/><ellipse cx="210" cy="225" rx="50" ry="52" fill="#3a3a3a"/><ellipse cx="290" cy="212" rx="58" ry="62" fill="#2b2b2b"/><path d="M110 158 l10 -18 l10 18 M200 175 l10 -16 l10 16 M282 152 l10 -18 l10 18" stroke="#ffc23d" stroke-width="6" fill="none"/></svg>',
    poster: '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A workshop poster pinned to a wall"><rect width="400" height="300" fill="#e9e4da"/><rect x="110" y="25" width="180" height="250" rx="6" fill="#2340d9"/><circle cx="250" cy="70" r="26" fill="#ffc23d"/><rect x="130" y="120" width="140" height="16" rx="3" fill="#ffffff"/><rect x="130" y="144" width="110" height="16" rx="3" fill="#ffffff"/><rect x="130" y="180" width="120" height="8" rx="3" fill="#e3e6f7"/><rect x="130" y="196" width="90" height="8" rx="3" fill="#e3e6f7"/><rect x="130" y="230" width="60" height="26" rx="13" fill="#ff6b4a"/><circle cx="200" cy="30" r="7" fill="#ff6b4a"/></svg>',
    concert: '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Morin khuur cases backstage under stage lights"><rect width="400" height="300" fill="#1c2540"/><path d="M60 0 L120 300 L0 300 Z" fill="#ffc23d" opacity="0.18"/><path d="M340 0 L400 300 L280 300 Z" fill="#ffc23d" opacity="0.18"/><rect y="240" width="400" height="60" fill="#2c1e14"/><g transform="rotate(6 90 200)"><rect x="90" y="70" width="46" height="175" rx="20" fill="#c98b4f"/><rect x="109" y="30" width="8" height="60" fill="#7a4a22"/></g><g transform="rotate(-4 170 200)"><rect x="170" y="70" width="46" height="175" rx="20" fill="#c98b4f"/><rect x="189" y="30" width="8" height="60" fill="#7a4a22"/></g><g transform="rotate(6 250 200)"><rect x="250" y="70" width="46" height="175" rx="20" fill="#c98b4f"/><rect x="269" y="30" width="8" height="60" fill="#7a4a22"/></g></svg>',
    notebook: '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="An open build notebook with sketches"><rect width="400" height="300" fill="#fff3d1"/><rect x="60" y="40" width="140" height="220" rx="6" fill="#ffffff"/><rect x="200" y="40" width="140" height="220" rx="6" fill="#fffdf6"/><rect x="196" y="40" width="8" height="220" fill="#e2dccd"/><rect x="78" y="70" width="70" height="4" rx="2" fill="#c8cede"/><rect x="78" y="92" width="100" height="4" rx="2" fill="#c8cede"/><rect x="78" y="114" width="100" height="4" rx="2" fill="#c8cede"/><rect x="78" y="136" width="70" height="4" rx="2" fill="#c8cede"/><rect x="78" y="158" width="100" height="4" rx="2" fill="#c8cede"/><rect x="78" y="180" width="100" height="4" rx="2" fill="#c8cede"/><circle cx="270" cy="110" r="34" fill="none" stroke="#2340d9" stroke-width="4"/><path d="M230 190 h80 M240 210 h60" stroke="#ff6b4a" stroke-width="4"/><path d="M250 110 h40 M270 90 v40" stroke="#2340d9" stroke-width="3"/></svg>',
    debate: '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Two speech bubbles"><rect width="400" height="300" fill="#e3e6f7"/><rect x="60" y="70" width="170" height="90" rx="20" fill="#2340d9"/><rect x="170" y="140" width="170" height="90" rx="20" fill="#ff6b4a"/></svg>',
  };

  function seed() {
    return {
      profile: {
        name: "Nomin-Erdene Ulziibat",
        initials: "NU",
        grade: "Grade 11B · Khangai High School",
        headline: "I build robots, argue for a living, and pick up litter on weekends.",
        about: "Robotics club leader since Grade 10. I like turning a rough idea into something that works, then explaining it to people who weren't in the room.",
        featuredId: "e1",
      },
      chapters: [
        { id: "c1", name: "Robotics Club", role: "Leader", since: "2025-09-01", goal: "Take a robot to a real competition, and teach two new members to build their own.", color: "primary",
          growth: [{ skill: "Teamwork", from: 2, to: 4 }, { skill: "Arduino", from: 1, to: 4 }, { skill: "Public speaking", from: 2, to: 3 }] },
        { id: "c2", name: "Debate Club", role: "Member", since: "2026-02-01", goal: "Speak in the final round of one tournament.", color: "coral",
          growth: [{ skill: "Public speaking", from: 2, to: 3 }, { skill: "Research", from: 2, to: 3 }] },
        { id: "c3", name: "Volunteers Union", role: "Member", since: "2026-09-01", goal: "Help at one clean-up a month.", color: "green", growth: [] },
        { id: "c4", name: "Personal projects", role: "", since: "", goal: "", color: "sun", growth: [] },
      ],
      entries: [
        { id: "e1", kind: "project", title: "Line-following robot, version 3", date: "2026-10-01", club: "Robotics Club", visibility: "school", draft: false,
          body: "We rebuilt the sensor bar three times. Version 3 finally held the line at full speed and took bronze at the inter-province competition.",
          prompts: { did: "Led a team of four to rebuild our line-following robot. I owned the sensor bar and the race-day checklist.", learned: "Our first two sensor bars drifted in bright light. I learned to test in the real venue's conditions, not just our classroom.", next: "Run the Arduino workshop for new members and write up our build notebook as a guide." },
          photos: ["art:robot", "art:medal", "art:notebook"], skills: ["Arduino", "Teamwork"],
          feedback: [{ by: "Ms. Sarantuyaa", role: "Robotics advisor", text: "Great write-up of your testing. Next time, add what you would change for version 4." }] },
        { id: "e2", kind: "reflection", title: "What losing the semi-final taught me", date: "2026-09-25", club: "Debate Club", visibility: "teachers", draft: false,
          body: "I prepared every argument except the obvious one. Next time I'll ask a teammate to attack my case before the judges do.", photos: [], skills: ["Public speaking"], feedback: [] },
        { id: "e3", kind: "photos", title: "Tuul river clean-up", date: "2026-09-18", club: "Volunteers Union", visibility: "school", draft: false,
          body: "Thirty of us, 120 bags, one very muddy Saturday.", photos: ["art:river", "art:bags"], skills: [], feedback: [] },
        { id: "e4", kind: "project", title: "Poster for the Arduino beginners workshop", date: "2026-10-07", club: "Robotics Club", visibility: "school", draft: false,
          body: "My first poster that people actually stopped to read. 14 sign-ups in two days.", photos: ["art:poster"], skills: ["Design"], feedback: [] },
        { id: "e5", kind: "photos", title: "Backstage at the autumn concert", date: "2026-09-11", club: null, visibility: "me", draft: false,
          body: "Not my club, but I helped carry the morin khuur cases.", photos: ["art:concert"], skills: [], feedback: [] },
        { id: "e6", kind: "reflection", title: "Why I keep a build notebook", date: "2026-08-30", club: "Robotics Club", visibility: "teachers", draft: false,
          body: "Writing down every failed attempt felt slow at first. Now it's the first thing new members ask to read.", photos: ["art:notebook"], skills: ["Leadership"],
          feedback: [{ by: "Ms. Sarantuyaa", role: "Robotics advisor", text: "Could you share a page of it at the next club meeting?" }] },
        { id: "e7", kind: "achievement", title: "Bronze medal, inter-province robotics", date: "2026-10-01", club: "Robotics Club", visibility: "school", draft: false,
          body: "Third place out of 14 teams in the line-following category.", photos: ["art:medal"], skills: [], feedback: [] },
        { id: "e8", kind: "reflection", title: "Ideas for the debate club's next term", date: "2026-10-09", club: "Debate Club", visibility: "me", draft: true,
          body: "Mock rounds with Grade 9s? Need to ask Mr. Tumurbaatar.", photos: [], skills: [], feedback: [] },
      ],
    };
  }

  let state;
  let storageOk = true;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? JSON.parse(raw) : seed();
  } catch (e) {
    storageOk = false;
    state = seed();
  }
  if (!state || !Array.isArray(state.entries)) state = seed();

  function save() {
    if (!storageOk) return true;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      toast("This browser is out of space. Remove a few photos and try again.");
      return false;
    }
  }

  let viewAs = "me";
  try { viewAs = sessionStorage.getItem(KEY + "-view") || "me"; } catch (e) {}

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const fmtDate = (iso, opts) => (iso ? new Date(iso + "T12:00:00").toLocaleDateString("en-GB", opts || { day: "numeric", month: "short", year: "numeric" }) : "");
  const monthOf = (iso) => fmtDate(iso, { month: "long", year: "numeric" });
  const today = () => new Date().toISOString().slice(0, 10);

  function canSee(entry, who) {
    if (who === "me") return true;
    if (entry.draft) return false;
    if (who === "teacher") return entry.visibility === "teachers" || entry.visibility === "school";
    return entry.visibility === "school";
  }
  function visibleEntries(who) {
    return state.entries.filter((e) => canSee(e, who || viewAs)).sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id.localeCompare(a.id));
  }
  const isOwner = () => viewAs === "me";

  function media(photo, alt) {
    if (!photo) return "";
    if (photo.startsWith("art:")) return ART[photo.slice(4)] || "";
    return `<img src="${photo}" alt="${esc(alt || "Photo")}" loading="lazy">`;
  }
  function bodyText(e) {
    if (e.body) return e.body;
    if (e.prompts) return [e.prompts.did, e.prompts.learned, e.prompts.next].filter(Boolean).join(" ");
    return "";
  }

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    let el = document.querySelector(".toast");
    if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  // ---------- Dialog helper ----------
  function openSheet(html, { wide = false, onMount } = {}) {
    const d = document.createElement("dialog");
    d.className = "sheet" + (wide ? " wide" : "");
    d.innerHTML = html;
    document.body.appendChild(d);
    d.addEventListener("close", () => d.remove());
    d.addEventListener("click", (ev) => {
      if (ev.target === d) d.close();
      if (ev.target.closest("[data-close]")) d.close();
    });
    d.showModal();
    if (onMount) onMount(d);
    return d;
  }

  function confirmSheet(title, text, okLabel, onOk) {
    openSheet(`<div class="sheet-head"><h2 class="display" style="font-size:1.35rem">${esc(title)}</h2><button class="close" data-close aria-label="Close">×</button></div>
      <div class="sheet-body"><p>${esc(text)}</p></div>
      <div class="sheet-foot"><button class="btn" data-close>Cancel</button><button class="btn btn-danger" data-ok>${esc(okLabel)}</button></div>`, {
      onMount(d) { d.querySelector("[data-ok]").addEventListener("click", () => { d.close(); onOk(); }); },
    });
  }

  // ---------- Image upload (resized in the browser) ----------
  function resize(file, max = 1280) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) return reject(new Error("Only image files can be added."));
      const r = new FileReader();
      r.onerror = () => reject(new Error("Couldn't read that file."));
      r.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("That image couldn't be opened."));
        img.onload = () => {
          const s = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.8));
        };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }

  // ---------- Composer ----------
  function openComposer(opts = {}) {
    const editing = opts.entry ? state.entries.find((e) => e.id === opts.entry) : null;
    const guided = opts.guided ?? Boolean(editing?.prompts);
    const draft = editing
      ? JSON.parse(JSON.stringify(editing))
      : { id: uid(), kind: opts.kind || "reflection", title: "", body: "", date: today(), club: opts.club ?? null, visibility: "teachers", draft: false, photos: [], skills: [], feedback: [], prompts: guided ? { did: "", learned: "", next: "" } : null };
    if (guided && !draft.prompts) draft.prompts = { did: draft.body || "", learned: "", next: "" };

    const clubs = [...CLUBS, ...state.chapters.filter((c) => !CLUBS.includes(c.name) && c.name !== "Personal projects").map((c) => c.name)];
    const html = `
      <div class="sheet-head"><h2 class="display" style="font-size:1.4rem">${editing ? "Edit entry" : "Add to your portfolio"}</h2><button class="close" data-close aria-label="Close">×</button></div>
      <form class="sheet-body" id="composer" novalidate>
        <div class="field"><span>What are you adding?</span>
          <div class="kinds" role="group" aria-label="Type">${Object.entries(KINDS).map(([k, v]) => `<button type="button" data-kind="${k}" aria-pressed="${draft.kind === k}">${ICONS[k]}${v.label}</button>`).join("")}</div>
          <small id="kindHint">${KINDS[draft.kind].hint}</small>
        </div>
        <label class="field"><span>Title</span><input class="input" id="f-title" maxlength="90" value="${esc(draft.title)}" placeholder="e.g. Our first robot that moved on its own"></label>
        <div class="field" id="photoField"><span>Photos <small id="photoNeed"></small></span>
          <div class="drop" id="drop" tabindex="0" role="button" aria-label="Add photos">Drop photos here, or <u>choose from your device</u><br><small>Up to 6 photos. They are resized before saving.</small></div>
          <input type="file" id="f-files" accept="image/*" multiple hidden>
          <div class="thumbs" id="thumbs"></div>
        </div>
        ${guided ? `
          <label class="field"><span>What did I do?</span><textarea class="textarea" id="p-did" style="min-height:80px">${esc(draft.prompts.did)}</textarea></label>
          <label class="field"><span>What was hard, and what did I learn?</span><textarea class="textarea" id="p-learned" style="min-height:80px">${esc(draft.prompts.learned)}</textarea></label>
          <label class="field"><span>What will I do next?</span><textarea class="textarea" id="p-next" style="min-height:80px">${esc(draft.prompts.next)}</textarea></label>` : `
          <div class="field"><label for="f-body"><span style="font-size:13px;font-weight:600">Your words</span></label>
            <textarea class="textarea" id="f-body" placeholder="Write a few lines. Stuck? Tap a question below to start.">${esc(draft.body)}</textarea>
            <div class="prompts" aria-label="Writing prompts">${PROMPTS.map((p) => `<button type="button" data-prompt="${esc(p)}">${esc(p)}</button>`).join("")}</div>
          </div>`}
        <div class="row2">
          <label class="field"><span>Club or activity</span><select class="select" id="f-club"><option value="">None</option>${clubs.map((c) => `<option ${draft.club === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
          <label class="field"><span>Date</span><input class="input" type="date" id="f-date" value="${esc(draft.date)}" max="${today()}"></label>
        </div>
        <div class="field"><span>Skills you used</span><div class="skillbox">${SKILLS.map((s) => `<button type="button" data-skill="${esc(s)}" aria-pressed="${draft.skills.includes(s)}">${esc(s)}</button>`).join("")}</div></div>
        <div class="field"><span>Who can see this?</span>
          <div class="vis">${Object.entries(VIS).map(([k, v]) => `<label><input type="radio" name="vis" value="${k}" ${draft.visibility === k ? "checked" : ""}><b>${v.label}</b><small>${v.hint}</small></label>`).join("")}</div>
        </div>
        <p class="error" id="err" hidden></p>
      </form>
      <div class="sheet-foot">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn" id="saveDraft">Save as draft</button>
        <button class="btn btn-blue" id="publish">${editing && !editing.draft ? "Save changes" : "Publish"}</button>
      </div>`;

    openSheet(html, {
      onMount(d) {
        const $ = (s) => d.querySelector(s);
        const thumbs = $("#thumbs");
        const syncKind = () => {
          d.querySelectorAll("[data-kind]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === draft.kind)));
          $("#kindHint").textContent = KINDS[draft.kind].hint;
          $("#photoNeed").textContent = draft.kind === "photos" ? "(at least one)" : "(optional)";
        };
        const drawThumbs = () => {
          thumbs.innerHTML = draft.photos.map((p, i) => `<div class="thumb">${media(p, "Photo " + (i + 1))}<button type="button" data-rm="${i}" aria-label="Remove photo ${i + 1}">×</button></div>`).join("");
        };
        syncKind(); drawThumbs();

        d.addEventListener("click", (ev) => {
          const k = ev.target.closest("[data-kind]"); if (k) { draft.kind = k.dataset.kind; syncKind(); }
          const sk = ev.target.closest("[data-skill]");
          if (sk) { const s = sk.dataset.skill; draft.skills = draft.skills.includes(s) ? draft.skills.filter((x) => x !== s) : [...draft.skills, s]; sk.setAttribute("aria-pressed", String(draft.skills.includes(s))); }
          const rm = ev.target.closest("[data-rm]"); if (rm) { draft.photos.splice(Number(rm.dataset.rm), 1); drawThumbs(); }
          const pr = ev.target.closest("[data-prompt]");
          if (pr) { const ta = $("#f-body"); ta.value = (ta.value.trim() ? ta.value.trimEnd() + "\n\n" : "") + pr.dataset.prompt + " "; ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
        });

        const fileInput = $("#f-files"), drop = $("#drop");
        const addFiles = async (files) => {
          const err = $("#err"); err.hidden = true;
          for (const f of [...files]) {
            if (draft.photos.length >= 6) { err.textContent = "You can add up to 6 photos to one entry."; err.hidden = false; break; }
            try { draft.photos.push(await resize(f)); } catch (e) { err.textContent = e.message; err.hidden = false; }
          }
          drawThumbs();
        };
        drop.addEventListener("click", () => fileInput.click());
        drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } });
        fileInput.addEventListener("change", () => { addFiles(fileInput.files); fileInput.value = ""; });
        drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
        drop.addEventListener("dragleave", () => drop.classList.remove("over"));
        drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); addFiles(e.dataTransfer.files); });

        const collect = () => {
          draft.title = $("#f-title").value.trim();
          draft.club = $("#f-club").value || null;
          draft.date = $("#f-date").value || today();
          draft.visibility = d.querySelector('input[name="vis"]:checked')?.value || "teachers";
          if (guided) {
            draft.prompts = { did: $("#p-did").value.trim(), learned: $("#p-learned").value.trim(), next: $("#p-next").value.trim() };
            draft.body = "";
          } else draft.body = $("#f-body").value.trim();
        };
        const finish = (asDraft) => {
          collect();
          const err = $("#err");
          const hasWords = draft.body || (draft.prompts && (draft.prompts.did || draft.prompts.learned || draft.prompts.next));
          let problem = "";
          if (!draft.title) problem = "Give it a title so you can find it later.";
          else if (!asDraft && draft.kind === "photos" && !draft.photos.length) problem = "Add at least one photo, or save it as a draft.";
          else if (!asDraft && draft.kind !== "photos" && !hasWords) problem = "Write a few words about it, or save it as a draft.";
          if (problem) { err.textContent = problem; err.hidden = false; return; }
          draft.draft = asDraft;
          const i = state.entries.findIndex((e) => e.id === draft.id);
          const before = i >= 0 ? state.entries[i] : null;
          if (i >= 0) state.entries[i] = draft; else state.entries.push(draft);
          if (!save()) { if (before) state.entries[i] = before; else state.entries.pop(); return; }
          d.close();
          toast(asDraft ? "Saved as a draft. Only you can see it." : editing ? "Changes saved." : `Published. Visible to: ${VIS[draft.visibility].label.toLowerCase()}.`);
          emit();
        };
        $("#saveDraft").addEventListener("click", () => finish(true));
        $("#publish").addEventListener("click", () => finish(false));
        $("#composer").addEventListener("submit", (e) => e.preventDefault());
        $("#f-title").focus();
      },
    });
  }

  // ---------- Entry detail ----------
  function openEntry(id) {
    const e = state.entries.find((x) => x.id === id);
    if (!e) return;
    const owner = isOwner();
    const photos = e.photos || [];
    const prompts = e.prompts && (e.prompts.did || e.prompts.learned || e.prompts.next);
    const html = `
      <div class="sheet-head"><div style="min-width:0"><p class="kicker" style="color:var(--primary)">${KINDS[e.kind].label}${e.club ? " · " + esc(e.club) : ""}</p><h2 class="display" style="font-size:1.5rem;margin-top:2px">${esc(e.title)}</h2></div><button class="close" data-close aria-label="Close">×</button></div>
      <div class="sheet-body">
        <div class="chips">
          <span class="pill">${fmtDate(e.date)}</span>
          ${e.draft ? '<span class="pill pill-draft">Draft</span>' : `<span class="pill pill-blue">Visible to: ${VIS[e.visibility].label}</span>`}
          ${state.profile.featuredId === e.id ? '<span class="pill pill-sun">Featured</span>' : ""}
        </div>
        ${photos.length ? `<div class="ph gallery-main" id="gmain">${media(photos[0], e.title)}</div>${photos.length > 1 ? `<div class="gallery-strip">${photos.map((p, i) => `<button type="button" data-g="${i}" aria-current="${i === 0}" aria-label="Show photo ${i + 1}" class="ph">${media(p, "")}</button>`).join("")}</div>` : ""}` : ""}
        ${prompts ? `<div style="display:grid;gap:14px">${[["What did I do?", e.prompts.did], ["What was hard, and what did I learn?", e.prompts.learned], ["What will I do next?", e.prompts.next]].filter(([, a]) => a).map(([q, a]) => `<div><p style="font-weight:600;font-size:14px">${q}</p><p class="muted" style="margin-top:2px">${esc(a)}</p></div>`).join("")}</div>` : `<p style="white-space:pre-wrap;font-size:16px;line-height:1.65">${esc(e.body)}</p>`}
        ${e.skills?.length ? `<div class="chips">${e.skills.map((s) => `<span class="pill pill-blue">${esc(s)}</span>`).join("")}</div>` : ""}
        ${(e.feedback || []).map((f) => `<div class="note"><span class="av">${esc(f.by.replace(/^(Ms|Mr|Mrs)\.\s*/, "")[0])}</span><div><p><b>${esc(f.by)}</b> <span class="muted">· ${esc(f.role)}</span></p><p style="margin-top:2px">${esc(f.text)}</p></div></div>`).join("")}
        ${owner && !e.feedback?.length && !e.draft && e.visibility !== "me" ? '<p class="muted" style="font-size:13px">No teacher notes yet. Teachers can leave a note on anything shared with them.</p>' : ""}
      </div>
      ${owner ? `<div class="sheet-foot" style="justify-content:space-between">
        <button class="btn btn-danger btn-sm" data-del>Delete</button>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${!e.draft ? `<button class="btn btn-sm" data-feature>${state.profile.featuredId === e.id ? "Unfeature" : "Feature on top"}</button>` : ""}
          <button class="btn btn-blue btn-sm" data-edit>${e.draft ? "Finish draft" : "Edit"}</button>
        </div></div>` : ""}`;
    openSheet(html, {
      wide: photos.length > 0,
      onMount(d) {
        d.addEventListener("click", (ev) => {
          const g = ev.target.closest("[data-g]");
          if (g) { d.querySelector("#gmain").innerHTML = media(photos[Number(g.dataset.g)], e.title); d.querySelectorAll("[data-g]").forEach((b) => b.setAttribute("aria-current", String(b === g))); }
          if (ev.target.closest("[data-edit]")) { d.close(); openComposer({ entry: e.id, guided: Boolean(e.prompts) }); }
          if (ev.target.closest("[data-feature]")) { state.profile.featuredId = state.profile.featuredId === e.id ? null : e.id; save(); d.close(); toast(state.profile.featuredId ? "Featured at the top of your portfolio." : "No longer featured."); emit(); }
          if (ev.target.closest("[data-del]")) { d.close(); confirmSheet("Delete this entry?", `"${e.title}" and its photos will be removed. This can't be undone.`, "Delete", () => { state.entries = state.entries.filter((x) => x.id !== e.id); if (state.profile.featuredId === e.id) state.profile.featuredId = null; save(); toast("Entry deleted."); emit(); }); }
        });
      },
    });
  }

  // ---------- Profile ----------
  function openProfile() {
    const p = state.profile;
    openSheet(`<div class="sheet-head"><h2 class="display" style="font-size:1.4rem">Edit your introduction</h2><button class="close" data-close aria-label="Close">×</button></div>
      <form class="sheet-body" id="pf">
        <p class="muted" style="font-size:14px">Your name and class come from the school. This is how you introduce yourself.</p>
        <label class="field"><span>One-line headline</span><input class="input" id="p-head" maxlength="110" value="${esc(p.headline)}"><small>A sentence that sounds like you.</small></label>
        <label class="field"><span>About me</span><textarea class="textarea" id="p-about" maxlength="400">${esc(p.about)}</textarea></label>
      </form>
      <div class="sheet-foot"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-blue" data-ok>Save</button></div>`, {
      onMount(d) {
        d.querySelector("[data-ok]").addEventListener("click", () => {
          p.headline = d.querySelector("#p-head").value.trim() || p.headline;
          p.about = d.querySelector("#p-about").value.trim();
          save(); d.close(); toast("Introduction saved."); emit();
        });
        d.querySelector("#pf").addEventListener("submit", (e) => e.preventDefault());
      },
    });
  }

  function resetDemo() {
    confirmSheet("Start over with the sample?", "Everything you added in this prototype will be removed from this browser.", "Start over", () => {
      state = seed(); save(); toast("Back to the sample portfolio."); emit();
    });
  }

  // ---------- App bar with "view as" ----------
  function appBar(optionName) {
    const views = [["me", "Me"], ["teacher", "A teacher"], ["classmate", "A classmate"]];
    return `<header class="appbar"><div class="wrap">
        <a class="brand" href="index.html" title="All options"><span class="mark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="10" r="5" fill="#ffc23d"/><path d="M2.5 20.5c2.6-4.2 5.9-6.3 9.5-6.3s6.9 2.1 9.5 6.3" stroke="#8ea2ff" stroke-linecap="round" stroke-width="3"/></svg></span><span>My portfolio <span class="muted" style="font-weight:500">· ${esc(optionName)}</span></span></a>
        <span class="spacer"></span>
        <span style="display:inline-flex;align-items:center"><span class="seg-label">View as</span><span class="seg" role="group" aria-label="View as">${views.map(([k, l]) => `<button type="button" data-view="${k}" aria-pressed="${viewAs === k}">${l}</button>`).join("")}</span></span>
      </div></header>
      ${viewAs !== "me" ? `<div class="preview-banner"><div class="wrap"><span>You're seeing your portfolio the way <b>${viewAs === "teacher" ? "a teacher" : "a classmate"}</b> would. ${viewAs === "teacher" ? "Private notes and drafts are hidden." : "Only entries shared with your school show."}</span><button class="btn btn-sm" data-view="me">Back to editing</button></div></div>` : ""}`;
  }

  // ---------- Wiring ----------
  let renderFn = () => {};
  function emit() { renderFn(); }
  function init(render) {
    renderFn = render;
    document.addEventListener("click", (ev) => {
      if (ev.target.closest("dialog")) return;
      const v = ev.target.closest("[data-view]");
      if (v) { viewAs = v.dataset.view; try { sessionStorage.setItem(KEY + "-view", viewAs); } catch (e) {} emit(); window.scrollTo({ top: 0 }); return; }
      const o = ev.target.closest("[data-open]"); if (o) { openEntry(o.dataset.open); return; }
      const a = ev.target.closest("[data-add]"); if (a) { openComposer({ kind: a.dataset.add || undefined, club: a.dataset.club || undefined, guided: a.dataset.guided === "true" }); return; }
      if (ev.target.closest("[data-profile]")) { openProfile(); return; }
      if (ev.target.closest("[data-reset]")) { resetDemo(); return; }
    });
    emit();
  }

  window.Portfolio = {
    get state() { return state; }, get viewAs() { return viewAs; },
    KINDS, VIS, ICONS, CLUBS, SKILLS, ART,
    init, emit, save, toast, esc, fmtDate, monthOf, media, bodyText, visibleEntries, isOwner, canSee,
    openComposer, openEntry, openProfile, openSheet, confirmSheet, appBar, uid,
  };
})();
