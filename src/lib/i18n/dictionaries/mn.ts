import type { PartialDictionary } from "./en";

export const mn = {
  app: {
    name: "Сургуулийн үйл ажиллагааны төв",
    shortName: "SAH",
    subtitle: "Клуб, арга хэмжээ, урилга ба ирц",
  },
  auth: {
    backToSignIn: "Нэвтрэх рүү буцах",
    errors: {
      invalidEmail: "Зөв имэйл хаяг оруулна уу.",
      passwordMinLength: "Нууц үг дор хаяж 8 тэмдэгттэй байх ёстой.",
    },
    join: {
      createAccount: "Сурагчийн бүртгэл үүсгэх",
      creatingAccount: "Бүртгэл үүсгэж байна...",
      description:
        "Сурагчийн бүртгэлээ идэвхжүүлэхийн тулд сургуулиас өгсөн нэг удаагийн урилгын кодыг оруулна уу.",
      email: "Имэйл",
      errors: {
        accountCreateFailed:
          "Бүртгэл үүсгэж чадсангүй. Өөр имэйл хаяг ашиглаж үзнэ үү.",
        inactiveRoster: "Энэ урилга идэвхтэй сурагчтай холбогдоогүй байна.",
        inviteExpired: "Урилгын кодын хугацаа дууссан байна.",
        inviteInactive:
          "Урилгын код аль хэдийн ашиглагдсан эсвэл идэвхгүй болсон байна.",
        inviteNoRoster:
          "Урилгын код бүртгэлд байгаа сурагчтай холбогдоогүй байна.",
        inviteNotFound: "Урилгын код олдсонгүй.",
        inviteRequired: "Урилгын кодоо оруулна уу.",
        inviteUsedDuringSignup:
          "Таны бүртгэл дуусахаас өмнө энэ урилгын код ашиглагдсан байна.",
        rosterClaimed:
          "Таны бүртгэл дуусахаас өмнө энэ жагсаалтын сурагчийн бүртгэл хэн нэгэнд холбогдсон байна.",
        studentAlreadyLinked: "Энэ сурагч аль хэдийн бүртгэлтэй байна.",
      },
      eyebrow: "Баталгаажсан сурагчийн бүртгэл",
      inviteCode: "Урилгын код",
      inviteCodePlaceholder: "ABCD-EFGH-IJ",
      password: "Нууц үг",
      success: "Бүртгэл үүслээ. Нэвтрэх хуудас руу очиж нэвтэрнэ үү.",
      title: "Урилгын кодоор нэгдэх",
    },
    login: {
      description:
        "Баталгаажсан сургуулийн үйл ажиллагааг удирдах эсвэл нэгдэхийн тулд сургуулийн үйл ажиллагааны бүртгэлээ ашиглана уу.",
      email: "Имэйл",
      eyebrow: "Бүртгэлийн хандалт",
      forgotPassword: "Нууц үгээ мартсан уу?",
      password: "Нууц үг",
      signingIn: "Нэвтэрч байна...",
      signIn: "Нэвтрэх",
      title: "Нэвтрэх",
    },
    reset: {
      description:
        "Бүртгэлийн имэйлээ оруулна уу. Бид нууц үг сэргээх холбоос илгээнэ.",
      email: "Имэйл",
      errors: {
        emailRequired: "Имэйл шаардлагатай.",
      },
      sending: "Илгээж байна...",
      submit: "Сэргээх имэйл илгээх",
      success:
        "Хэрэв энэ имэйлтэй бүртгэл байгаа бол нууц үг сэргээх холбоос илгээгдсэн.",
      title: "Нууц үг сэргээх",
    },
    updatePassword: {
      checkingLink: "Сэргээх холбоос шалгаж байна...",
      confirmPassword: "Шинэ нууц үгээ баталгаажуулах",
      description:
        "Имэйлээсээ сэргээх холбоосыг нээсний дараа шинэ нууц үгээ сонгоно уу.",
      errors: {
        passwordMismatch: "Нууц үгнүүд таарахгүй байна.",
      },
      goToDashboard: "Хянах самбар руу очих",
      newPassword: "Шинэ нууц үг",
      openResetLink:
        "Шинэ нууц үг тохируулахаасаа өмнө имэйлээсээ нууц үг сэргээх холбоосыг нээнэ үү.",
      submit: "Нууц үг шинэчлэх",
      success: "Нууц үг шинэчлэгдлээ. Та хянах самбар руу үргэлжлүүлж болно.",
      title: "Нууц үг шинэчлэх",
      updating: "Шинэчилж байна...",
    },
  },
  common: {
    active: "Идэвхтэй",
    approved: "Батлагдсан",
    cancel: "Цуцлах",
    canceled: "Цуцлагдсан",
    create: "Үүсгэх",
    delete: "Устгах",
    inactive: "Идэвхгүй",
    pending: "Хүлээгдэж буй",
    rejected: "Татгалзсан",
    revoked: "Хүчингүй болгосон",
    save: "Хадгалах",
    saving: "Хадгалж байна...",
  },
  status: {
    active: "Идэвхтэй",
    approved: "Батлагдсан",
    archived: "Архивлагдсан",
    canceled: "Цуцлагдсан",
    inactive: "Идэвхгүй",
    pending: "Хүлээгдэж буй",
    rejected: "Татгалзсан",
    revoked: "Хүчингүй болгосон",
  },
  dashboard: {
    browseEvents: "Арга хэмжээ үзэх",
    checkins: {
      description:
        "Батлагдсан арга хэмжээнүүдийн хамгийн сүүлийн амжилттай ирцийн check-in бүртгэлүүд.",
      emptyDescription:
        "Сурагчид арга хэмжээний QR холбоосоор check-in хийсний дараа сүүлийн check-in бүртгэлүүд энд харагдана.",
      emptyTitle: "Ирцийн check-in одоогоор алга",
      title: "Сүүлийн check-in бүртгэлүүд",
    },
    description:
      "Танай сургуулийн сурагчдын жагсаалт, клуб, арга хэмжээ, бүртгэл болон ирцийн үйл ажиллагааны товч харагдац.",
    eyebrow: "Сургуулийн үйл ажиллагааны тойм",
    fallback: {
      event: "Арга хэмжээ",
      rosterStudent: "Жагсаалтын сурагч",
    },
    joinClubs: "Клубт нэгдэх",
    nextSteps: {
      activeInviteCodes: "идэвхтэй урилгын код(ууд)",
      description:
        "Жагсаалт тохируулахаас ирц хянах хүртэл энэ тохиргооны дарааллыг дагана уу.",
      status: {
        done: "Дууссан",
        later: "Дараа",
        next: "Дараагийн",
        ready: "Бэлэн",
      },
      stepLabel: "Алхам {number}",
      steps: {
        addStudents: {
          description:
            "Эхлээд баталгаажсан сурагчдыг жагсаалтад нэмнэ үү. Сурагчид жагсаалтад орох хүртэл нэгдэх боломжгүй.",
          title: "Сурагч нэмэх",
        },
        createClubs: {
          description:
            "Сурагчид олж, нэгдэж, цаашдаа удирдахад оролцож болох клубуудыг нэмэх.",
          title: "Клуб үүсгэх",
        },
        createEvents: {
          description:
            "Сурагчид бүртгүүлж, оролцох боломжтой удахгүй болох үйл ажиллагааг нийтлэх.",
          title: "Арга хэмжээ үүсгэх",
        },
        generateInviteCodes: {
          description:
            "Жагсаалтад байгаа сурагчид бүртгэлээ идэвхжүүлэхийн тулд нэг удаагийн урилгын код үүсгэнэ үү.",
          title: "Урилгын код үүсгэх",
        },
        studentsJoin: {
          description:
            "Урилгын кодуудыг сурагчидтай хуваалцаж, өөрсдийн бүртгэлээ үүсгүүлэх.",
          title: "Сурагчид нэгдэх",
        },
        trackAttendance: {
          description:
            "Батлагдсан арга хэмжээнүүд бэлэн үед ирцийн хуудас болон QR check-in ашиглах.",
          title: "Ирц хянах",
        },
        viewReports: {
          description:
            "Үйл ажиллагаа эхэлсний дараа бүртгэл ба ирцийн хураангуйг шалгах.",
          title: "Тайлан харах",
        },
      },
      title: "Дараагийн алхмууд",
    },
    noProfile: {
      description:
        "Таны бүртгэл нэвтэрсэн боловч сургуулийн профайлтай холбогдоогүй байна.",
      guidance: "Сургуулийн админаас профайлыг тань бүрэн тохируулахыг хүснэ үү.",
    },
    quickActions: {
      addStudents: {
        description:
          "Бүртгэлээс өмнө баталгаажсан сурагчдыг үүсгэх эсвэл импортлох.",
        label: "Сурагч нэмэх",
      },
      createClub: {
        description: "Сурагчид олж нэгдэж болох бүлгийг нээх.",
        label: "Клуб үүсгэх",
      },
      createEvent: {
        description:
          "Батлагдсан арга хэмжээг нийтлэх эсвэл хянуулахаар илгээх.",
        label: "Арга хэмжээ үүсгэх",
      },
      generateInviteCodes: {
        description: "Жагсаалтад байгаа сурагчдад нэг удаагийн код олгох.",
        label: "Урилгын код үүсгэх",
      },
      viewReports: {
        description: "Экспорт, бүртгэл, ирцийн нийт дүнг шалгах.",
        label: "Тайлан харах",
      },
    },
    recommendedFlow: {
      description:
        "Сурагчид шууд өөрсдөө бүртгүүлэх боломжгүй. Эхлээд тэднийг жагсаалтад нэмээд, нэгдэхэд бэлэн болсон үед нэг удаагийн урилгын код үүсгэнэ үү.",
      title: "Санал болгож буй дараалал",
    },
    staffWelcome: {
      description:
        "Баталгаажсан жагсаалтаас эхэлж, урилгын код олгоод, дараа нь сурагчдад клуб олох, арга хэмжээнд нэгдэх, ирцээ бүртгүүлэхэд тусална уу.",
      eyebrow: "Өнөөдрийн ажлын талбар",
      title: "Сургуулийн үйл ажиллагааны туршилтаа нэг газраас удирдаарай.",
    },
    stats: {
      activeClubs: "Идэвхтэй клубууд",
      activeStudents: "Идэвхтэй сурагчид",
      attendanceCheckins: "Ирцийн check-in",
      eventRegistrations: "Арга хэмжээний бүртгэлүүд",
      upcomingEvents: "Удахгүй болох арга хэмжээнүүд",
    },
    student: {
      noRosterWarning:
        "Таны бүртгэл идэвхтэй жагсаалтын сурагчтай холбогдоогүй байна.",
    },
    studentActions: {
      browseEvents: {
        description:
          "Удахгүй болох батлагдсан үйл ажиллагааг харж, бэлэн үедээ бүртгүүлэх.",
      },
      joinClubs: {
        description:
          "Идэвхтэй клубүүдийг олж, өөрт тохирох бүлгүүдэд нэгдэх.",
      },
      viewRegisteredEvents: {
        description: "Өмнө бүртгүүлсэн арга хэмжээнүүдээ шалгах.",
      },
    },
    studentDescription:
      "Нэгдсэн клубууд, удахгүй болох арга хэмжээний бүртгэлүүд болон ирцийн үйл ажиллагаагаа хянахын тулд энэ хянах самбарыг ашиглана уу.",
    studentEyebrow: "Сурагчийн үйл ажиллагааны төв",
    studentOverviewDescription:
      "Нэгдсэн клубууд, удахгүй болох арга хэмжээний бүртгэлүүд болон ирцийн үйл ажиллагаагаа хянахын тулд энэ хянах самбарыг ашиглана уу.",
    studentOverviewTitle: "Сургууль дээр юу болж байгааг олох.",
    studentStats: {
      attendedEvents: "Оролцсон арга хэмжээнүүд",
      joinedClubs: "Нэгдсэн клубууд",
      registeredUpcomingEvents:
        "Бүртгүүлсэн удахгүй болох арга хэмжээнүүд",
    },
    title: "Хянах самбар",
    upcoming: {
      description:
        "Танай сургуулийн календарь дээрх дараагийн батлагдсан үйл ажиллагаанууд.",
      emptyDescription:
        "Ажилтнууд эсвэл клубын удирдагчид үүсгэсний дараа батлагдсан ирээдүйн арга хэмжээнүүд энд харагдана.",
      emptyTitle: "Удахгүй болох арга хэмжээ одоогоор алга",
      locationNotSet: "Байршил тохируулаагүй",
      title: "Удахгүй болох батлагдсан арга хэмжээнүүд",
    },
    viewRegisteredEvents: "Бүртгүүлсэн арга хэмжээг харах",
  },
  landing: {
    activityLabelAttendance: "Ирц",
    activityLabelClubs: "Клубын арга хэмжээнүүд",
    activityLabelInvites: "Урилгын хандалт",
    activityRowAttendance: "Шууд check-in бүртгэлүүд",
    activityRowClubs: "Багш баталсан",
    activityRowInvites: "Нэг удаагийн сурагчийн кодууд",
    activityWeekOverview: "Үйл ажиллагааны долоо хоногийн тойм",
    checkIn: "Check-in",
    clubsAndEvents: "Клуб ба арга хэмжээ",
    demoWorkflow: "Демо ажлын урсгал",
    events: "Арга хэмжээ",
    goToDashboard: "Хянах самбар руу очих",
    headline:
      "Баталгаажсан сурагчдын үйл ажиллагаанд зориулсан тайван, туршилтад бэлэн төв.",
    intro:
      "School Activity Hub нь хувийн сургуулиудад сурагчдын жагсаалт, урилгын кодоор бүртгүүлэх, клуб, арга хэмжээ батлах, аюулгүй байдлын тэмдэглэл болон QR ирцийг олон нийтэд нээхгүйгээр удирдахад тусална.",
    joinWithInviteCode: "Урилгын кодоор нэгдэх",
    platformEyebrow: "Хувийн сургуулийн үйл ажиллагааны платформ",
    qrReady: "QR бэлэн",
    rostered: "Жагсаалтад орсон",
    schoolPilotSnapshot: "Сургуулийн туршилтын товч тойм",
    signIn: "Нэвтрэх",
    students: "Сурагчид",
    teacherOversight: "Багшийн хяналт",
    verifiedAccess: "Баталгаажсан хандалт",
    verifiedStudentsOnly: "Зөвхөн баталгаажсан сурагчид",
    workflowTitle: "Сургуулийн туршилтыг 5 алхмаар цэгцтэй хэрэгжүүл.",
  },
  language: {
    en: "English",
    label: "Хэл",
    mn: "Монгол",
  },
  metadata: {
    description: "Хувийн сургуулийн клуб, арга хэмжээ, урилгын код, ирц.",
  },
  nav: {
    account: "Бүртгэл",
    announcements: "Зарлал",
    approvals: "Батлах хүсэлтүүд",
    clubs: "Клубууд",
    dashboard: "Хянах самбар",
    events: "Арга хэмжээ",
    inviteCodes: "Урилгын кодууд",
    logout: "Гарах",
    loggingOut: "Гарч байна...",
    main: "Үндсэн",
    manage: "Удирдах",
    menu: "Цэс",
    operations: "Үйл ажиллагаа",
    profile: "Профайл",
    reports: "Тайлангууд",
    schoolConnections: "Сургуулийн холболтууд",
    settings: "Тохиргоо",
    staff: "Ажилтнууд",
    students: "Сурагчид",
  },
  invites: {
    actions: {
      alreadyUsedOrInactive: "Аль хэдийн ашиглагдсан эсвэл идэвхгүй",
      bulkGenerateShort: "Бөөнөөр үүсгэх",
      generate: "Урилгын код үүсгэх",
      generating: "Үүсгэж байна...",
      revoke: "Код хүчингүй болгох",
      revoking: "Хүчингүй болгож байна...",
    },
    bulk: {
      allUnlinked: {
        description:
          "Хараахан бүртгүүлээгүй бүх идэвхтэй жагсаалтын сурагчид.",
        label: "Холбоогүй бүх идэвхтэй сурагчид",
      },
      copyTextList: "Текст жагсаалт хуулах",
      description:
        "Сурагчийн бүртгэл хараахан холбоогүй хэд хэдэн идэвхтэй сурагчид нэг удаагийн кодууд үүсгэнэ үү.",
      downloadCsv: "CSV татах",
      errors: {
        allAlreadyHaveCodes:
          "Сонгосон бүх сурагч аль хэдийн идэвхтэй урилгын кодтой тул урилгын код үүссэнгүй.",
        chooseFilter: "Анги, бүлэг эсвэл хоёуланг нь сонгоно уу.",
        chooseStudent: "Дор хаяж нэг сурагч сонгоно уу.",
        noMatches: "Энэ сонголтод тохирох идэвхтэй сурагч олдсонгүй.",
      },
      filters: {
        anyClassGroup: "Аль ч бүлэг",
        anyGrade: "Аль ч анги",
        classGroup: "Ангийн бүлэг",
        grade: "Анги",
      },
      filtered: {
        description: "Анги, бүлэг эсвэл хоёулангаар нь хязгаарлах.",
        label: "Анги эсвэл бүлгээр",
      },
      generatedTitle: "Үүссэн урилгын кодууд",
      noEligibleStudents:
        "Бөөн урилгын кодод тохирох холбоогүй идэвхтэй сурагч алга.",
      scope: "Үүсгэх хүрээ",
      selectStudents: "Сурагчид сонгох",
      selectStudentsDescription:
        "Зөвхөн холбогдсон профайлгүй идэвхтэй сурагчдыг жагсаасан.",
      selected: {
        description: "Холбоогүй идэвхтэй сурагчдыг нэг бүрчлэн сонгох.",
        label: "Сонгосон сурагчид",
      },
      submit: "Урилгын кодуудыг бөөнөөр үүсгэх",
      success: {
        generated:
          "{count} урилгын код үүслээ. Одоо хуулж эсвэл татаж аваарай; дахин харуулахгүй.",
        skippedExisting:
          "Сонгосон {count} сурагч аль хэдийн идэвхтэй урилгын кодтой байсан тул алгасагдлаа.",
      },
      title: "Урилгын кодуудыг бөөнөөр үүсгэх",
    },
    description:
      "Жагсаалтад байгаа сурагчид өөрийн бүртгэлээ идэвхжүүлэх боломжтой нэг удаагийн кодууд үүсгэнэ үү.",
    empty: {
      description:
        "Идэвхтэй жагсаалтын сурагч бүртгэлээ үүсгэхэд бэлэн үед код үүсгэнэ үү.",
      title: "Урилгын код одоогоор алга",
    },
    errors: {
      codesLoadFailed: "Урилгын кодуудыг ачаалж чадсангүй: {error}",
      staffOnly: "Зөвхөн сургуулийн админ болон багш нар урилгын код үүсгэх боломжтой.",
      studentAlreadyHasActiveCode:
        "Энэ сурагчид аль хэдийн идэвхтэй урилгын код байна.",
      studentInactiveOrWrongSchool:
        "Тэр сурагч идэвхтэй биш эсвэл танай сургуульд хамаарахгүй байна.",
      studentsLoadFailed: "Сурагчдыг ачаалж чадсангүй: {error}",
      studentRequired: "Идэвхтэй сурагч сонгоно уу.",
    },
    eyebrow: "Баталгаажсан бүртгэл",
    fallback: {
      rosterStudent: "Жагсаалтын сурагч",
    },
    history: {
      title: "Урилгын кодын түүх",
    },
    single: {
      chooseStudent: "Сурагч сонгох",
      description: "Идэвхтэй сурагчид зориулж нэг код үүсгэнэ үү.",
      gradeOption: "анги {grade}",
      noStudents: "Урилгын код үүсгэхээс өмнө идэвхтэй сурагч нэмнэ үү.",
      plainCodeLabel: "Энгийн урилгын код",
      studentLabel: "Идэвхтэй сурагч",
      title: "Нэг урилгын код үүсгэх",
    },
    success: {
      created: "Урилгын код үүслээ. Одоо хуулж аваарай; дахин харуулахгүй.",
    },
    table: {
      actions: "Үйлдэл",
      created: "Үүсгэсэн",
      expires: "Дуусах",
      redeemed: "Ашигласан",
      status: "Төлөв",
      student: "Сурагч",
    },
    title: "Урилгын кодууд",
  },
  roles: {
    noProfile: "Профайл хараахан байхгүй",
    schoolAdmin: "Сургуулийн админ",
    student: "Сурагч",
    teacher: "Багш",
  },
  students: {
    actions: {
      add: "Сурагч нэмэх",
      alreadyInactive: "Аль хэдийн идэвхгүй",
      importCsv: "CSV импортлох",
      markInactive: "Идэвхгүй болгох",
    },
    addSection: {
      description: "Хурдан нэмэлт эсвэл жижиг туршилтын жагсаалтад үүнийг ашиглана уу.",
      title: "Нэг сурагч нэмэх",
    },
    description:
      "Эхлээд сургуулийн сурагчдын жагсаалтыг бүрдүүлнэ үү. Ажилтнууд тэдгээрийг энд нэмээд урилгын код үүсгэсний дараа л сурагчид нэгдэх боломжтой.",
    empty: {
      description:
        "Урилгын код үүсгэхээс өмнө нэг сурагчийг гараар нэмэх эсвэл CSV импортлоно уу.",
      title: "Сурагч одоогоор алга",
    },
    errors: {
      duplicateStudentNumber:
        "Ийм сурагчийн дугаартай сурагч аль хэдийн байна.",
      firstAndLastName: "Нэр болон овгийг хоёуланг нь оруулна уу.",
      fullNameRequired: "Сурагчийн бүтэн нэр шаардлагатай.",
      gradeRequired: "Анги шаардлагатай.",
      loadFailed: "Сурагчдыг ачаалж чадсангүй: {error}",
      staffOnlyAdd: "Зөвхөн сургуулийн админ болон багш нар сурагч нэмэх боломжтой.",
    },
    eyebrow: "Жагсаалтын удирдлага",
    form: {
      adding: "Нэмж байна...",
      classGroup: "Ангийн бүлэг / homeroom",
      fullName: "Бүтэн нэр",
      grade: "Анги",
      studentNumber: "Сурагчийн дугаар",
      submit: "Сурагч нэмэх",
    },
    import: {
      errors: {
        csvEmpty: "CSV хоосон эсвэл толгой мөр байхгүй байна.",
        csvQuote: "гэнэтийн хашилт агуулсан байна.",
        csvUnclosedQuote: "хаагдаагүй хашилттай утга байна.",
        chooseFile: "Импортлох CSV файл сонгоно уу.",
        duplicatesExist:
          "Нэг буюу хэд хэдэн сурагчийн дугаар аль хэдийн байгаа тул импорт зогслоо.",
        missingFullNameHeader:
          "Header row is missing required column: full_name.",
        missingGradeHeader: "Header row is missing required column: grade.",
        staffOnly:
          "Зөвхөн сургуулийн админ болон багш нар сурагч импортлох боломжтой.",
      },
      fileLabel: "CSV файл",
      importing: "Импортолж байна...",
      result: {
        imported: "{count} сурагч импортлогдлоо.",
        noStudents: "Сурагч импортлогдоогүй.",
        skipped: "{count} мөр алгасагдсан:",
        more: "...мөн {count} мөр нэмж.",
      },
      sampleCsv:
        "full_name,grade,class_group,student_number\nAvery Stone,7,7A,S-1001\nMina Patel,8,8B,S-1002",
      sampleTitle: "CSV загвар формат",
      submit: "CSV импортлох",
    },
    importSection: {
      description:
        "Том жагсаалт бэлдэх үед нэг мөрөнд нэг сурагчтай CSV файл оруулна уу.",
      title: "Сурагчид импортлох",
    },
    roster: {
      title: "Жагсаалт",
    },
    success: {
      added: "Сурагч нэмэгдлээ.",
    },
    table: {
      actions: "Үйлдэл",
      classGroup: "Ангийн бүлэг",
      created: "Үүсгэсэн",
      fullName: "Бүтэн нэр",
      grade: "Анги",
      status: "Төлөв",
      studentNumber: "Сурагчийн дугаар",
    },
    title: "Сурагчид",
  },
  workflow: {
    addStudents: "Сурагч нэмэх",
    createClubsEvents: "Клуб/арга хэмжээ үүсгэх",
    generateInviteCodes: "Урилгын код үүсгэх",
    studentsJoin: "Сурагчид нэгдэх",
    trackAttendance: "Ирц хянах",
  },
} satisfies PartialDictionary;
