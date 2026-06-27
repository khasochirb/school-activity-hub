export const en = {
  app: {
    name: "School Activity Hub",
    shortName: "SAH",
    subtitle: "Clubs, events, invites, and attendance",
  },
  auth: {
    backToSignIn: "Back to sign in",
    errors: {
      invalidEmail: "Enter a valid email address.",
      passwordMinLength: "Password must be at least 8 characters.",
    },
    join: {
      createAccount: "Create student account",
      creatingAccount: "Creating account...",
      description:
        "Enter the one-time invite code from your school to activate your student account.",
      email: "Email",
      errors: {
        accountCreateFailed:
          "Account could not be created. Try a different email address.",
        inactiveRoster: "This invite is not linked to an active student.",
        inviteExpired: "Invite code has expired.",
        inviteInactive:
          "Invite code has already been used or is no longer active.",
        inviteNoRoster: "Invite code is not linked to a rostered student.",
        inviteNotFound: "Invite code was not found.",
        inviteRequired: "Enter your invite code.",
        inviteUsedDuringSignup:
          "This invite code was used before your signup finished.",
        rosterClaimed:
          "This roster student was claimed before your signup finished.",
        studentAlreadyLinked: "This student already has an account.",
      },
      eyebrow: "Verified student registration",
      inviteCode: "Invite code",
      inviteCodePlaceholder: "ABCD-EFGH-IJ",
      password: "Password",
      success: "Account created. Please go to login and sign in.",
      title: "Join with invite code",
    },
    login: {
      description:
        "Use your school activity account to manage or join verified school activities.",
      email: "Email",
      eyebrow: "Account access",
      forgotPassword: "Forgot password?",
      password: "Password",
      signingIn: "Signing in...",
      signIn: "Sign in",
      title: "Sign in",
    },
    reset: {
      description:
        "Enter your account email and we will send a password reset link.",
      email: "Email",
      errors: {
        emailRequired: "Email is required.",
      },
      sending: "Sending...",
      submit: "Send reset email",
      success:
        "If an account exists for that email, a password reset link has been sent.",
      title: "Reset password",
    },
    updatePassword: {
      checkingLink: "Checking reset link...",
      confirmPassword: "Confirm new password",
      description:
        "Choose a new password after opening the reset link from your email.",
      errors: {
        passwordMismatch: "Passwords do not match.",
      },
      goToDashboard: "Go to dashboard",
      newPassword: "New password",
      openResetLink:
        "Open the password reset link from your email before setting a new password.",
      submit: "Update password",
      success: "Password updated. You can continue to your dashboard.",
      title: "Update password",
      updating: "Updating...",
    },
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
    checkins: {
      description:
        "The latest successful attendance check-ins for approved events.",
      emptyDescription:
        "After students check in with an event QR link, recent check-ins will appear here.",
      emptyTitle: "No attendance check-ins yet",
      title: "Recent check-ins",
    },
    description:
      "A quick view of roster, club, event, registration, and attendance activity for your school.",
    eyebrow: "School activity overview",
    fallback: {
      event: "Event",
      rosterStudent: "Roster student",
    },
    joinClubs: "Join clubs",
    nextSteps: {
      activeInviteCodes: "active invite code(s)",
      description:
        "Follow this setup path to move from roster setup to attendance tracking.",
      status: {
        done: "Done",
        later: "Later",
        next: "Next",
        ready: "Ready",
      },
      stepLabel: "Step {number}",
      steps: {
        addStudents: {
          description:
            "Start by adding verified students to the roster. Students cannot join until they are rostered.",
          title: "Add students",
        },
        createClubs: {
          description:
            "Add clubs students can discover, join, and eventually help lead.",
          title: "Create clubs",
        },
        createEvents: {
          description:
            "Publish upcoming activities for students to register for and attend.",
          title: "Create events",
        },
        generateInviteCodes: {
          description:
            "Create one-time invite codes so rostered students can activate their accounts.",
          title: "Generate invite codes",
        },
        studentsJoin: {
          description:
            "Share invite codes with students and have them create their own accounts.",
          title: "Students join",
        },
        trackAttendance: {
          description:
            "Use the attendance page and QR check-in when approved events are ready.",
          title: "Track attendance",
        },
        viewReports: {
          description:
            "Review registration and attendance summaries once activity starts.",
          title: "View reports",
        },
      },
      title: "Next steps",
    },
    noProfile: {
      description:
        "Your account is signed in, but it is not connected to a school profile yet.",
      guidance: "Ask a school admin to finish setting up your profile.",
    },
    quickActions: {
      addStudents: {
        description: "Create or import verified students before registration.",
        label: "Add students",
      },
      createClub: {
        description: "Open a group students can discover and join.",
        label: "Create club",
      },
      createEvent: {
        description: "Publish an approved event or submit one for review.",
        label: "Create event",
      },
      generateInviteCodes: {
        description: "Issue one-time codes for rostered students.",
        label: "Generate invite codes",
      },
      viewReports: {
        description: "Review exports, registrations, and attendance totals.",
        label: "View reports",
      },
    },
    recommendedFlow: {
      description:
        "Students cannot self-register freely. Add them to the roster first, then generate one-time invite codes when they are ready to join.",
      title: "Recommended flow",
    },
    staffWelcome: {
      description:
        "Start with a verified roster, issue invite codes, then help students find clubs, join events, and check in for attendance.",
      eyebrow: "Today's workspace",
      title: "Guide your school activity pilot from one place.",
    },
    stats: {
      activeClubs: "Active clubs",
      activeStudents: "Active students",
      attendanceCheckins: "Attendance check-ins",
      eventRegistrations: "Event registrations",
      upcomingEvents: "Upcoming events",
    },
    student: {
      noRosterWarning:
        "Your account is not linked to an active roster student yet.",
    },
    studentActions: {
      browseEvents: {
        description:
          "See upcoming approved activities and register when ready.",
      },
      joinClubs: {
        description: "Find active clubs and join the groups that fit you.",
      },
      viewRegisteredEvents: {
        description: "Check the events you have already registered for.",
      },
    },
    studentDescription:
      "Use this dashboard to keep track of clubs you joined, upcoming event registrations, and attendance activity.",
    studentEyebrow: "Student activity hub",
    studentOverviewDescription:
      "Use this dashboard to keep track of clubs you joined, upcoming event registrations, and attendance activity.",
    studentOverviewTitle: "Find what's happening at school.",
    studentStats: {
      attendedEvents: "Attended events",
      joinedClubs: "Joined clubs",
      registeredUpcomingEvents: "Registered upcoming events",
    },
    title: "Dashboard",
    upcoming: {
      description: "The next approved activities on your school calendar.",
      emptyDescription:
        "Approved future events will appear here once staff or club leaders create them.",
      emptyTitle: "No upcoming events yet",
      locationNotSet: "Location not set",
      title: "Upcoming approved events",
    },
    viewRegisteredEvents: "View registered events",
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
    clubsAndEventsBody:
      "Students discover active clubs, register for approved events, and keep track of what is coming up.",
    demoWorkflow: "Demo workflow",
    events: "Events",
    goToDashboard: "Go to Dashboard",
    headline: "A calm, pilot-ready hub for verified student activities.",
    intro:
      "School Activity Hub helps private schools manage rosters, invite code registration, clubs, event approvals, safety notes, and QR attendance without opening access to the public.",
    joinWithInviteCode: "Join with invite code",
    platformEyebrow: "Private school activity platform",
    qrReady: "QR ready",
    rostered: "Rostered",
    schoolPilotSnapshot: "School pilot snapshot",
    signIn: "Sign in",
    students: "Students",
    teacherOversight: "Teacher oversight",
    teacherOversightBody:
      "School admins and teachers manage approvals, safety notes, attendance, and reporting from one place.",
    verifiedAccess: "Verified access",
    verifiedStudentsOnly: "Verified students only",
    verifiedStudentsOnlyBody:
      "Students activate accounts from a staff-managed roster with one-time invite codes.",
    workflowDescription:
      "Walk through the full activity flow using demo records first, then replace them with real school data when the pilot is ready.",
    workflowTitle: "Run a clean school pilot in five steps.",
  },
  language: {
    en: "English",
    label: "Language",
    mn: "Монгол",
  },
  metadata: {
    description: "Private school clubs, events, invite codes, and attendance.",
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

export type Dictionary = typeof en;

export type PartialDictionary = DeepPartialDictionary<Dictionary>;

type DeepPartialDictionary<T> = T extends string
  ? string
  : {
      [Key in keyof T]?: DeepPartialDictionary<T[Key]>;
    };
