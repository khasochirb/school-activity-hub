/* Shared shell for the "Clean" draft: nav, ⋯ menus, quick find, role switch. Uses window.Site data. */
(function () {
  const S = window.Site, { esc } = S;
  const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    home: I('<path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/>'),
    events: I('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
    clubs: I('<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="7" r="2.6"/><path d="M17.5 12.6c2.2.4 3.6 2 4 4.4"/>'),
    portfolio: I('<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>'),
    students: I('<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-4 4-6 7.5-6s6.3 2 7.5 6"/>'),
    inbox: I('<path d="M3.5 13.5l2.5-8h12l2.5 8v5a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 18.5z"/><path d="M3.5 13.5h5l1 2.5h5l1-2.5h5"/>'),
    search: I('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
    dots: I('<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>'),
    plus: I('<path d="M12 5v14M5 12h14"/>'),
    check: I('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    chev: I('<path d="M9 6l6 6-6 6"/>'),
    moon: I('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
    pin: I('<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
    share: I('<path d="M12 15V3.5M7.5 8L12 3.5 16.5 8"/><path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/>'),
  };
  const role = () => S.role();
  const staff = () => ["teacher", "admin"].includes(role());
  const NAV = () => role() === "parent"
    ? [["parent", "Home", "parent.html", "home"], ["parent-portfolio", "Portfolio", "parent-portfolio.html", "portfolio"]]
    : role() === "platform"
    ? [["platform", "Platform", "platform.html", "home"], ["schools", "Schools", "platform.html#schools", "clubs"], ["connections", "Connections", "platform.html#connections", "events"], ["audit", "Audit log", "platform.html#audit", "inbox"]]
    : staff()
    ? [["home", "Home", "dashboard.html", "home"], ["events", "Events", "events.html", "events"], ["students", "Students", "students.html", "students"], ["approvals", "Approvals", "approvals.html", "inbox"]]
    : [["home", "Home", "dashboard.html", "home"], ["events", "Events", "events.html", "events"], ["clubs", "Clubs", "clubs.html", "clubs"], ["portfolio", "Portfolio", "portfolio.html", "portfolio"]];
  const MORE = () => role() === "parent"
    ? [["Announcements", "announcements.html"], ["Privacy", "privacy.html"]]
    : role() === "platform"
    ? [["Event approvals", "approvals.html"], ["Activity reports", "reports.html"], ["Privacy", "privacy.html"]]
    : staff()
    ? [["Clubs", "clubs.html"], ["Club requests", "ideas.html"], ["Invite codes", "invites.html"], ["Attendance", "attendance.html"], ["Activity reports", "reports.html"], ["Announcements", "announcements.html"], ["School news", "news.html"], ["Safety and support", "safety.html"], ...(role() === "admin" ? [["Staff accounts", "staff.html"], ["School settings", "settings.html"], ["School network", "connections.html"]] : []), ["Profile", "profile.html"], ["Privacy", "privacy.html"]]
    : [["Club ideas", "ideas.html"], ["Announcements", "announcements.html"], ["School news", "news.html"], ["Safety and support", "safety.html"], ["Profile", "profile.html"], ["Privacy", "privacy.html"]];

  function menu(items, { label = "More actions", icon = ICON.dots, button = "" } = {}) {
    return `<span class="menu">${button ? `<button type="button" class="btn btn-soft" data-menu aria-haspopup="menu" aria-expanded="false">${button}</button>` : `<button type="button" class="iconbtn" data-menu aria-haspopup="menu" aria-expanded="false" aria-label="${esc(label)}">${icon}</button>`}<span class="menu-pop" role="menu">${items.map((it) => it === "-" ? "<hr>" : it.href ? `<a role="menuitem" href="${it.href}">${esc(it.label)}${it.hint ? `<small>${esc(it.hint)}</small>` : ""}</a>` : `<button type="button" role="menuitem" ${it.danger ? 'class="danger"' : ""} data-act="${esc(it.act)}" ${it.id ? `data-id="${esc(it.id)}"` : ""}><span>${esc(it.label)}${it.hint ? `<small>${esc(it.hint)}</small>` : ""}</span></button>`).join("")}</span></span>`;
  }

  function shell(active, body) {
    const me = S.ME[role()];
    const nav = NAV();
    document.documentElement.style.removeProperty("--tint");
    document.getElementById("app").innerHTML = `
      <header class="top"><div class="wrap">
        <a class="brand" href="${role() === "platform" ? "platform.html" : role() === "parent" ? "parent.html" : "dashboard.html"}"><i><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="10" r="5" fill="#ffc23d"/><path d="M2.5 20.5c2.6-4.2 5.9-6.3 9.5-6.3s6.9 2.1 9.5 6.3" stroke="#fff" stroke-linecap="round" stroke-width="3"/></svg></i>Activity Hub</a>
        <nav class="tabs" aria-label="Main">${nav.map(([k, l, h, i]) => `<a href="${h}" ${k === active ? 'aria-current="page"' : ""}>${ICON[i]}${l}</a>`).join("")}</nav>
        <div class="right">
          <span class="clock" id="clock"></span>
          <button type="button" class="find" data-find>${ICON.search}<span>Search</span><kbd>/</kbd></button>
          ${menu([...MORE().map(([l, h]) => ({ label: l, href: h })), "-", { label: "Light / dark", act: "theme" }, { label: "Sign out", href: "landing.html" }], { label: "Account and more", icon: "", button: "" }).replace('class="iconbtn" data-menu', 'class="me" data-menu').replace('aria-label="Account and more"></button>', `aria-label="Account and more">${me.initials}</button>`)}
        </div></div></header>
      <main class="wrap page">${body}</main>
      <nav class="bottom" aria-label="Main">${nav.map(([k, l, h, i]) => `<a href="${h}" ${k === active ? 'aria-current="page"' : ""}>${ICON[i]}${l}</a>`).join("")}</nav>
      <div class="draftnote"><span>Clean draft</span><select data-role aria-label="View as">${Object.entries(S.ROLES).map(([k, l]) => `<option value="${k}" ${k === role() ? "selected" : ""}>${l}</option>`).join("")}</select><a href="index.html">All screens</a></div>`;
  }

  // ⋯ menus: one open at a time, close on outside click or Escape
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-menu]");
    document.querySelectorAll(".menu[data-open]").forEach((m) => { if (!t || m !== t.parentElement) { m.removeAttribute("data-open"); m.querySelector("[data-menu]").setAttribute("aria-expanded", "false"); } });
    if (t) { const m = t.parentElement; const open = !m.hasAttribute("data-open"); m.toggleAttribute("data-open", open); t.setAttribute("aria-expanded", String(open)); }
    if (e.target.closest('[data-act="theme"]')) { const d = document.documentElement; const dark = d.dataset.theme ? d.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; d.dataset.theme = dark ? "light" : "dark"; }
    if (e.target.closest("[data-find]")) openFind();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.querySelectorAll(".menu[data-open]").forEach((m) => m.removeAttribute("data-open"));
    if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openFind(); }
  });
  document.addEventListener("change", (e) => { if (e.target.matches("[data-role]")) { S.setRole(e.target.value); location.href = e.target.value === "platform" ? "platform.html" : e.target.value === "parent" ? "parent.html" : "dashboard.html"; } });

  // One search box for the whole site instead of a filter panel on every page
  function openFind() {
    const all = [...S.EVENTS.filter((e) => !e.past).map((e) => ({ t: e.title, s: `Event · ${S.dayShort(e.start)}`, h: `event.html#${e.id}` })), ...Object.entries(S.CLUBS).map(([k, c]) => ({ t: c.name, s: "Club", h: `club.html#${k}` })), ...(staff() ? S.STUDENTS.map((st) => ({ t: st.name, s: `Student · ${st.group}`, h: "students.html" })) : [])];
    S.sheet(`<div class="sheet-body" style="gap:10px"><label class="search" style="max-width:none;margin:0">${ICON.search}<span class="sr">Search</span><input id="findq" placeholder="Search events, clubs${staff() ? ", students" : ""}" autocomplete="off"></label><div class="rows" id="findr"></div></div>`, {
      onMount: (d) => { const q = d.querySelector("#findq"), r = d.querySelector("#findr"); const draw = () => { const v = q.value.toLowerCase(); r.innerHTML = all.filter((x) => !v || x.t.toLowerCase().includes(v)).slice(0, 8).map((x) => `<a class="row" href="${x.h}"><span class="grow"><span class="t" style="display:block">${esc(x.t)}</span><span class="s">${esc(x.s)}</span></span>${ICON.chev}</a>`).join("") || '<p class="empty">Nothing found.</p>'; }; q.addEventListener("input", draw); draw(); setTimeout(() => q.focus(), 30); },
    });
  }

  const greeting = () => { const h = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Ulaanbaatar" })); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };
  const first = () => S.ME[role()].name.split(" ")[0];

  // v2 helpers: colour by category, event cards with covers, week strip, mini calendar
  const CAT = { Sports: "#12804a", Academic: "#2340d9", Arts: "#e0447a", Culture: "#b25e00", Volunteering: "#6b4fd6", Leadership: "#f2643f", Career: "#0f8a9a", Social: "#c08a00" };
  const catColor = (c) => CAT[c] || "#6d6a63";
  const cat = (c) => `<span class="cat" style="--c:${catColor(c)}">${esc(c)}</span>`;
  const isGoing = (e) => ["going", "registered"].includes(S.statusOf(e));
  function eventCard(e, action = "") {
    const left = e.capacity ? e.capacity - e.going : null;
    return `<article class="card ecard"><a class="cv" href="event.html#${e.id}">${S.art(e.art)}<span class="dt"><span>${S.mon(e.start)}</span><b>${S.dom(e.start)}</b></span>${isGoing(e) ? '<span class="st tag ok">Going</span>' : S.statusOf(e) === "pending" ? '<span class="st tag warn">Requested</span>' : ""}</a>
      <div class="bd">${cat(e.category)}<a class="t" href="event.html#${e.id}" style="text-decoration:none;color:inherit">${esc(e.title)}</a><span class="s">${S.weekday(e.start)} · ${S.time(e.start)} · ${esc(e.location)}</span>
      ${left !== null ? `<div class="bar" title="${left} spots left" style="--c:${left < 5 ? "var(--coral)" : catColor(e.category)}"><i style="width:${Math.round((e.going / e.capacity) * 100)}%"></i></div>` : ""}
      <div class="ft"><span style="display:flex;align-items:center;gap:8px">${S.avatars(e.going, 4)}<span class="s"><b>${e.going}</b> going${left !== null ? ` · ${left} left` : ""}</span></span>${action}</div></div></article>`;
  }
  const NOW = new Date("2026-11-07T10:00");
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  function weekStrip(events) {
    return `<div class="week">${Array.from({ length: 7 }, (_, i) => { const d = new Date(NOW); d.setDate(d.getDate() + i); const k = ymd(d); const evs = events.filter((e) => e.start.startsWith(k)); return `<a class="day ${i === 0 ? "today" : ""}" href="${evs[0] ? "event.html#" + evs[0].id : "events.html"}"><small>${i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" })}</small><b>${d.getDate()}</b><span class="dots">${evs.slice(0, 3).map((e) => `<i style="--c:${catColor(e.category)}"></i>`).join("")}</span></a>`; }).join("")}</div>`;
  }
  function miniCal(events) {
    const first = new Date(NOW.getFullYear(), NOW.getMonth(), 1), start = (first.getDay() + 6) % 7, days = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 0).getDate();
    let cells = ["M", "T", "W", "T", "F", "S", "S"].map((h) => `<span class="h">${h}</span>`).join("");
    for (let i = 0; i < start; i++) cells += "<span></span>";
    for (let d = 1; d <= days; d++) { const k = ymd(new Date(NOW.getFullYear(), NOW.getMonth(), d)); const ev = events.find((e) => e.start.startsWith(k)); cells += `<span class="${d === NOW.getDate() ? "td" : ""} ${ev ? "e" : ""}" ${ev ? `style="--c:${catColor(ev.category)}" title="${esc(ev.title)}"` : ""}>${d}</span>`; }
    return `<div class="cal">${cells}</div>`;
  }

  // Signed-out pages use the live site's sign-in frame: a deep-blue panel with "Clubs for you" cards, and the form beside it.
  function authShell(innerHtml) {
    const t = document.createElement("div"); t.innerHTML = innerHtml;
    t.querySelectorAll(".ga-tile").forEach((n) => n.remove());
    const h1 = t.querySelector("h1"); let head = "";
    if (h1) { const box = h1.parentElement === t || h1.parentElement.classList.contains("ga-form") ? h1 : h1.parentElement;
      const eb = box.querySelector ? box.querySelector(".ga-eyebrow") : null, d = box.querySelector ? box.querySelector(".d, p:not(.ga-eyebrow)") : null;
      head = `${eb ? `<p class="au-eyebrow">${eb.innerHTML}</p>` : ""}<h1 class="au-title">${h1.innerHTML}</h1>${d && d !== h1 ? `<p class="au-desc">${d.innerHTML}</p>` : ""}`; box.remove(); }
    const cards = [["Arts", ["Beginners welcome", "First visit free"], "-2deg", "0"], ["Sports", ["Beginners welcome"], "1deg", "32px"]];
    return `<main class="au">
      <aside class="au-panel"><a class="au-brand" href="landing.html"><i><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="10" r="5" fill="#ffc23d"/><path d="M2.5 20.5c2.6-4.2 5.9-6.3 9.5-6.3s6.9 2.1 9.5 6.3" stroke="#2340d9" stroke-linecap="round" stroke-width="3"/></svg></i>Activity Hub</a>
        <div class="au-preview" aria-hidden="true"><p>Clubs for you</p>${cards.map(([c, flags, r, x]) => `<div class="au-card" style="transform:rotate(${r}) translateX(${x})"><div><b>${c}</b><span class="au-join">Join club</span></div><small>Matches your interest: ${c}</small><div class="au-flags">${flags.map((f) => `<span>${f}</span>`).join("")}</div></div>`).join("")}</div>
        <div class="au-foot"><p class="au-headline">Manage school clubs, events, and attendance in one safe place.</p><ul>${["Invite-only student accounts", "Staff approval before participation", "QR attendance records"].map((x) => `<li><i></i>${x}</li>`).join("")}</ul></div></aside>
      <div class="au-main"><div class="au-top"><a class="au-brand au-mob" href="landing.html"><i><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="10" r="5" fill="#ffc23d"/><path d="M2.5 20.5c2.6-4.2 5.9-6.3 9.5-6.3s6.9 2.1 9.5 6.3" stroke="#fff" stroke-linecap="round" stroke-width="3"/></svg></i>Activity Hub</a>
        <div class="au-ctrls"><span class="au-pill" role="group" aria-label="Language"><button type="button" aria-pressed="true">English</button><button type="button" aria-pressed="false" data-mn>Монгол</button></span><span class="au-pill" role="group" aria-label="Theme"><button type="button" data-th="light">Light</button><button type="button" data-th="dark">Dark</button><button type="button" data-th="system" aria-pressed="true">System</button></span></div></div>
        <section class="au-body">${head}<div class="au-form">${t.innerHTML}</div></section></div>
      <div class="draftnote"><span>Clean draft</span><a href="index.html">All screens</a></div></main>`;
  }
  document.addEventListener("click", (e) => {
    const th = e.target.closest("[data-th]"); if (!th) return;
    const v = th.dataset.th; if (v === "system") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = v;
    th.parentElement.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === th)));
  });
  window.Clean = { authShell, ICON, menu, shell, staff, role, greeting, first, CAT, catColor, cat, isGoing, eventCard, weekStrip, miniCal, NOW };
})();
