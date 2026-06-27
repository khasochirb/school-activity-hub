export const en = {
  app: {
    name: "School Activity Hub",
    shortName: "SAH",
    subtitle: "Clubs, events, invites, and attendance",
  },
  common: {
    active: "Active",
    approved: "Approved",
    cancel: "Cancel",
    canceled: "Canceled",
    create: "Create",
    delete: "Delete",
    inactive: "Inactive",
    pending: "Pending",
    rejected: "Rejected",
    revoked: "Revoked",
    save: "Save",
    saving: "Saving...",
  },
  dashboard: {
    browseEvents: "Browse events",
    description:
      "A quick view of roster, club, event, registration, and attendance activity for your school.",
    eyebrow: "School activity overview",
    joinClubs: "Join clubs",
    studentEyebrow: "Student activity hub",
    studentOverviewDescription:
      "Use this dashboard to keep track of clubs you joined, upcoming event registrations, and attendance activity.",
    studentOverviewTitle: "Find what's happening at school.",
    studentDescription:
      "Your clubs, upcoming registrations, and attendance history in one place.",
    title: "Dashboard",
    viewRegisteredEvents: "View registered events",
  },
  join: {
    createAccount: "Create student account",
    creatingAccount: "Creating account...",
    description:
      "Enter the one-time invite code from your school to activate your student account.",
    email: "Email",
    eyebrow: "Verified student registration",
    inviteCode: "Invite code",
    password: "Password",
    title: "Join with invite code",
  },
  landing: {
    activityLabelAttendance: "Attendance",
    activityLabelClubs: "Club events",
    activityLabelInvites: "Invite access",
    activityRowAttendance: "Live check-in records",
    activityRowClubs: "Teacher approved",
    activityRowInvites: "One-time student codes",
    activityWeekOverview: "Activity week overview",
    checkIn: "Check-in",
    clubsAndEvents: "Clubs and events",
    demoWorkflow: "Demo workflow",
    events: "Events",
    goToDashboard: "Go to Dashboard",
    headline: "A calm, pilot-ready hub for verified student activities.",
    joinWithInviteCode: "Join with invite code",
    platformDescription:
      "School Activity Hub helps private schools manage rosters, invite code registration, clubs, event approvals, safety notes, and QR attendance without opening access to the public.",
    platformEyebrow: "Private school activity platform",
    qrReady: "QR ready",
    rostered: "Rostered",
    schoolPilotSnapshot: "School pilot snapshot",
    signIn: "Sign in",
    students: "Students",
    teacherOversightBody:
      "School admins and teachers manage approvals, safety notes, attendance, and reporting from one place.",
    teacherOversight: "Teacher oversight",
    verifiedAccess: "Verified access",
    verifiedStudentsOnlyBody:
      "Students activate accounts from a staff-managed roster with one-time invite codes.",
    verifiedStudentsOnly: "Verified students only",
    clubsAndEventsBody:
      "Students discover active clubs, register for approved events, and keep track of what is coming up.",
    workflowDescription:
      "Walk through the full activity flow using demo records first, then replace them with real school data when the pilot is ready.",
    workflowTitle: "Run a clean school pilot in five steps.",
  },
  language: {
    label: "Language",
  },
  login: {
    email: "Email",
    forgotPassword: "Forgot password?",
    password: "Password",
    signingIn: "Signing in...",
    signIn: "Sign in",
    title: "Sign in",
    description:
      "Use your school activity account to manage or join verified school activities.",
    eyebrow: "Account access",
  },
  nav: {
    account: "Account",
    announcements: "Announcements",
    approvals: "Approvals",
    clubs: "Clubs",
    dashboard: "Dashboard",
    events: "Events",
    inviteCodes: "Invite Codes",
    logout: "Log out",
    loggingOut: "Logging out...",
    main: "Main",
    manage: "Manage",
    menu: "Menu",
    operations: "Operations",
    profile: "Profile",
    reports: "Reports",
    schoolConnections: "School Connections",
    settings: "Settings",
    staff: "Staff",
    students: "Students",
  },
  roles: {
    noProfile: "No profile yet",
    schoolAdmin: "School Admin",
    student: "Student",
    teacher: "Teacher",
  },
  workflow: {
    addStudents: "Add students",
    createClubsEvents: "Create clubs/events",
    generateInviteCodes: "Generate invite codes",
    studentsJoin: "Students join",
    trackAttendance: "Track attendance",
  },
} as const;

export type Dictionary = {
  [Section in keyof typeof en]: {
    [Key in keyof (typeof en)[Section]]: string;
  };
};
