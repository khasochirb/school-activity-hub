/* Shared shell for the Luma-style redesign drafts: navigation, sample events and clubs, small helpers. */
(function () {
  const ART = Object.assign({}, (window.Portfolio && window.Portfolio.ART) || {}, {
    ball: '<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A basketball under a hoop"><rect width="400" height="400" fill="#ffe3d6"/><rect x="230" y="40" width="130" height="90" rx="8" fill="#ffffff" stroke="#131517" stroke-width="6"/><rect x="270" y="80" width="50" height="36" fill="none" stroke="#f2643f" stroke-width="6"/><path d="M262 130 h66 l-10 60 h-46 z" fill="none" stroke="#131517" stroke-width="5"/><circle cx="160" cy="250" r="90" fill="#f2643f"/><path d="M70 250 h180 M160 160 v180 M95 190 c40 30 40 90 0 120 M225 190 c-40 30 -40 90 0 120" stroke="#131517" stroke-width="6" fill="none"/></svg>',
    arduino: '<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A small circuit board with wires"><rect width="400" height="400" fill="#e1f5ea"/><rect x="90" y="110" width="220" height="160" rx="14" fill="#0b8a4c"/><rect x="120" y="140" width="70" height="50" rx="6" fill="#131517"/><g fill="#ffc23d"><rect x="215" y="140" width="12" height="12" rx="2"/><rect x="235" y="140" width="12" height="12" rx="2"/><rect x="255" y="140" width="12" height="12" rx="2"/><rect x="275" y="140" width="12" height="12" rx="2"/></g><path d="M150 270 C 150 330, 90 330, 70 360 M250 270 C 250 320, 320 320, 340 360" stroke="#2340d9" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="270" cy="230" r="14" fill="#f2643f"/></svg>',
    books: '<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A stack of donated books"><rect width="400" height="400" fill="#fff4d6"/><rect x="100" y="250" width="200" height="40" rx="6" fill="#2340d9"/><rect x="115" y="210" width="175" height="40" rx="6" fill="#f2643f"/><rect x="95" y="170" width="190" height="40" rx="6" fill="#0b8a4c"/><rect x="125" y="130" width="160" height="40" rx="6" fill="#131517"/><rect x="60" y="290" width="280" height="14" rx="4" fill="#c9824a"/></svg>',
  });
  for (const k of Object.keys(ART)) ART[k] = ART[k].replace('viewBox="0 0 400 300"', 'viewBox="50 0 300 300"');

  const CLUBS = {
    robotics: { name: "Robotics Club", short: "R", color: "#2340d9", art: "robot", members: 18, category: "Academic", about: "We design, build and race robots, and teach anyone who wants to learn. Beginners welcome.", meets: "Tue & Thu · 16:30–18:00", where: "STEM lab, room 204", advisor: "Ms. Sarantuyaa" },
    debate: { name: "Debate Club", short: "D", color: "#f2643f", art: "debate", members: 12, category: "Leadership", about: "Weekly debates in Mongolian and English, plus inter-school tournaments.", meets: "Mondays · 15:30–17:00", where: "Library meeting room", advisor: "Mr. Tumurbaatar" },
    morin: { name: "Morin Khuur Ensemble", short: "M", color: "#b25e00", art: "concert", members: 9, category: "Culture", about: "Learn the morin khuur and play at school concerts. Instruments are provided.", meets: "Wed & Fri · 16:00–17:30", where: "Music hall", advisor: "Mr. Tumurbaatar" },
    basketball: { name: "Basketball Team", short: "B", color: "#0b8a4c", art: "ball", members: 15, category: "Sports", about: "The school team. We train for the district championship. Tryouts each term.", meets: "Mon & Wed · 17:00–18:30", where: "Gym", advisor: "Ms. Sarantuyaa" },
    volunteers: { name: "Volunteers Union", short: "V", color: "#6b4fd6", art: "river", members: 24, category: "Volunteering", about: "Clean-ups, book drives and helping at care homes. Come once a month or every week.", meets: "Saturdays · 10:00", where: "Changes per activity", advisor: "Ms. Sarantuyaa" },
  };

  const EVENTS = [
    { id: "ev1", club: "basketball", title: "District championship: opening game", start: "2026-11-08T16:30", end: "2026-11-08T18:30", location: "School gym", art: "ball", going: 46, status: "going", category: "Sports", needs: null,
      about: "Our team plays School No. 23 in the opening game of the district championship. Come early to get a seat. Bring your school ID." },
    { id: "ev2", club: "robotics", title: "Arduino for beginners", start: "2026-11-11T16:30", end: "2026-11-11T18:00", location: "STEM lab, room 204", art: "arduino", going: 14, capacity: 20, status: null, category: "Academic", needs: null,
      about: "Never built anything with electronics? This is for you. In 90 minutes you will make an LED blink and a buzzer play a tune. All materials provided by the club." },
    { id: "ev3", club: "volunteers", title: "Book drive for rural schools", start: "2026-11-14T10:00", end: "2026-11-14T16:00", location: "Library entrance hall", art: "books", going: 31, status: "registered", category: "Volunteering", needs: null,
      about: "Bring children's books and textbooks you no longer use. We'll sort and pack them for three schools in Arkhangai." },
    { id: "ev4", club: "debate", title: "Open debate for new members", start: "2026-11-20T15:30", end: "2026-11-20T17:00", location: "Library meeting room", art: "debate", going: 9, status: null, category: "Leadership", needs: "approval",
      about: "A friendly first debate for anyone curious. You'll be paired with an experienced member. The club advisor approves sign-ups." },
    { id: "ev5", club: "morin", title: "Winter concert rehearsal", start: "2026-11-27T16:00", end: "2026-11-27T17:30", location: "Music hall", art: "concert", going: 11, status: null, category: "Culture", needs: "permission",
      about: "Full rehearsal for the winter concert. A parent permission form is needed because we finish after school hours." },
    { id: "ev0", club: "robotics", title: "Inter-province robotics competition", start: "2026-10-01T09:00", end: "2026-10-01T14:00", location: "Sports complex, Bayanzürkh", art: "robot", going: 22, status: "attended", category: "Academic", needs: null, past: true,
      about: "Three of our teams competed in line-following and robot sumo. One team took bronze." },
    { id: "evp2", club: "volunteers", title: "Tuul river clean-up", start: "2026-09-18T10:00", end: "2026-09-18T14:00", location: "Tuul river bank, Zaisan", art: "river", going: 30, status: "attended", category: "Volunteering", needs: null, past: true,
      about: "Thirty students, 120 bags of litter." },
  ];

  const ICON = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17M9 9.5v11M15 9.5v11M3.5 15h17"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',
    megaphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h3l8 4V6L7 10z"/><path d="M18 9.5a3.5 3.5 0 0 1 0 5"/><path d="M7 14l1.5 5"/></svg>',
    news: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="14" height="15" rx="2"/><path d="M17.5 8.5h3V18a1.5 1.5 0 0 1-3 0z"/><path d="M7 9h7M7 12.5h7M7 16h4"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 7.8M18.5 14.8c1.6.8 2.6 2.6 3 5.2"/></svg>',
    badge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3.5" width="16" height="17" rx="2.5"/><circle cx="12" cy="10" r="3"/><path d="M7.5 17c1-2 2.6-3 4.5-3s3.5 1 4.5 3"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M11 12l8.5-8.5M16 7l2.5 2.5M14 9l2 2"/></svg>',
    checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/></svg>',
    school: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-5 9 5-9 5z"/><path d="M7 11.2V16c1.3 1.3 3 2 5 2s3.7-.7 5-2v-4.8"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-4 4-6 7.5-6s6.3 2 7.5 6"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10.5l5 5 5-5M4.5 19.5h15"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3.5M7.5 8L12 3.5 16.5 8"/><path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    clubs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="7" r="2.6"/><path d="M17.5 12.6c2.2.4 3.6 2 4 4.4"/></svg>',
    compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
    portfolio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    ticket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5a2 2 0 0 0 0 7V18a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5v-2.5a2 2 0 0 1 0-7V6A1.5 1.5 0 0 0 19 4.5H5A1.5 1.5 0 0 0 3.5 6z"/><path d="M14 5v14" stroke-dasharray="2 2.5"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z"/></svg>',
    qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2"/><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM18 14h2.5M14 18v2.5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  };

  const KEY = location.pathname.includes("/hybrid/") ? "sah-hybrid-draft-v1" : "sah-luma-draft-v1";
  let store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { store = {}; }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} };
  store.rsvp = store.rsvp || {};
  store.joined = store.joined || { robotics: true, debate: true, volunteers: true };
  // ?as=teacher in a link from the overview switches the draft's role.
  try { const as = new URLSearchParams(location.search).get("as"); if (["student", "teacher", "admin", "platform"].includes(as)) { store.role = as; localStorage.setItem(KEY, JSON.stringify(store)); } } catch (e) {}

  const statusOf = (ev) => (ev.id in store.rsvp ? store.rsvp[ev.id] : ev.status);
  const setStatus = (ev, s) => { store.rsvp[ev.id] = s; persist(); };
  const isJoined = (k) => Boolean(store.joined[k]);
  const setJoined = (k, v) => { store.joined[k] = v; persist(); };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const d = (iso) => new Date(iso);
  const time = (iso) => d(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const dayLong = (iso) => d(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const dayShort = (iso) => d(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const weekday = (iso) => d(iso).toLocaleDateString("en-US", { weekday: "long" });
  const mon = (iso) => d(iso).toLocaleDateString("en-US", { month: "short" });
  const dom = (iso) => d(iso).getDate();

  const AVC = ["#ffc23d", "#b9c1ec", "#ffb59f", "#9fe0bd", "#e3c8ff"];
  const avatars = (n, max = 5) => `<span class="avs" aria-hidden="true">${Array.from({ length: Math.min(n, max) }, (_, i) => `<span style="background:${AVC[i % AVC.length]}">${"ABEGKMNOST"[(i * 3 + n) % 10]}</span>`).join("")}</span>`;
  const clubAv = (k, size) => `<span class="clubav" style="background:${CLUBS[k] ? CLUBS[k].color : "#5b6475"};${size ? `width:${size}px;height:${size}px;border-radius:${Math.round(size / 3.4)}px;font-size:${Math.round(size / 2.3)}px` : ""}">${CLUBS[k] ? CLUBS[k].short : "S"}</span>`;
  const art = (name) => ART[name] || "";

  function statusPill(ev) {
    const s = statusOf(ev);
    if (s === "going") return '<span class="pill pill-green">Going</span>';
    if (s === "registered") return '<span class="pill pill-green">Registered</span>';
    if (s === "pending") return '<span class="pill pill-amber">Waiting for approval</span>';
    if (s === "attended") return '<span class="pill">Attended</span>';
    if (ev.needs === "approval") return '<span class="pill pill-amber">Approval required</span>';
    if (ev.needs === "permission") return '<span class="pill pill-amber">Parent form needed</span>';
    if (ev.capacity) return `<span class="pill">${ev.capacity - ev.going} spots left</span>`;
    return "";
  }

  /* ---------- Sample school data (all fake) ---------- */
  const SCHOOL = { name: "Khangai High School", slug: "khangai-high", province: "Ulaanbaatar", status: "Active", timezone: "Asia/Ulaanbaatar" };
  const CATEGORIES = ["Academic", "Arts", "Career", "Culture", "Leadership", "Mental Health", "Other", "Outdoor", "Social", "Sports", "Volunteering"];
  // Fields the real event form collects; filled in for every sample event.
  const EVENT_DEFAULTS = { approval: "approved", cost: "Free", eligibility: "All students", experience: "Beginner-friendly", materials: "Nothing required", commitment: "One-time", accessibility: "Wheelchair-accessible location", risk: "Low", permission: false, permissionNote: "", adult: "Bat-Erdene Ganbold", scheduleNote: "", shared: [], partner: null, createdBy: "Bat-Erdene Ganbold" };
  const EXTRA = {
    ev1: { adult: "Tsetsegmaa B.", materials: "School ID", risk: "Low" },
    ev2: { materials: "Notebook and pen", adult: "Bat-Erdene Ganbold" },
    ev3: { commitment: "One-time", adult: "Enkhjargal S." },
    ev4: { eligibility: "Grades 9–12", experience: "Beginner-friendly", adult: "Munkhbayar T." },
    ev5: { permission: true, permissionNote: "Rehearsal ends at 17:30, after school hours.", risk: "Medium", eligibility: "Club members", adult: "Altantsetseg D." },
    ev0: { cost: "Variable cost", risk: "Medium", permission: true, permissionNote: "Off-site trip by school bus." },
  };
  EVENTS.forEach((e) => Object.assign(e, EVENT_DEFAULTS, EXTRA[e.id] || {}, { ...e, ...(EXTRA[e.id] || {}) }));
  EVENTS.push(
    { ...EVENT_DEFAULTS, id: "ev6", club: "robotics", title: "Robot sumo practice night", start: "2026-12-03T17:00", end: "2026-12-03T19:00", location: "STEM lab, room 204", art: "robot", going: 0, capacity: 16, status: null, category: "Academic", needs: null, approval: "pending", createdBy: "Temuulen B. (club leader)", about: "Open practice for the sumo league. Leaders will run the timing gate.", risk: "Low", experience: "Prior experience recommended" },
    { ...EVENT_DEFAULTS, id: "ev7", club: null, title: "Career talk: engineers from Oyu Tolgoi", start: "2026-12-05T14:00", end: "2026-12-05T15:30", location: "Assembly hall", art: "arduino", going: 0, capacity: 120, status: null, category: "Career", needs: null, approval: "pending", createdBy: "Enkhjargal S.", about: "Three engineers talk about their jobs and how they got there. Questions welcome.", eligibility: "Grades 10–12" },
    { ...EVENT_DEFAULTS, id: "ev8", club: null, title: "Inter-school chess open", start: "2026-11-21T10:00", end: "2026-11-21T15:00", location: "School No. 23, hall B", art: "debate", going: 27, capacity: 40, status: null, category: "Social", needs: null, partner: "School No. 23", about: "Shared by School No. 23. Students from connected schools can register." },
  );
  const clubName = (e) => (e.club ? CLUBS[e.club].name : e.partner ? e.partner : "School event");

  const STUDENTS = [
    ["Nomin-Erdene Ulziibat", "11", "11B", "S-1104", "Active"], ["Temuulen Bold", "11", "11B", "S-1107", "Active"], ["Anuujin Ganzorig", "10", "10A", "S-1012", "Active"],
    ["Khulan Erdenebat", "9", "9C", "S-0931", "Active"], ["Munkh-Od Tseren", "12", "12A", "S-1201", "Active"], ["Saruul Battulga", "10", "10B", "S-1019", "Active"],
    ["Enkhjin Purev", "11", "11A", "S-1110", "Active"], ["Ganbaatar Lkhagva", "12", "12B", "S-1215", "Inactive"], ["Odgerel Sukh", "9", "9A", "S-0904", "Active"],
    ["Zolboo Altankhuyag", "10", "10A", "S-1023", "Active"], ["Bilguun Davaa", "11", "11C", "S-1122", "Active"], ["Maral Naran", "12", "12A", "S-1208", "Active"],
  ].map(([name, grade, group, number, status], i) => ({ id: "st" + i, name, grade, group, number, status, created: "2026-08-2" + (i % 9) }));
  const STAFF = [
    { name: "Oyunchimeg Dorj", email: "oyunchimeg.d@khangai.edu.mn", role: "School admin", status: "Active", created: "2026-08-12" },
    { name: "Bat-Erdene Ganbold", email: "baterdene.g@khangai.edu.mn", role: "Teacher", status: "Active", created: "2026-08-14", safety: "2026-08-20" },
    { name: "Enkhjargal Sodnom", email: "enkhjargal.s@khangai.edu.mn", role: "Teacher", status: "Active", created: "2026-08-14" },
    { name: "Munkhbayar Tumur", email: "munkhbayar.t@khangai.edu.mn", role: "Teacher", status: "Active", created: "2026-08-15", safety: "2026-08-20" },
    { name: "Altantsetseg Dash", email: "altantsetseg.d@khangai.edu.mn", role: "Teacher", status: "Inactive", created: "2026-08-15" },
  ];
  const ANNOUNCEMENTS = [
    { id: "an1", title: "Club fair moved to Friday", body: "Because of the heating repair, the club fair is now on Friday 13 November in the gym, 15:00–17:00. Every club will have a table.", date: "2026-11-04", status: "Active" },
    { id: "an2", title: "Parent forms for the winter concert", body: "Morin khuur members: bring the signed permission form to your class teacher by 20 November.", date: "2026-11-02", status: "Active" },
    { id: "an3", title: "New: suggest a club", body: "You can now suggest a new club in Club ideas. If 10 students support it, staff will review it.", date: "2026-10-20", status: "Active" },
    { id: "an4", title: "September clean-up thank you", body: "Thank you to everyone who came to the Tuul river clean-up.", date: "2026-09-20", status: "Archived" },
  ];
  const IDEAS = [
    { id: "id1", name: "Photography Club", category: "Arts", why: "Lots of us take photos on our phones. We want to learn composition and run a school photo exhibition.", by: "Anuujin Ganzorig", created: "2026-10-22", supporters: 14, status: "Pending review", mine: false },
    { id: "id2", name: "Chess Club", category: "Social", why: "We play at lunch already. A club would let us join the inter-school open.", by: "Bilguun Davaa", created: "2026-10-10", supporters: 21, status: "Approved", reviewed: "2026-10-28", mine: false },
    { id: "id3", name: "Mental health peer circle", category: "Mental Health", why: "A calm space after exams to talk, with a counsellor present.", by: "Nomin-Erdene Ulziibat", created: "2026-10-30", supporters: 6, status: "Pending review", mine: true },
    { id: "id4", name: "Esports team", category: "Sports", why: "Compete in online tournaments.", by: "Ganbaatar Lkhagva", created: "2026-09-15", supporters: 9, status: "Rejected", reviewed: "2026-09-30", reason: "We can't supervise online tournaments this year. Try again next term." },
  ];
  const SAFETY_CATS = ["Bullying or harassment", "Personal safety", "Activity or event concern", "Online or platform safety", "Other safety concern"];
  const SAFETY_REPORTS = [
    { id: "sr1", category: "Activity or event concern", status: "Being reviewed", contact: true, submitted: "2026-11-02", reviewed: "2026-11-03", reporter: "Khulan Erdenebat", related: "Basketball Team", text: "The gym floor near the north door is wet after training and someone slipped.", mine: false },
    { id: "sr2", category: "Online or platform safety", status: "Submitted", contact: false, submitted: "2026-11-05", reporter: "Nomin-Erdene Ulziibat", related: "No related activity", text: "Someone shared a screenshot of the debate group chat outside the club.", mine: true },
    { id: "sr3", category: "Bullying or harassment", status: "Closed", contact: true, submitted: "2026-10-12", reviewed: "2026-10-12", closed: "2026-10-19", reporter: "Saruul Battulga", related: "No related activity", text: "Name-calling in the corridor after practice.", mine: false, referral: true },
  ];
  const INVITES = [
    { student: "Khulan Erdenebat", status: "Active", created: "2026-11-01", expires: "2026-11-15" },
    { student: "Odgerel Sukh", status: "Active", created: "2026-11-01", expires: "2026-11-15" },
    { student: "Nomin-Erdene Ulziibat", status: "Redeemed", created: "2026-08-25", expires: "2026-09-08", redeemed: "2026-08-26" },
    { student: "Temuulen Bold", status: "Redeemed", created: "2026-08-25", expires: "2026-09-08", redeemed: "2026-08-27" },
    { student: "Ganbaatar Lkhagva", status: "Revoked", created: "2026-08-25", expires: "2026-09-08" },
    { student: "Zolboo Altankhuyag", status: "Expired", created: "2026-08-25", expires: "2026-09-08" },
  ];
  const SCHOOLS = [
    { name: "Khangai High School", province: "Ulaanbaatar", slug: "khangai-high", status: "Active", created: "2026-08-12", students: 412, teachers: 28, admins: 2 },
    { name: "School No. 23", province: "Ulaanbaatar", slug: "school-23", status: "Active", created: "2026-08-30", students: 655, teachers: 41, admins: 1 },
    { name: "Darkhan Lab School", province: "Darkhan-Uul", slug: "darkhan-lab", status: "Active", created: "2026-09-10", students: 288, teachers: 19, admins: 1 },
    { name: "Erdenet Gymnasium", province: "Orkhon", slug: "erdenet-gym", status: "Archived", created: "2026-09-01", students: 0, teachers: 2, admins: 1 },
  ];
  const CONNECTIONS = [
    { from: "Khangai High School", to: "School No. 23", status: "Approved", requested: "2026-09-02", updated: "2026-09-04", direction: "Sent" },
    { from: "Darkhan Lab School", to: "Khangai High School", status: "Pending", requested: "2026-11-03", updated: "2026-11-03", direction: "Received" },
    { from: "Khangai High School", to: "Erdenet Gymnasium", status: "Rejected", requested: "2026-09-12", updated: "2026-09-20", direction: "Sent" },
  ];
  const AUDIT = [
    { date: "2026-11-03 10:14", action: "Connection requested", actor: "Darkhan Lab School admin", target: "Khangai High School", school: "Darkhan Lab School" },
    { date: "2026-10-28 16:02", action: "Platform admin added", actor: "Platform team", target: "Sarnai O.", school: "—" },
    { date: "2026-09-10 09:30", action: "School created", actor: "Platform team", target: "Darkhan Lab School", school: "Darkhan Lab School" },
    { date: "2026-09-04 12:48", action: "Connection approved", actor: "School No. 23 admin", target: "Khangai High School", school: "School No. 23" },
  ];

  /* Persisted copies of the lists, so forms in the drafts actually add and change rows. */
  const list = (name, seed) => { store.lists = store.lists || {}; if (!store.lists[name]) store.lists[name] = JSON.parse(JSON.stringify(seed)); return store.lists[name]; };
  const saveLists = () => persist();
  const uid = () => Math.random().toString(36).slice(2, 9);
  const flag = (k, v) => { store.flags = store.flags || {}; if (v !== undefined) { store.flags[k] = v; persist(); } return store.flags[k]; };
  const interests = (v) => { if (v) { store.interests = v; persist(); } return store.interests || ["Academic", "Leadership", "Volunteering"]; };
  // Events created or edited in the event screens are saved as lists; fold them into EVENTS so every page sees them.
  (() => { const st = store.lists || {}; const patches = (st.eventPatches && st.eventPatches[0]) || {}; const created = st.eventsCreated || [];
    created.forEach((c) => { if (!EVENTS.some((e) => e.id === c.id)) EVENTS.push(Object.assign({}, EVENT_DEFAULTS, c)); });
    EVENTS.forEach((e) => { if (patches[e.id]) Object.assign(e, patches[e.id]); if (e.user && e.end) e.past = new Date(e.end) < new Date(); }); })();
  const permOf = (ev, sid) => (store.perm && store.perm[ev.id + sid]) || (ev.permission ? "Pending" : "Not required");
  const setPerm = (ev, sid, v) => { store.perm = store.perm || {}; store.perm[ev.id + sid] = v; persist(); };

  /* ---------- Page building blocks ---------- */
  const tone = { green: "pill-green", amber: "pill-amber", blue: "pill-blue", coral: "pill-coral", sun: "pill-sun" };
  const badge = (text, t) => `<span class="pill ${tone[t] || ""}">${esc(text)}</span>`;
  const statusBadge = (s) => badge(s, /^(Active|Approved|Redeemed|Received|Done|Attended|Checked in|Closed)$/.test(s) ? "green" : /^(Pending|Pending review|Pending approval|Submitted|Being reviewed|Next)$/.test(s) ? "amber" : /^(Rejected|Revoked|Declined|Canceled|Blocked|Inactive|Expired)$/.test(s) ? "coral" : "");
  const pageHead = ({ eyebrow = "", title, desc = "", actions = "" }) => `<div class="phead"><div style="min-width:0">${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}<h1>${esc(title)}</h1>${desc ? `<p class="pdesc">${desc}</p>` : ""}</div>${actions ? `<div class="pacts">${actions}</div>` : ""}</div>`;
  const section = (title, body, extra = "") => `<section class="psec"><div class="psec-h"><h2>${esc(title)}</h2>${extra}</div>${body}</section>`;
  const empty = (title, text = "", action = "") => `<div class="card pempty"><p style="font-weight:700">${esc(title)}</p>${text ? `<p class="muted" style="margin-top:4px">${text}</p>` : ""}${action ? `<div style="margin-top:12px">${action}</div>` : ""}</div>`;
  const metric = (label, value, sub = "", href = "") => `<${href ? `a href="${href}"` : "div"} class="card metric"><span class="ml">${esc(label)}</span><b>${value}</b>${sub ? `<span class="ms">${sub}</span>` : ""}</${href ? "a" : "div"}>`;
  const table = (heads, rows, { label = "" } = {}) => rows.length ? `<div class="card tablewrap" ${label ? `aria-label="${esc(label)}"` : ""}><table class="ptable"><thead><tr>${heads.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td data-h="${esc(heads[i])}">${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "";
  const field = (label, control, hint = "") => `<label class="field"><span>${esc(label)}</span>${control}${hint ? `<small class="muted">${hint}</small>` : ""}</label>`;
  const input = (name, { type = "text", value = "", placeholder = "", required = false } = {}) => `<input class="input" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? "required" : ""}>`;
  const textarea = (name, { value = "", placeholder = "", rows = 4 } = {}) => `<textarea class="textarea" name="${name}" rows="${rows}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;
  const select = (name, options, value = "") => `<select class="input" name="${name}">${options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${v === value ? "selected" : ""}>${esc(l)}</option>`; }).join("")}</select>`;
  const segtabs = (name, items, active, label = "") => `<div class="segtabs" role="group" aria-label="${esc(label || name)}">${items.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<button type="button" data-${name}="${esc(v)}" aria-pressed="${v === active}">${esc(l)}</button>`; }).join("")}</div>`;
  const searchBox = (id, value, placeholder) => `<label class="searchbox2"><span class="sr">${esc(placeholder)}</span>${ICON.search}<input class="input" id="${id}" type="search" placeholder="${esc(placeholder)}" value="${esc(value)}"></label>`;
  const disclosure = (summary, body) => `<details class="disc"><summary>${esc(summary)}</summary><div class="disc-b">${body}</div></details>`;
  const formData = (form) => Object.fromEntries(new FormData(form).entries());
  const notice = (html, t = "") => `<div class="pnotice ${t}">${html}</div>`;
  const fmtDate = (iso) => (iso && iso.length >= 10 ? new Date(iso.slice(0, 10) + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : esc(iso || "—"));
  // Render a whole page: nav + <main>. Keeps focus/caret for a search box with the given id across re-renders.
  function mount(active, html, { keep } = {}) {
    const f = document.activeElement, fid = f && f.id, pos = f && f.selectionStart;
    document.getElementById("app").innerHTML = `${nav(active)}<main class="wrap ${"wide"} page">${html}</main>`;
    startClock();
    if (fid) { const el = document.getElementById(fid); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) {} } }
  }
  // Re-render on search input without losing the caret.
  function onSearch(id, cb) { document.addEventListener("input", (e) => { if (e.target.id === id) cb(e.target.value); }); }
  const confirm = (title, text, ok, fn) => window.Portfolio.confirmSheet(title, text, ok, fn);
  const sheet = (html, opts) => window.Portfolio.openSheet(html, opts);
  const qr = (seed, size = 21) => { let x = 0; for (const ch of seed) x = (x * 33 + ch.charCodeAt(0)) >>> 0; const n = size, cells = []; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const fz = (r < 7 && c < 7) || (r < 7 && c > n - 8) || (r > n - 8 && c < 7); let on; if (fz) { const rr = r > 7 ? r - (n - 7) : r, cc = c > 7 ? c - (n - 7) : c; const a = Math.max(Math.abs(rr - 3), Math.abs(cc - 3)); on = a !== 2 && a <= 3; } else { x = (x * 1103515245 + 12345) >>> 0; on = (x >>> 16) % 2 === 0; } if (on) cells.push(`<rect x="${c}" y="${r}" width="1" height="1"/>`); } return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" fill="#131517" role="img" aria-label="QR code">${cells.join("")}</svg>`; };

  /* ---------- Roles and navigation (mirrors the real app's nav per role) ---------- */
  const ROLES = { student: "Student", teacher: "Teacher", admin: "School admin", platform: "Platform admin" };
  const ME = {
    student: { name: "Nomin-Erdene Ulziibat", short: "Nomin-Erdene U.", initials: "NU", sub: "Grade 11B", email: "nomin.u@khangai.edu.mn" },
    teacher: { name: "Bat-Erdene Ganbold", short: "Bat-Erdene G.", initials: "BG", sub: "Teacher · Robotics advisor", email: "baterdene.g@khangai.edu.mn" },
    admin: { name: "Oyunchimeg Dorj", short: "Oyunchimeg D.", initials: "OD", sub: "School admin", email: "oyunchimeg.d@khangai.edu.mn" },
    platform: { name: "Platform team", short: "Platform team", initials: "PT", sub: "Platform admin", email: "platform@activityhub.mn" },
  };
  const role = () => (ROLES[store.role] ? store.role : "student");
  const setRole = (r) => { store.role = r; persist(); };
  const isStaff = () => role() === "teacher" || role() === "admin";
  // [key, label, href, icon, roles]
  const S_ = ["student"], T_ = ["teacher"], A_ = ["admin"], P_ = ["platform"], ST = ["teacher", "admin"], ALL = ["student", "teacher", "admin"];
  const SECTIONS = [
    ["Main", [
      ["dashboard", "Dashboard", "dashboard.html", "home", [...ALL, ...P_]],
      ["events", "Events", "home.html", "calendar", [...ALL, ...P_]],
      ["calendar", "Calendar", "home.html#month", "grid", [...ALL, ...P_]],
      ["clubs", "Clubs", "clubs.html", "clubs", ALL],
      ["ideas", "Club ideas", "ideas.html", "bulb", S_],
      ["ideas", "Club requests", "ideas.html", "bulb", ST],
      ["announcements", "Announcements", "announcements.html", "megaphone", ALL],
      ["news", "School news", "news.html", "news", ALL],
      ["portfolio", "Portfolio", "portfolio.html", "portfolio", S_],
      ["safety", "Safety and support", "safety.html", "shield", ALL],
    ]],
    ["People & access", [
      ["students", "Students", "students.html", "users", ST],
      ["staff", "Staff accounts", "staff.html", "badge", A_],
      ["invites", "Student invite codes", "invites.html", "key", ST],
    ]],
    ["Reviews & tracking", [
      ["approvals", "Event approvals", "approvals.html", "checkCircle", [...ST, ...P_]],
      ["attendance", "Attendance", "attendance.html", "qr", [...ST, ...P_]],
      ["reports", "Activity reports", "reports.html", "chart", [...ST, ...P_]],
      ["inbox", "Safeguarding inbox", "safety-inbox.html", "lock", ST],
    ]],
    ["School management", [
      ["settings", "School settings", "settings.html", "gear", A_],
      ["connections", "School network", "connections.html", "link", A_],
    ]],
    ["Platform", [
      ["platform", "Platform admin", "platform.html", "globe", P_],
      ["platform-schools", "Schools", "platform.html#schools", "school", P_],
      ["platform-connections", "Platform connections", "platform.html#connections", "link", P_],
      ["platform-admins", "Platform admins", "platform.html#admins", "badge", P_],
      ["platform-audit", "Audit log", "platform.html#audit", "list", P_],
    ]],
    ["Account", [
      ["profile", "Profile", "profile.html", "user", [...ALL, ...P_]],
      ["privacy", "Privacy", "privacy.html", "eye", [...ALL, ...P_]],
    ]],
  ];
  const navFor = (r) => SECTIONS.map(([t, items]) => [t, items.filter((i) => i[4].includes(r))]).filter(([, i]) => i.length);
  // Top bar and phone tab bar show the few most-used items; the rest go under "More".
  const PRIMARY = {
    student: ["dashboard", "events", "clubs", "portfolio"],
    teacher: ["dashboard", "events", "clubs", "approvals"],
    admin: ["dashboard", "events", "students", "approvals"],
    platform: ["platform", "events", "approvals", "reports"],
  };
  const SHORT = { dashboard: "Home", approvals: "Approvals", platform: "Platform" };
  const flat = () => navFor(role()).flatMap(([, i]) => i);
  const navLink = (i, active, short) => `<a href="${i[2]}" ${i[0] === active ? 'aria-current="page"' : ""}>${ICON[i[3]] || ""}${short ? SHORT[i[0]] || i[1] : i[1]}</a>`;

  function nav(active) {
    const r = role(), me = ME[r], items = flat();
    const prim = PRIMARY[r].map((k) => items.find((i) => i[0] === k)).filter(Boolean);
    const moreActive = !PRIMARY[r].includes(active) && items.some((i) => i[0] === active);
    return `<header class="topnav"><div class="wrap wide">
        <a class="logo" href="dashboard.html"><span class="mark"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="10" r="5" fill="#ffc23d"/><path d="M2.5 20.5c2.6-4.2 5.9-6.3 9.5-6.3s6.9 2.1 9.5 6.3" stroke="#8ea2ff" stroke-linecap="round" stroke-width="3"/></svg></span>Activity Hub</a>
        <nav class="navlinks" aria-label="Main">${prim.map((i) => navLink(i, active, true)).join("")}<button type="button" class="navmore" data-more ${moreActive ? 'aria-current="page"' : ""}>${ICON.dots}More</button></nav>
        <div class="navright">
          <span class="clock" id="clock"></span>
          <button class="iconbtn langbtn" data-lang aria-label="Language">EN</button>
          <button class="iconbtn" data-theme-toggle aria-label="Switch light or dark">${ICON.moon}</button>
          <button type="button" class="me-av" data-more aria-label="Account and more">${me.initials}</button>
        </div></div></header>
      <aside class="sidenav" aria-label="Main">
        <a class="logo" href="dashboard.html"><span class="mark"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="10" r="5" fill="#ffc23d"/><path d="M2.5 20.5c2.6-4.2 5.9-6.3 9.5-6.3s6.9 2.1 9.5 6.3" stroke="#fff" stroke-linecap="round" stroke-width="3"/></svg></span>Activity Hub</a>
        <p class="sidelabel">${r === "platform" ? "All schools" : "Khangai High School"}</p>
        ${navFor(r).map(([t, its]) => `<p class="sidehead">${t}</p>${its.map((i) => navLink(i, active)).join("")}`).join("")}
        ${r === "student" ? `<p class="sidehead">My clubs</p>${Object.entries(CLUBS).filter(([k]) => isJoined(k)).map(([k, c]) => `<a href="club.html#${k}">${clubAv(k, 20)}${esc(c.name)}</a>`).join("")}` : ""}
        <div class="sideme"><span class="me-av">${me.initials}</span><span><b>${esc(me.short)}</b><span>${esc(me.sub)}</span></span></div>
      </aside>
      <nav class="tabbar" aria-label="Main">${prim.map((i) => navLink(i, active, true)).join("")}<a href="#" data-more ${moreActive ? 'aria-current="page"' : ""}>${ICON.dots}More</a></nav>
      <div class="draftbar"><span>Draft</span><label class="sr" for="roleSel">View as</label><select id="roleSel" data-role-switch aria-label="View as">${Object.entries(ROLES).map(([k, l]) => `<option value="${k}" ${k === r ? "selected" : ""}>${l}</option>`).join("")}</select><a href="index.html">All screens</a></div>`;
  }

  function openMore() {
    const r = role(), me = ME[r];
    const P = window.Portfolio;
    P.openSheet(`<div class="sheet-head"><div style="display:flex;gap:12px;align-items:center"><span class="me-av" style="width:40px;height:40px;font-size:14px">${me.initials}</span><div><b>${esc(me.name)}</b><p class="muted" style="font-size:13px">${esc(me.email)} · ${ROLES[r]}</p></div></div><button class="close" data-close aria-label="Close">×</button></div>
      <div class="sheet-body morelist">${navFor(r).map(([t, its]) => `<p class="morehead">${t}</p><div class="moregrid">${its.map((i) => `<a href="${i[2]}">${ICON[i[3]] || ""}<span>${i[1]}</span></a>`).join("")}</div>`).join("")}
        <div class="moreacts"><button class="btn btn-sm" data-lang>Language: English · Монгол</button><button class="btn btn-sm" data-theme-toggle>Light / dark</button><a class="btn btn-sm" href="landing.html">Sign out</a></div></div>`);
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-more]")) { e.preventDefault(); openMore(); }
    if (e.target.closest("[data-lang]")) toast("The real build keeps the English / Монгол switch. This draft is English only.");
  });
  document.addEventListener("change", (e) => {
    if (e.target.matches("[data-role-switch]")) { setRole(e.target.value); const ok = flat().some((i) => location.pathname.endsWith(i[2].split("#")[0])) || /event|club|checkin|landing|login|join|discover|interests|safety-|print|club-edit/.test(location.pathname); if (ok) location.reload(); else location.href = role() === "platform" ? "platform.html" : "dashboard.html"; }
  });

  function startClock() {
    const tick = () => {
      const el = document.getElementById("clock");
      if (el) el.textContent = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Ulaanbaatar" }) + " Ulaanbaatar";
    };
    tick(); if (!startClock.t) startClock.t = setInterval(tick, 30000);
  }

  // Light / dark toggle (per-viewer convenience)
  try { const t = localStorage.getItem(KEY + "-theme"); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
  document.addEventListener("click", (ev) => {
    if (!ev.target.closest("[data-theme-toggle]")) return;
    const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(KEY + "-theme", next); } catch (e) {}
  });

  function toast(msg) {
    if (window.Portfolio) return window.Portfolio.toast(msg);
  }

  window.Site = { ART, CLUBS, EVENTS, ICON, nav, startClock, esc, time, dayLong, dayShort, weekday, mon, dom, avatars, clubAv, art, statusOf, setStatus, statusPill, isJoined, setJoined, toast,
    SCHOOL, CATEGORIES, STUDENTS, STAFF, ANNOUNCEMENTS, IDEAS, SAFETY_CATS, SAFETY_REPORTS, INVITES, SCHOOLS, CONNECTIONS, AUDIT, ROLES, ME, role, setRole, isStaff, navFor, clubName,
    list, saveLists, uid, flag, interests, permOf, setPerm, badge, statusBadge, pageHead, section, empty, metric, table, field, input, textarea, select, segtabs, searchBox, disclosure, formData, notice, fmtDate, mount, onSearch, confirm, sheet, qr };
})();
