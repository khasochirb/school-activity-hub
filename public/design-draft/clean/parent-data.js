/* Parent portal draft data: one parent, two children, and the activities that
   need a parent's OK. Answers are kept in the draft's local store. */
(function () {
  const S = window.Site;
  const KIDS = [
    { id: "nomin", name: "Nomin-Erdene", full: "Nomin-Erdene Ulziibat", initials: "NU", grade: "Grade 11B", color: "#ffc23d" },
    { id: "temuulen", name: "Temuulen", full: "Temuulen Ulziibat", initials: "TU", grade: "Grade 7A", color: "#9fe0bd" },
  ];
  const ASKS = [
    { id: "pa1", kid: "nomin", eventId: "ev5", title: "Winter concert rehearsal", club: "Morin Khuur Ensemble", category: "Culture", art: "concert",
      start: "2026-11-27T16:00", end: "2026-11-27T17:30", location: "Music hall", cost: "Free", transport: "None, it's at school",
      adult: "Bat-Erdene Ganbold (teacher)", risk: "Low", answerBy: "2026-11-20",
      note: "The rehearsal runs 30 minutes past the normal school day. Students go home on their own afterwards, so we ask a parent to say that's OK.",
      bring: "Own instrument if you have one. The school has spares." },
    { id: "pa2", kid: "nomin", eventId: null, title: "Field trip: Hustai National Park", club: "Volunteers Union", category: "Volunteering", art: "river",
      start: "2026-12-06T08:00", end: "2026-12-06T18:00", location: "Hustai National Park, Töv province", cost: "15,000₮ (bus and lunch)", transport: "School bus from the main gate at 08:00",
      adult: "Enkhjargal Sükh (teacher) and 2 parent volunteers", risk: "Medium: outdoors, away from school all day", answerBy: "2026-11-28",
      note: "A day of tree planting with the park rangers. Students stay with their group leader the whole day.",
      bring: "Warm clothes, gloves, water bottle. Lunch is provided." },
    { id: "pa3", kid: "temuulen", eventId: null, title: "Swimming lessons at the city pool", club: "Basketball Team", category: "Sports", art: "ball",
      start: "2026-11-24T15:00", end: "2026-11-24T16:30", location: "Central Sports Palace pool", cost: "5,000₮ per lesson", transport: "Walk with the teacher, 10 minutes",
      adult: "Ganbaatar Dash (PE teacher)", risk: "Medium: swimming", answerBy: "2026-11-21",
      note: "Six Tuesday lessons with a lifeguard present. Tell us about any health condition in the note.",
      bring: "Swimsuit, towel, swim cap." },
  ];
  const HISTORY = [
    { title: "Inter-province robotics competition", kid: "nomin", answer: "yes", when: "2026-09-24" },
    { title: "Tuul river clean-up", kid: "nomin", answer: "yes", when: "2026-09-12" },
  ];
  const answers = () => S.list("parentAnswers", {});
  const answerOf = (id) => answers()[id] || null;
  const setAnswer = (id, value) => { answers()[id] = value; S.saveLists(); };
  const kidId = () => (S.list("parentKid", { id: "nomin" }).id);
  const setKid = (id) => { S.list("parentKid", { id: "nomin" }).id = id; S.saveLists(); };
  window.ParentDraft = { KIDS, ASKS, HISTORY, answerOf, setAnswer, kidId, setKid, kid: (id) => KIDS.find((k) => k.id === id) };
})();
