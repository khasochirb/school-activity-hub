import type { PartialDictionary } from "./en";

export const mn = {
  app: {
    name: "Сургуулийн үйл ажиллагааны төв",
    shortName: "SAH",
    subtitle: "Клуб, үйл ажиллагаа, урилга ба ирц",
  },
  feedback: {
    archiveClub: "Клуб архивлах",
    areYouSure: "Та итгэлтэй байна уу?",
    cannotBeUndone: "Энэ үйлдлийг буцаах боломжгүй.",
    cancelEvent: "Үйл ажиллагаа цуцлах",
    clearDemoData: "Демо өгөгдөл цэвэрлэх",
    confirm: "Баталгаажуулах",
    deactivateStaff: "Ажилтны эрхийг идэвхгүй болгох",
    deleteAnnouncement: "Зарлал устгах",
    error: "Алдаа",
    info: "Мэдээлэл",
    reactivateStaff: "Ажилтны эрхийг дахин идэвхжүүлэх",
    revokeInviteCode: "Код цуцлах",
    savedSuccessfully: "Амжилттай хадгалагдлаа",
    somethingWentWrong: "Алдаа гарлаа",
    success: "Амжилттай",
    warning: "Анхааруулга",
  },
  routeError: {
    backToDashboard: "Хяналтын самбар руу буцах",
    description:
      "Түр зуурын алдааны улмаас хуудсыг ачаалж чадсангүй. Маягтыг дахин илгээхгүйгээр дахин оролдоно уу.",
    retry: "Дахин оролдох",
    title: "Хуудсыг ачаалж чадсангүй",
  },
  a11y: {
    primaryNavigation: "Үндсэн навигаци",
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
      inviteExpired: "Урилгын кодын хугацаа дууссан.",
        inviteInactive:
          "Урилгын код аль хэдийн ашиглагдсан эсвэл идэвхгүй болсон байна.",
        inviteNoRoster:
          "Урилгын код бүртгэлд байгаа сурагчтай холбогдоогүй байна.",
        inviteNotFound: "Урилгын код буруу байна.",
        inviteRequired: "Урилгын код оруулна уу.",
        inviteUsedDuringSignup:
          "Таны бүртгэл дуусахаас өмнө энэ урилгын код ашиглагдсан байна.",
        profileSaveFailed:
          "Бүртгэл үүссэн боловч профайлыг бүрэн дуусгаж чадсангүй. Сургуулийн ажилтнаас тусламж авна уу.",
        rosterClaimed:
          "Таны бүртгэл дуусахаас өмнө энэ жагсаалтын сурагчийн бүртгэл хэн нэгэнд холбогдсон байна.",
        studentAlreadyLinked: "Энэ сурагч аль хэдийн бүртгэлтэй байна.",
      },
      eyebrow: "Баталгаажсан сурагчийн бүртгэл",
      inviteCode: "Урилгын код",
      inviteCodePlaceholder: "ABCD-EFGH-IJ",
      password: "Нууц үг",
      success: "Бүртгэл амжилттай үүслээ. Нэвтрэх хуудас руу очиж нэвтэрнэ үү.",
      title: "Урилгын кодоор бүртгүүлэх",
    },
    login: {
      description:
        "Баталгаажсан сургуулийн үйл ажиллагааг удирдах эсвэл нэгдэхийн тулд сургуулийн үйл ажиллагааны бүртгэлээ ашиглана уу.",
      email: "Имэйл",
      eyebrow: "Бүртгэлийн хандалт",
      failed:
        "Нэвтэрч чадсангүй. Имэйл болон нууц үгээ шалгаад дахин оролдоно уу.",
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
        requestFailed:
          "Нууц үг сэргээх хүсэлтийг илгээж чадсангүй. Дахин оролдоно уу.",
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
        updateFailed:
          "Нууц үгийг шинэчилж чадсангүй. Дахин оролдоно уу.",
      },
      goToDashboard: "Хяналтын самбар руу очих",
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
    addManually: "Гараар нэмэх",
    approved: "Батлагдсан",
    back: "Буцах",
    backToDashboard: "Хяналтын самбар руу буцах",
    backToEvents: "Үйл ажиллагаа руу буцах",
    cancel: "Цуцлах",
    canceled: "Цуцлагдсан",
    close: "Хаах",
    continue: "Үргэлжлүүлэх",
    create: "Үүсгэх",
    createNew: "Шинээр үүсгэх",
    custom: "Бусад",
    delete: "Устгах",
    details: "Дэлгэрэнгүй",
    hideDetails: "Дэлгэрэнгүйг нуух",
    hideForm: "Маягт нуух",
    inactive: "Идэвхгүй",
    importFromCsv: "Сурагчдыг жагсаалтад нэмэх",
    lessDetails: "Бага дэлгэрэнгүй",
    moreDetails: "Илүү дэлгэрэнгүй",
    no: "Үгүй",
    noExtraDetails: "Нэмэлт мэдээлэл алга",
    notAvailableShort: "N/A",
    notSpecified: "Тодорхойлоогүй",
    open: "Нээх",
    next: "Дараах",
    pending: "Хүлээгдэж буй",
    pageNumber: "Хуудас {number}",
    primaryAction: "Үндсэн үйлдэл",
    previous: "Өмнөх",
    rejected: "Татгалзсан",
    revoked: "Цуцалсан",
    save: "Хадгалах",
    saving: "Хадгалж байна...",
    showForm: "Маягт харуулах",
    showLess: "Бага харуулах",
    showMore: "Илүү харуулах",
    summary: "Товч мэдээлэл",
    viewAll: "Бүгдийг харах",
    viewDetails: "Дэлгэрэнгүй харах",
    yes: "Тийм",
  },
  status: {
    active: "Идэвхтэй",
    approved: "Батлагдсан",
    archived: "Архивлагдсан",
    blocked: "Хориглосон",
    canceled: "Цуцлагдсан",
    draft: "Ноорог",
    inactive: "Идэвхгүй",
    pending: "Хүлээгдэж буй",
    pendingApproval: "Зөвшөөрөл хүлээгдэж буй",
    redeemed: "Ашигласан",
    rejected: "Татгалзсан",
    revoked: "Цуцалсан",
  },
  filters: {
    active: "Идэвхтэй",
    all: "Бүгд",
    allCategories: "Бүх ангилал",
    archived: "Архивлагдсан",
    category: "Ангилал",
    clear: "Шүүлтүүр арилгах",
    direction: "Чиглэл",
    expired: "Хугацаа дууссан",
    filter: "Шүүлтүүр",
    inactive: "Идэвхгүй",
    noResults: "Илэрц олдсонгүй",
    noResultsDescription: "Өөр хайлт хийж эсвэл шүүлтүүрийг арилгана уу.",
    past: "Өнгөрсөн",
    received: "Хүлээн авсан",
    role: "Үүрэг",
    search: "Хайх",
    searchAnnouncements: "Зарлал хайх",
    searchClubs: "Клуб хайх",
    searchEvents: "Үйл ажиллагаа хайх",
    searchSchools: "Сургууль хайх",
    searchStaff: "Ажилтан хайх",
    searchStudents: "Сурагч хайх",
    sent: "Илгээсэн",
    showingResults: "{count} үр дүн харуулж байна",
    status: "Төлөв",
    time: "Цаг",
    upcoming: "Удахгүй болох",
  },
  categories: {
    academic: "Хичээл/судалгаа",
    arts: "Урлаг",
    career: "Карьер",
    culture: "Соёл",
    leadership: "Манлайлал",
    mentalHealth: "Сэтгэцийн эрүүл мэнд",
    other: "Бусад",
    outdoor: "Гадаа үйл ажиллагаа",
    social: "Нийгмийн",
    sports: "Спорт",
    volunteering: "Сайн дурын ажил",
  },
  clubs: {
    actions: {
      archive: "Клуб архивлах",
      archiving: "Архивлаж байна...",
      create: "Клуб үүсгэх",
      creating: "Клуб үүсгэж байна...",
      join: "Клубт элсэх",
      joining: "Элсэж байна...",
      leave: "Клубээс гарах",
      leaving: "Гарч байна...",
      makeLeader: "Клубын удирдагч болгох",
    },
    active: {
      title: "Идэвхтэй клуб",
    },
    create: {
      description: "Сурагчдад нээлттэй элсэх боломжтой идэвхтэй клуб нэмнэ үү.",
    },
    description:
      "Сурагчид элсэж болох клубууд үүсгэж, бэлэн үед сурагч удирдагч томилно уу.",
    empty: {
      staffDescription:
        "Сурагчид элсэх зүйлтэй болохын тулд эхний клубийг үүсгэнэ үү.",
      studentDescription:
        "Сургуулийн ажилтнууд үүсгэсний дараа идэвхтэй клубууд энд харагдана.",
      title: "Одоогоор клуб алга",
    },
    errors: {
      duplicateName: "Ийм нэртэй клуб аль хэдийн байна.",
      invalidCategory: "Зөв ангилал сонгоно уу.",
      invalidStatus: "Зөв клубын төлөв сонгоно уу.",
      loadFailed: "Клубыг ачаалж чадсангүй. Дахин ачаалаад оролдоно уу.",
      nameRequired: "Клубын нэр шаардлагатай.",
      nameTooShort:
        "Клубын нэр дор хаяж 3 үсэг эсвэл тоо агуулсан байх ёстой.",
      staffOnlyCreate:
        "Зөвхөн сургуулийн админ болон багш нар клуб үүсгэх боломжтой.",
    },
    eyebrow: "Сурагчдын бүлгүүд",
    fallback: {
      rosterStudent: "Жагсаалтын сурагч",
    },
    filters: {
      description:
        "Идэвхтэй клубын жагсаалтыг үйл ажиллагааны ангиллаар шүүнэ үү.",
      title: "Клуб хайх",
    },
    form: {
      category: "Ангилал",
      description: "Тайлбар",
      name: "Клубын нэр",
      noCategory: "Ангилалгүй",
      status: "Төлөв",
    },
    members: {
      empty:
        "Гишүүд одоогоор алга. Сурагчид энэ клубт элссэний дараа энд харагдана.",
      title: "Гишүүд",
    },
    memberRoles: {
      leader: "Ахлагч",
      member: "Гишүүн",
    },
    student: {
      noRosterWarning:
        "Таны бүртгэл идэвхтэй жагсаалтын сурагчтай холбогдоогүй байна.",
    },
    success: {
      created: "Клуб үүслээ.",
    },
    title: "Клуб",
  },
  clubRequests: {
    actions: {
      approve: "Зөвшөөрч клуб үүсгэх",
      approving: "Зөвшөөрч байна...",
      archive: "Хүсэлтийг архивлах",
      archiving: "Архивлаж байна...",
      reject: "Хүсэлтийг татгалзах",
      rejecting: "Татгалзаж байна...",
      submit: "Клубын санаа илгээх",
      submitting: "Илгээж байна...",
      suggest: "Клуб санал болгох",
      support: "Энэ клубыг дэмжих",
      supported: "Дэмжсэн",
      supporting: "Дэмжиж байна...",
      unsupporting: "Дэмжлэгийг цуцалж байна...",
    },
    create: {
      description:
        "Клубын санаагаа ажилтнуудад илгээнэ үү. Ажилтнууд хянахаас өмнө бусад сурагчид дэмжиж болно.",
    },
    empty: {
      staffDescription:
        "Ажилтнууд хянах шаардлагатай сурагчдын клубын санаанууд энд харагдана.",
      staffTitle: "Хүсэлт байхгүй байна",
      studentDescription: "Анхны клубын санааг санал болгоорой",
      studentTitle: "Одоогоор клубын санаа алга",
    },
    errors: {
      createFailed: "Клубын санааг илгээж чадсангүй. Дахин оролдоно уу.",
      invalidCategory: "Зөв ангилал сонгоно уу.",
      loadFailed:
        "Клуб байгуулах хүсэлтийг ачаалж чадсангүй. Дахин ачаалаад оролдоно уу.",
      studentsOnlyCreate: "Зөвхөн сурагчид клубын санаа илгээх боломжтой.",
      titleRequired: "Клубын нэр шаардлагатай.",
      tooManyPending:
        "Танд хянагдаж буй 3 клубын санаа байна. Дараагийн санаа нэмэхээс өмнө ажилтнуудын хяналтыг хүлээнэ үү.",
    },
    eyebrow: "Сурагчдын хэрэгцээ",
    fallback: {
      student: "Сурагч",
    },
    fields: {
      category: "Ангилал",
      createdAt: "Үүссэн огноо",
      createdBy: "Үүсгэсэн",
      description: "Энэ клуб яагаад хэрэгтэй вэ?",
      rejectionReason: "Татгалзсан шалтгаан",
      reviewedAt: "Хянасан огноо",
      supportRate: "Дэмжлэгийн хувь",
      supporters: "Дэмжигчид",
      title: "Клубын нэр",
    },
    filters: {
      searchPlaceholder: "Клубын санаа хайх",
    },
    list: {
      staffTitle: "Бүх клуб байгуулах хүсэлт",
      studentTitle: "Клубын санаа",
    },
    messages: {
      approved: "Клубыг зөвшөөрсөн",
      becameClub: "Хүсэлтийн дагуу клуб үүссэн",
    },
    staffDecisionNotice:
      "Сурагчид клубын санааг дэмжиж болох ч эцсийн шийдвэрийг багш, ажилтнууд гаргана.",
    staffDescription:
      "Сурагчдын клубын санааг хянаж, дэмжлэгийг харьцуулж, сургууль клуб үүсгэхэд бэлэн үед хүсэлтийг зөвшөөрнө.",
    staffTitle: "Клуб байгуулах хүсэлт",
    status: {
      approved: "Зөвшөөрсөн",
      pendingReview: "Зөвшөөрөл хүлээгдэж буй",
      rejected: "Татгалзсан",
    },
    studentDescription:
      "Шинэ клуб санал болгож, сургуулийнхаа бусад сурагчдын санааг дэмжээрэй.",
    studentTitle: "Клубын санаа",
    success: {
      created: "Клубын санаа илгээгдлээ.",
    },
  },
  events: {
    actions: {
      attendanceQr: "QR ирц",
      cancel: "Үйл ажиллагааг цуцлах",
      cancelMyRegistration: "Бүртгэл цуцлах",
      cancelling: "Цуцалж байна...",
      create: "Үйл ажиллагаа үүсгэх",
      createApproved: "Батлагдсан үйл ажиллагаа үүсгэх",
      creating: "Үйл ажиллагаа үүсгэж байна...",
      eventFull: "Бүртгэл дүүрсэн",
      join: "Үйл ажиллагаанд бүртгүүлэх",
      joining: "Нэгдэж байна...",
      resetFilters: "Шүүлтүүрийг дахин тохируулах",
      saveSafety: "Аюулгүй байдлын мэдээлэл хадгалах",
      saveDecisionInfo: "Оролцох мэдээллийг хадгалах",
      savePracticalDetails: "Практик мэдээллийг хадгалах",
      saveSupervisionSchedule: "Хяналт ба хуваарийн өөрчлөлтийг хадгалах",
      saveSharing: "Хуваалцах тохиргоо хадгалах",
      submitForApproval: "Зөвшөөрөл хүсэх",
      submitting: "Илгээж байна...",
    },
    capacity: {
      noLimit: "Хязгааргүй",
    },
    calendar: {
      moreCount: "+{count} бусад",
      nextMonth: "Дараагийн сар",
      noEventsOnDate: "Энэ өдөр үйл ажиллагаа байхгүй.",
      noMatchingEventsOnDate: "Энэ өдөр тохирох үйл ажиллагаа байхгүй.",
      previousMonth: "Өмнөх сар",
      schoolCalendar: "Сургуулийн хуанли",
      selectedDate: "Сонгосон өдөр",
      title: "Хуанли",
      today: "Өнөөдөр",
    },
    calendarActions: {
      add: "Хуанлид нэмэх",
      download: "Хуанлийн файл татах",
      google: "Google Calendar",
      registeredSuggestion: "Энэ үйл ажиллагааг хуанлидаа нэмээрэй",
    },
    card: {
      details: "Үйл ажиллагааны дэлгэрэнгүй",
      eventType: "Үйл ажиллагааны төрөл",
      hostedBy: "Зохион байгуулагч",
      location: "Байршил",
      maxParticipants: "Багтаамж",
      mySchool: "Манай сургууль",
      permission: "Зөвшөөрөл",
      registration: "Бүртгэл",
      safety: "Аюулгүй байдал",
      schoolEvent: "Сургуулийн үйл ажиллагаа",
    },
    create: {
      leaderDescription:
        "Клубын удирдагчийн үйл ажиллагаанд сурагчид зөвшөөрөгдсөний дараа бүртгүүлэх боломжтой.",
      leaderNeedsClub:
        "Клубын удирдагчаар томилогдсоны дараа үйл ажиллагаа илгээх боломжтой.",
      staffDescription:
        "Сургуулийн ажилтнуудын үүсгэсэн үйл ажиллагаа шууд батлагдаж, удахгүй болох үед сурагчдад харагдана.",
    },
    description:
      "Батлагдсан үйл ажиллагаа үүсгэж, сурагчдын бүртгэлийг удирдаж, үйл ажиллагаа эхлэхэд ирцийн бүртгэл нээнэ үү.",
    detail: {
      approvedAt: "Батлагдсан",
      attendance: "Ирц",
      createdAt: "Үүссэн",
      eventInformation: "Үйл ажиллагааны мэдээлэл",
      internalEvent: "Дотоод үйл ажиллагаа",
      management: "Удирдлага",
      noDescription: "Тайлбар оруулаагүй байна",
      overview: "Тойм",
      rejectionReason: "Татгалзсан шалтгаан",
      registrationSummary: "Бүртгэлийн товч мэдээлэл",
      sharing: "Хуваалцах",
      staffTools: "Ажилтны хэрэгслүүд",
      statusInformation: "Төлөвийн мэдээлэл",
      submittedAt: "Илгээсэн",
      timeline: "Явцын мэдээлэл",
      youHaveCheckedIn: "Таны ирц бүртгэгдсэн байна",
    },
    empty: {
      noPastTitle: "Өнгөрсөн үйл ажиллагаа алга",
      noUpcomingTitle: "Удахгүй болох үйл ажиллагаа алга",
      staffDescription:
        "Батлагдсан үйл ажиллагаа үүсгэх, клубын үйл ажиллагаа батлагдахыг хүлээх эсвэл шүүлтүүрийг өөрчилнө үү.",
      studentDescription:
        "Ажилтнууд эсвэл клубын удирдагчид нийтэлсний дараа батлагдсан удахгүй болох үйл ажиллагаа энд харагдана.",
      title: "Эдгээр шүүлтүүрт тохирох үйл ажиллагаа алга",
    },
    errors: {
      accessibilityTooLong: "Хүртээмжийн мэдээлэл хэт урт байна.",
      commitmentTooLong: "Оролцох хугацааны мэдээлэл хэт урт байна.",
      costNotesTooLong: "Төлбөрийн тайлбар хэт урт байна.",
      createFailed:
        "Үйл ажиллагааг үүсгэж чадсангүй. Мэдээллээ шалгаад дахин оролдоно уу.",
      eligibilityTooLong: "Оролцох шаардлагын мэдээлэл хэт урт байна.",
      invalidCategory: "Зөв ангилал сонгоно уу.",
      invalidClub: "Зөв клуб сонгоно уу.",
      invalidCostAmount: "Төлбөрийн зөв эерэг дүн оруулна уу.",
      invalidCostCurrency: "Дэмжигдсэн валют сонгоно уу.",
      invalidCostType: "Төлбөрийн зөв төрлийг сонгоно уу.",
      invalidExperienceLevel: "Туршлагын зөв түвшнийг сонгоно уу.",
      invalidResponsibleStaff:
        "Танай сургуулийн идэвхтэй багш эсвэл сургуулийн админыг сонгоно уу.",
      invalidRiskLevel: "Зөв эрсдэлийн түвшин сонгоно уу.",
      leaderClubRequired:
        "Клубын удирдагчид өөрийн клубүүдээс нэгийг сонгох ёстой.",
      loadFailed:
        "Үйл ажиллагааг ачаалж чадсангүй. Дахин ачаалаад оролдоно уу.",
      loadUnavailable:
        "Үйл ажиллагааны мэдээлэл одоогоор боломжгүй байна. Дахин ачаалаад оролдоно уу.",
      loadUnavailableWithReference:
        "Үйл ажиллагааны мэдээлэл одоогоор боломжгүй байна. Дахин ачаалаад оролдоно уу. Лавлах дугаар: {reference}",
      locationRequired: "Байршил шаардлагатай.",
      materialsTooLong: "Шаардлагатай хэрэгслийн мэдээлэл хэт урт байна.",
      scheduleNoticeTooLong:
        "Хуваарийн өөрчлөлтийн мэдэгдэл хэт урт байна.",
      maxParticipantsPositive:
        "Багтаамж эерэг тоо байх ёстой.",
      staffOrLeaderOnly:
        "Зөвхөн сургуулийн ажилтан эсвэл клубын удирдагч үйл ажиллагаа үүсгэх боломжтой.",
      staffSupervisionScheduleOnly:
        "Зөвхөн сургуулийн багш, ажилтан хяналт эсвэл хуваарийн өөрчлөлтийн мэдээлэл оруулах боломжтой.",
      supervisionTooLong: "Хяналтын мэдээлэл хэт урт байна.",
      paidCostRequired:
        "Төлбөртэй үйл ажиллагаанд төлбөрийн эерэг дүн шаардлагатай.",
      timeRequired: "Эхлэх болон дуусах цаг шаардлагатай.",
      titleRequired: "Үйл ажиллагааны нэр шаардлагатай.",
      unauthenticated: "Та нэвтэрсэн байх ёстой.",
      unexpectedCostDetails:
        "Төлбөрийн дүн эсвэл валют нь сонгосон төлбөрийн төрөлтэй тохирохгүй байна.",
      validTimeOrder: "Дуусах цаг эхлэх цагаас хойш байх ёстой.",
      variableCostNotesRequired:
        "Нөхцөлөөс хамаарах төлбөртэй үйл ажиллагаанд товч тайлбар шаардлагатай.",
      authorization_error: "Танд энэ үйл ажиллагааг үүсгэх эрх алга.",
      conflict_error: "Энэ үйл ажиллагаа одоо байгаа бүртгэлтэй давхцаж байна.",
      schema_update_required: "Энэ үйлдлийг ашиглахын өмнө Events өгөгдлийн сангийн шинэчлэлийг ажиллуулна уу.",
      service_unavailable: "Үйл ажиллагааны үйлчилгээ түр боломжгүй байна. Удахгүй дахин оролдоно уу.",
      reference: "Лавлах дугаар: {reference}",
      unexpected_error: "Үйл ажиллагааг үүсгэж чадсангүй. Дахин оролдоно уу.",
      validation_error: "Тэмдэглэсэн мэдээллийг шалгана уу.",
    },
    eyebrow: "Үйл ажиллагааны календарь",
    fallback: {
      clubEvent: "Клубын үйл ажиллагаа",
      connectedSchool: "Холбогдсон сургууль",
    },
    filters: {
      allEvents: "Бүх үйл ажиллагаа",
      category: "Ангилал",
      club: "Клубын үйл ажиллагаа",
      createdByMe: "Миний үүсгэсэн",
      description:
        "Танай сургуулийн үйл ажиллагаа, хуваалцсан үйл ажиллагаа, бүртгэлүүд, клубын үйл ажиллагаа болон ангиллуудын хооронд шилжинэ үү.",
      eventsFound: "{count} үйл ажиллагаа олдлоо",
      myClubEvents: "Миний клубын үйл ажиллагаа",
      myRegistered: "Миний бүртгүүлсэн үйл ажиллагаа",
      mySchool: "Манай сургуулийн үйл ажиллагаа",
      partnerEvents: "Хамтрагч сургуулийн үйл ажиллагаа",
      partnerSchool: "Хамтрагч сургууль",
      pendingReview: "Зөвшөөрөл хүлээгдэж буй",
      registered: "Бүртгүүлсэн",
      schoolEvents: "Сургуулийн үйл ажиллагаа",
      shared: "Хуваалцсан үйл ажиллагаа",
      title: "Үйл ажиллагаа хайх",
      upcoming: "Удахгүй болох",
      viewLabel: "Үйл ажиллагааны харагдац",
    },
    formGroups: {
      basicDetails: "Үндсэн мэдээлэл",
      dateTime: "Огноо ба цаг",
      practicalDetails: "Практик мэдээлэл",
      safetyPermissions: "Аюулгүй байдал, зөвшөөрөл",
      whoCanAttend: "Хэн оролцож болох, юу хүлээх вэ",
    },
    formSteps: {
      basics: "Үндсэн мэдээлэл",
      participation: "Оролцох мэдээлэл",
      review: "Хянах",
    },
    form: {
      category: "Ангилал",
      club: "Клуб",
      description: "Тайлбар",
      duration30: "30 минут",
      duration60: "1 цаг",
      duration90: "1.5 цаг",
      duration120: "2 цаг",
      endTime: "Дуусах цаг",
      endsAt: "Дуусах огноо",
      eventDate: "Эхлэх огноо",
      eventTimePreview: "Үйл ажиллагааны цагийн урьдчилсан харагдац",
      location: "Байршил",
      maxParticipants: "Багтаамж",
      noCategory: "Ангилалгүй",
      permissionNote: "Зөвшөөрлийн тайлбар",
      permissionNotePlaceholder:
        "Ажилтнууд, сурагчид эсвэл гэр бүлд зориулсан нэмэлт тайлбар",
      permissionRequired: "Зөвшөөрөл шаардлагатай",
      quickDuration: "Хугацаа хурдан сонгох",
      riskLevel: "Эрсдэлийн түвшин",
      schoolWideEvent: "Сургуулийн хэмжээний үйл ажиллагаа",
      startTime: "Эхлэх цаг",
      startsAt: "Эхлэх огноо",
      timePreviewEmpty: "Хуваарийг урьдчилан харахын тулд огноо, цаг сонгоно уу.",
      timezoneHelper: "Цагийг танай сургуулийн цагийн бүсээр хадгална.",
      title: "Үйл ажиллагааны нэр",
    },
    decisionInfo: {
      accessibilityGuidance:
        "Хүртээмжийн мэдээлэл нь үйл ажиллагаа болон орчныг тайлбарлана. Сурагчид хөгжлийн бэрхшээлтэй эсэхээ олон нийтэд мэдэгдэх шаардлагагүй.",
      accessibilityInformation: "Хүртээмжийн мэдээлэл",
      accessibilityNotProvided: "Хүртээмжийн мэдээлэл оруулаагүй",
      accessibilityPlaceholder:
        "Байршил, үйл ажиллагааны хэлбэр, боломжтой дэмжлэгийг тайлбарлана уу",
      eligibility: "Оролцох шаардлага, ангийн мэдээлэл",
      eligibilityNotSpecified: "Оролцох шаардлагыг тодорхойлоогүй",
      eligibilityPlaceholder:
        "Оролцож болох анги болон холбогдох туршлагыг тайлбарлана уу",
      experienceLevel: "Туршлагын түвшин",
      experienceNotSpecified: "Туршлагын түвшнийг тодорхойлоогүй",
      responsibleAdult: "Хариуцсан багш/ажилтан",
      responsibleAdultHelp:
        "Энэ үйл ажиллагааг хариуцах идэвхтэй багш эсвэл сургуулийн админыг сонгоно уу.",
      responsibleAdultReviewHelp:
        "Сургуулийн ажилтан хянан үзэхдээ хариуцсан багш/ажилтныг томилно.",
      responsibleNotSpecified: "Хариуцсан багш/ажилтныг тодорхойлоогүй",
    },
    experience: {
      beginnerFriendly: "Анхлан оролцогчдод тохиромжтой",
      priorExperienceRecommended: "Өмнөх туршлагатай байхыг зөвлөж байна",
    },
    practicalDetails: {
      amount: "Дүн",
      commitmentNotSpecified: "Оролцох хугацааг тодорхойлоогүй",
      commitmentPlaceholder:
        "Жишээ: Нэг удаагийн 90 минутын уулзалт эсвэл долоо хоногт хоёр бэлтгэл",
      cost: "Төлбөр",
      costNotes: "Төлбөрийн тайлбар",
      costNotesPlaceholder:
        "Жишээ: хэрэгслийн түрээс багтсан эсвэл төлбөрийн эцсийн хугацаа",
      costNotSpecified: "Төлбөрийн мэдээлэл тодорхойгүй",
      currency: "Валют",
      expectedCommitment: "Оролцох хугацаа, давтамж",
      free: "Үнэгүй",
      materialsNotSpecified: "Шаардлагатай хэрэгслийг тодорхойлоогүй",
      materialsPlaceholder:
        "Оролцогчид юу авчрах шаардлагатайг тайлбарлана уу",
      nothingRequired: "Шаардлагатай зүйлгүй",
      paid: "Төлбөртэй",
      privacyGuidance:
        "Төлбөр болон хэрэгслийн мэдээлэл нь үйл ажиллагааг тайлбарлана. Сурагчид санхүүгийн нөхцөл байдал, хөгжлийн бэрхшээл эсвэл шаардлагатай хэрэгсэлтэй эсэхээ олон нийтэд мэдэгдэх шаардлагагүй.",
      requiredMaterials: "Шаардлагатай хэрэгсэл",
      variableCost: "Нөхцөлөөс хамаарах төлбөр",
    },
    presets: {
      accessibleWashroom: "Хүртээмжтэй ариун цэврийн өрөө",
      allStudents: "Бүх сурагчид",
      clubMembers: "Клубын гишүүд",
      device: "Төхөөрөмж",
      fullTerm: "Улирлын турш",
      notebookAndPen: "Дэвтэр, үзэг",
      oneTime: "Нэг удаа",
      quietEnvironment: "Чимээгүй орчин",
      seatingAvailable: "Суух боломжтой",
      specificGrades: "Тодорхой ангиуд",
      sportswear: "Спортын хувцас",
      twiceWeekly: "Долоо хоногт хоёр удаа",
      weekly: "Долоо хоног бүр",
      wheelchairAccessibleLocation: "Тэргэнцэртэй зорчих боломжтой байршил",
    },
    supervisionSchedule: {
      importantScheduleUpdate: "Хуваарийн чухал өөрчлөлт",
      noScheduleChanges: "Хуваарийн өөрчлөлт байхгүй",
      scheduleChangeNotice: "Хуваарийн өөрчлөлтийн мэдэгдэл",
      scheduleNoticeGuidance:
        "Зөвхөн цуцлалт, хойшлолт эсвэл сурагчдын мэдэх шаардлагатай чухал өөрчлөлтөд ашиглана уу. Огноо, цаг, байршил, төлөвийн үндсэн мэдээлэл хүчинтэй хэвээр байна.",
      scheduleNoticePlaceholder:
        "Цуцлалт, хойшлолт эсвэл чухал өөрчлөлтийн талаар сурагчдад мэдээлнэ үү",
      scheduleUpdate: "Хуваарийн өөрчлөлт",
      supervisionGuidance:
        "Бодит хяналтын зохион байгуулалтыг тайлбарлана уу. Хувийн холбоо барих мэдээлэл эсвэл сурагчийн эрсдэлийн мэдээллийг бүү оруулна уу.",
      supervisionInformation: "Хяналтын мэдээлэл",
      supervisionNotSpecified: "Хяналтын мэдээлэл оруулаагүй",
      supervisionPlaceholder:
        "Сурагчдад хэрхэн хяналт тавихыг тайлбарлана уу",
      title: "Хяналт ба хуваарийн өөрчлөлт",
    },
    listTitles: {
      club: "Клубын үйл ажиллагаа",
      past: "Өнгөрсөн үйл ажиллагаа",
      registered: "Миний бүртгүүлсэн үйл ажиллагаа",
      sharedClub: "Хуваалцсан клубын үйл ажиллагаа",
      sharedPast: "Хуваалцсан өнгөрсөн үйл ажиллагаа",
      sharedRegistered: "Хуваалцсан бүртгүүлсэн үйл ажиллагаа",
      sharedUpcoming: "Хуваалцсан удахгүй болох үйл ажиллагаа",
      upcoming: "Удахгүй болох үйл ажиллагаа",
    },
    permission: {
      mayBeRequired: "Шаардлагатай байж магадгүй",
      notRequired: "Шаардлагагүй",
      note: "Зөвшөөрлийн тайлбар",
      required: "Зөвшөөрөл шаардлагатай",
      status: {
        declined: "Зөвшөөрөл татгалзсан",
        notRequired: "Зөвшөөрөл шаардлагагүй",
        pending: "Зөвшөөрөл хүлээгдэж буй",
        received: "Зөвшөөрөл авсан",
      },
      studentNotice:
        "Энэ үйл ажиллагаанд сургууль/эцэг эхийн зөвшөөрөл шаардлагатай байж магадгүй.",
    },
    completeness: {
      detailsCompleted: "Мэдээлэл бүрдсэн",
      goBackAndComplete: "Буцаж нөхөх",
      listingCompleteness: "Мэдээллийн бүрдэл",
      missingInformation: "Дутуу мэдээлэл",
      needsMoreDetails: "Нэмэлт мэдээлэл шаардлагатай",
      publishAnyway: "Ямартай ч нийтлэх",
      readyToPublish: "Нийтлэхэд бэлэн",
      submitProposalAnyway: "Саналыг үргэлжлүүлэн илгээх",
    },
    platform: {
      allSchools: "Бүх сургууль",
      creatingForSchool: "{school}-д үйл ажиллагаа үүсгэж байна",
      description:
        "Үйл ажиллагааг харах болон удирдах сургуулиа сонгоно уу.",
      globalResults: "Бүх идэвхтэй сургуулийн үйл ажиллагааг харуулж байна.",
      invalidSchool: "Зөв идэвхтэй сургууль сонгоно уу.",
      mode: "Платформын администраторын горим",
      school: "Сургууль",
      schoolContext: "Сургуулийн үйл ажиллагааны орчин",
      selectSchoolRequired: "Үйл ажиллагаа үүсгэхийн өмнө сургууль сонгоно уу.",
      selectedSchool: "Сонгосон сургууль: {school}",
    },
    quickView: {
      registrationFull: "Бүртгэл дүүрсэн",
      spacesRemaining: "Үлдсэн суудал",
      title: "Үйл ажиллагааны товч мэдээлэл",
      viewEvent: "Үйл ажиллагааг харах",
      viewFullDetails: "Дэлгэрэнгүй мэдээлэл харах",
    },
    registration: {
      checkedIn: "Ирц бүртгүүлсэн",
      count: "{count} бүртгүүлсэн",
      joined: "Бүртгэгдсэн",
      maxSuffix: "/ {count} багтаамжтай",
      notJoined: "Бүртгүүлээгүй",
      unavailable: "Бүртгүүлэх боломжгүй",
      youAreRegistered: "Бүртгэгдсэн",
    },
    risk: {
      high: "Өндөр эрсдэлтэй",
      low: "Бага эрсдэлтэй",
      medium: "Дунд эрсдэлтэй",
    },
    schedule: {
      later: "Дараа",
      past: "Өнгөрсөн үйл ажиллагаа",
      thisWeek: "Энэ долоо хоног",
      today: "Өнөөдөр",
    },
    sharing: {
      allowConnectedRegistration:
        "Холбогдсон сургуулийн сурагчдыг бүртгүүлэхийг зөвшөөрөх",
      internalOnly: "Зөвхөн дотоод",
      noConnections: "Батлагдсан сургуулийн холболт одоогоор алга.",
      shareWith: "Хуваалцах сургууль",
      sharedEvent: "Хуваалцсан үйл ажиллагаа",
      sharedMany: "{count} сургуультай хуваалцсан",
      sharedManyRegistration:
        "{count} сургуультай хуваалцсан + бүртгэл",
      sharedOne: "1 сургуультай хуваалцсан",
    },
    student: {
      noRosterWarning:
        "Таны бүртгэл идэвхтэй жагсаалтын сурагчтай холбогдоогүй байна.",
    },
    success: {
      createdApproved: "Үйл ажиллагаа үүсэж батлагдлаа.",
      submittedForApproval: "Зөвшөөрөл хүсэлт илгээгдлээ.",
    },
    validation: {
      dateRequired: "Огноо шаардлагатай.",
      endTimeRequired: "Дуусах цаг шаардлагатай.",
      startTimeRequired: "Эхлэх цаг шаардлагатай.",
      timeOrder: "Дуусах цаг нь эхлэх цагаас хойш байх ёстой.",
    },
    view: {
      calendar: "Хуанлигаар харах",
      list: "Жагсаалт",
      month: "Сар",
      schedule: "Хуваариар харах",
      viewCalendar: "Хуанли харах",
      viewList: "Жагсаалт харах",
      viewSchedule: "Хуваарь харах",
      viewWeek: "Долоо хоногоор харах",
      week: "Долоо хоног",
    },
    week: {
      nextWeek: "Дараагийн долоо хоног",
      noEventsOnDay: "Энэ өдөр үйл ажиллагаа байхгүй",
      noEventsThisWeek: "Энэ долоо хоногт үйл ажиллагаа байхгүй",
      previousWeek: "Өмнөх долоо хоног",
      title: "Долоо хоногоор харах",
    },
    title: "Үйл ажиллагаа",
  },
  approvals: {
    actions: {
      approve: "Үйл ажиллагааг зөвшөөрөх",
      approving: "Зөвшөөрч байна...",
      reject: "Үйл ажиллагааны хүсэлтийг татгалзах",
      rejecting: "Татгалзаж байна...",
    },
    description:
      "Клубын удирдагчийн үйл ажиллагааны хүсэлтүүдийг сурагчдад харагдахаас өмнө шалгана уу.",
    empty: {
      description:
        "Клубын удирдагчийн илгээсэн хүсэлтүүд ажилтны хяналт шаардлагатай үед энд харагдана.",
      title: "Зөвшөөрөл хүлээгдэж буй үйл ажиллагаа алга",
    },
    errors: {
      loadFailed:
        "Хүлээгдэж буй үйл ажиллагааг ачаалж чадсангүй. Дахин ачаалаад оролдоно уу.",
    },
    event: {
      location: "Байршил",
      maxParticipants: "Багтаамж",
      permission: "Зөвшөөрөл",
      safety: "Аюулгүй байдал",
      submitted: "Илгээсэн",
    },
    fallback: {
      clubEvent: "Клубын үйл ажиллагаа",
    },
    pending: {
      title: "Зөвшөөрөл хүлээгдэж буй үйл ажиллагаа",
    },
    reject: {
      reasonLabel: "Татгалзсан шалтгаан",
    },
    title: "Үйл ажиллагааны зөвшөөрөл",
  },
  attendance: {
    actions: {
      copied: "Хуулагдсан",
      copyLink: "Ирцийн холбоос хуулах",
      openLink: "Ирцийн холбоос нээх",
      savePermission: "Зөвшөөрөл хадгалах",
    },
    checkInLink: {
      description:
        "Ирц бүртгэл нээлттэй үед энэ холбоос эсвэл QR кодыг бүртгүүлсэн сурагчидтай хуваалцана уу.",
      fullUrl: "Ирцийн бүртгэлийн бүтэн URL",
      title: "Ирцийн холбоос",
    },
    empty: {
      description:
        "Энэ үйл ажиллагаанд нэгдсэн сурагчид зөвшөөрөл хянах болон ирц бүртгүүлэхэд энд харагдана.",
      noCheckIns: "Одоогоор ирц бүртгэгдээгүй байна",
      noStudentsRegistered: "Одоогоор сурагч бүртгүүлээгүй байна",
      title: "Бүртгүүлсэн сурагч одоогоор алга",
    },
    errors: {
      invalidPermissionStatus: "Зөв зөвшөөрлийн төлөв сонгоно уу.",
    },
    fallback: {
      registeredStudent: "Бүртгүүлсэн сурагч",
    },
    filters: {
      allStudents: "Бүх сурагчид",
      checkedIn: "Ирц бүртгүүлсэн",
      notCheckedIn: "Ирц бүртгүүлээгүй",
    },
    list: {
      registeredCount: "{count} бүртгүүлсэн сурагч",
      title: "Ирцийн жагсаалт",
    },
    methods: {
      admin: "Админ",
      manual: "Гараар",
      qr: "QR",
    },
    permission: {
      badge: {
        declined: "Зөвшөөрөл татгалзсан",
        notRequired: "Зөвшөөрөл шаардлагагүй",
        pending: "Зөвшөөрөл хүлээгдэж буй",
        received: "Зөвшөөрөл авсан",
      },
      status: {
        declined: "Татгалзсан",
        pending: "Хүлээгдэж буй",
        received: "Авсан",
      },
      warning:
        "Энэ бүртгүүлсэн сурагчийн зөвшөөрөл хараахан авагдаагүй байна.",
    },
    qr: {
      ariaLabel: "Үйл ажиллагааны ирцийн холбоосын QR код",
      instruction: "Ирц бүртгүүлэхийн тулд энэ кодыг уншуулна уу",
      title: "Ирцийн QR",
    },
    summary: {
      attendanceRate: "Ирцийн хувь",
      checkedIn: "Ирц бүртгүүлсэн",
      notCheckedIn: "Ирц бүртгүүлээгүй",
      registeredStudents: "Бүртгүүлсэн сурагчид",
      title: "Ирцийн товч мэдээлэл",
    },
    table: {
      checkInStatus: "Ирцийн төлөв",
      checkInTime: "Ирц бүртгэсэн цаг",
      checkedIn: "Ирц бүртгүүлсэн",
      grade: "Анги",
      method: "Арга",
      permission: "Зөвшөөрөл",
      registrationStatus: "Бүртгэлийн төлөв",
      school: "Сургууль",
      status: "Төлөв",
      student: "Сурагч",
    },
    status: {
      attended: "Ирсэн",
      registered: "Бүртгүүлсэн",
    },
    title: "QR ирц",
  },
  checkIn: {
    actions: {
      checkIn: "Ирц бүртгүүлэх",
      checkingIn: "Ирц бүртгэж байна...",
    },
    details: {
      location: "Байршил",
      permission: "Зөвшөөрөл",
      safety: "Аюулгүй байдал",
      time: "Цаг",
    },
    errors: {
      activeStudentsOnly:
        "Зөвхөн идэвхтэй сурагчийн бүртгэл энэ ирцийн холбоосыг ашиглах боломжтой.",
      eventUnavailable: "Энэ үйл ажиллагаанд ирц бүртгүүлэх боломжгүй.",
      invalidRegistrationStatus:
        "Энэ үйл ажиллагааны бүртгэлээр ирц бүртгүүлэх боломжгүй.",
      missingEvent: "Энэ ирцийн холбоост үйл ажиллагаа алга.",
      mustJoinFirst: "Ирц бүртгүүлэхээс өмнө энэ үйл ажиллагаанд нэгдэнэ үү.",
      noRoster:
        "Таны бүртгэл идэвхтэй жагсаалтын сурагчтай холбогдоогүй байна.",
    },
    failedTitle: "Ирц бүртгэгдсэнгүй",
    helpText: "Тусламж хэрэгтэй бол энэ хуудсыг ажилтанд үзүүлнэ үү.",
    permissionNote: "Зөвшөөрлийн тайлбар",
    success: {
      alreadyCheckedIn: "Та аль хэдийн ирцээ бүртгүүлсэн байна.",
      checkedIn: "Ирц амжилттай бүртгэгдлээ",
    },
    successTitle: "Ирц амжилттай бүртгэгдлээ",
    title: "Үйл ажиллагааны ирц",
  },
  reports: {
    actions: {
      exportCsv: "CSV экспортлох",
    },
    countLabels: {
      checkins: "Ирцийн бүртгэл",
      registrations: "Бүртгэлүүд",
    },
    description:
      "Сургуулийн хэмжээний үйл ажиллагааны хураангуйг шалгаж, жагсаалт, бүртгэл болон ирцийн CSV файлууд экспортлоно уу.",
    explorer: {
      attendanceDefinition:
        "Бүртгэгдсэн ирцийн хувь нь дор хаяж нэг ирц бүртгэгдсэн, дууссан үйл ажиллагааг хамарна. Ирцийн бүртгэлгүйг батлагдсан таслалт гэж үзэхгүй.",
      attendanceNotRecorded: "Ирц бүртгэгдээгүй",
      charts: {
        participationByCategory: "Ангиллаарх оролцоо",
        participationOverTime: "Хугацааны явц дахь оролцоо",
        recordedAttendance: "Бүртгэгдсэн ирц",
        registrationComparison: "Бүртгэл ба бүртгэгдсэн ирц",
        viewAllActivities: "Бүх үйл ажиллагааг харах",
      },
      description:
        "Сургуулийн үйл ажиллагаа, бүртгэл, бүртгэгдсэн ирцийн мэдээллийг харах.",
      empty: {
        activitiesDescription:
          "Сонгосон шүүлтүүрт тохирох дууссан үйл ажиллагаа алга.",
        activitiesTitle: "Энэ хугацаанд үйл ажиллагаа алга",
        noParticipation: "Энэ хугацаанд оролцооны мэдээлэл алга",
        noParticipationDescription:
          "Тайлангийн шүүлтүүрийг өөрчлөх эсвэл дууссан үйл ажиллагааны ирцийг бүртгэнэ үү.",
        studentsDescription:
          "Одоогийн хайлтад тохирох идэвхтэй сурагч алга.",
        studentsTitle: "Сурагч олдсонгүй",
      },
      errors: {
        loadFailed:
          "Үйл ажиллагааны тайланг ачаалж чадсангүй. Дахин ачаалаад оролдоно уу.",
        studentDetailsFailed:
          "Сурагчийн үйл ажиллагааны дэлгэрэнгүйг ачаалж чадсангүй. Хэсгийг хаагаад дахин оролдоно уу.",
      },
      filters: {
        activity: "Үйл ажиллагаа",
        allTime: "Бүх хугацаа",
        attendance: "Ирцийн бүртгэл",
        attendanceRecorded: "Ирц бүртгэгдсэн",
        customRange: "Тусгай хугацаа",
        dateRange: "Огнооны хүрээ",
        from: "Эхлэх",
        last30Days: "Сүүлийн 30 хоног",
        last90Days: "Сүүлийн 90 хоног",
        school: "Сургууль",
        to: "Дуусах",
      },
      metrics: {
        activitiesHeld: "Зохион байгуулсан үйл ажиллагаа",
        participatingStudents: "Оролцсон сурагчид",
        recordedAttendanceRate: "Бүртгэгдсэн ирцийн хувь",
        recordedCheckins: "Бүртгэгдсэн ирц",
        totalRegistrations: "Нийт бүртгэл",
      },
      platform: {
        description: "Үйл ажиллагааны тайланг харах нэг сургуулийг сонгоно уу.",
        selectSchool: "Сургууль сонгох",
        unavailable: "Сургуулийн сонголт одоогоор ашиглах боломжгүй байна.",
      },
      students: {
        clubsJoined: "Элссэн клуб",
        detailsTitle: "Сурагчийн үйл ажиллагааны дэлгэрэнгүй",
        filteredHistory: "Шүүсэн үйл ажиллагааны түүх",
        joinedClubs: "Элссэн клубүүд",
        lastParticipation: "Хамгийн сүүлд бүртгэгдсэн оролцоо",
        loading: "Оролцооны мэдээллийг ачаалж байна...",
        recentParticipation: "Сүүлийн үеийн оролцоо",
        recordedAttendances: "Бүртгэгдсэн ирц",
        registrationWithoutCheckin: "Ирц бүртгэгдээгүй бүртгэл",
        searchStudents: "Сурагч хайх",
        upcomingRegistrations: "Удахгүй болох бүртгэлүүд",
        viewDetails: "Оролцооны дэлгэрэнгүй харах",
      },
      table: {
        date: "Огноо",
        responsibleStaff: "Хариуцсан ажилтан",
        searchActivities: "Үйл ажиллагаа хайх",
        sortBy: "Эрэмбэлэх",
      },
      tabs: {
        activities: "Үйл ажиллагаа",
        overview: "Тойм",
        students: "Сурагчид",
      },
      title: "Үйл ажиллагааны тайлан",
    },
    empty: {
      addStudents: "Сурагч нэмэх",
      createEvent: "Үйл ажиллагаа үүсгэх",
      description:
        "Тайлан харахын тулд үйл ажиллагаа зохион байгуулж, ирц бүртгэнэ үү.",
      title: "Одоогоор тайлангийн өгөгдөл алга",
    },
    exports: {
      attendanceCheckins: "Ирцийн бүртгэл",
      description:
        "Туршилтын үнэлгээ эсвэл админы хүлээлгэн өгөхөд зориулж сургуулийн хүрээний CSV файлууд татна уу.",
      downloadCsv: "CSV татах",
      eventRegistrations: "Үйл ажиллагааны бүртгэл",
      exportNotFound: "Экспорт олдсонгүй",
      notFound: "Олдсонгүй",
      studentRoster: "Сурагчдын жагсаалт",
      title: "Тайлан экспортлох",
    },
    eyebrow: "Үйл ажиллагааны тайлагнал",
    fallback: {
      event: "Үйл ажиллагаа",
      rosterStudent: "Жагсаалтын сурагч",
    },
    sections: {
      attendanceSummary: "Ирцийн товч мэдээлэл",
      eventActivity: "Үйл ажиллагаа",
      exportReports: "Тайлан экспортлох",
      overview: "Тайлангийн тойм",
      participationSummary: "Оролцооны товч мэдээлэл",
    },
    summary: {
      activeClubs: "Идэвхтэй клуб",
      activeStudents: "Идэвхтэй сурагчид",
      approvedEvents: "Батлагдсан үйл ажиллагаа",
      attendanceCheckins: "Ирцийн бүртгэл",
      attendanceRate: "Ирцийн хувь",
      eventRegistrations: "Үйл ажиллагааны бүртгэл",
      totalEvents: "Нийт үйл ажиллагаа",
      totalStudents: "Нийт сурагчид",
    },
    table: {
      detail: "Дэлгэрэнгүй",
      gradeDetail: "Анги {grade}",
      name: "Нэр",
    },
    tables: {
      emptyTitle: "Хүснэгтийн өгөгдөл одоогоор алга",
      eventsWithMostCheckins: {
        emptyDescription:
          "Үйл ажиллагааны ирцийн бүртгэлийн нийт дүн одоогоор алга. Сурагчид ирцээ бүртгүүлсний дараа үйл ажиллагаа энд харагдана.",
        title: "Хамгийн олон ирцийн бүртгэлтэй үйл ажиллагаа",
      },
      eventsWithMostRegistrations: {
        emptyDescription:
          "Үйл ажиллагааны бүртгэлийн нийт дүн одоогоор алга. Сурагчид бүртгүүлсний дараа үйл ажиллагаа энд харагдана.",
        title: "Хамгийн олон бүртгэлтэй үйл ажиллагаа",
      },
      studentsWithMostCheckins: {
        emptyDescription:
          "Сурагчдын ирцийн нийт дүн одоогоор алга. Үйл ажиллагаанд QR холбоос ашигласны дараа ирцийн бүртгэл харагдана.",
        title: "Хамгийн олон ирцийн бүртгэлтэй сурагчид",
      },
      studentsWithMostRegistrations: {
        emptyDescription:
          "Сурагчдын бүртгэлийн нийт дүн одоогоор алга. Сурагчид үйл ажиллагаанд нэгдсэний дараа энд харагдана.",
        title: "Хамгийн олон үйл ажиллагааны бүртгэлтэй сурагчид",
      },
    },
    title: "Тайлангууд",
  },
  announcements: {
    actions: {
      archive: "Мэдэгдэл архивлах",
      archiving: "Архивлаж байна...",
      create: "Зарлал үүсгэх",
      posting: "Нийтэлж байна...",
    },
    create: {
      description: "Энэ туршилтад мэдэгдлийг богино, сургуулийн хэмжээнд байлгаарай.",
      title: "Зарлал нийтлэх",
    },
    description:
      "Нэвтэрсний дараа сурагчид болон ажилтнууд харах боломжтой сургуулийн мэдэгдэл нийтэлнэ үү.",
    empty: {
      staffDescription:
        "Сурагчид харах шаардлагатай зүйл байвал сургуулийн мэдэгдэл нийтэлнэ үү.",
      studentDescription:
        "Ажилтнууд нийтэлсний дараа идэвхтэй сургуулийн мэдэгдлүүд энд харагдана.",
      title: "Зарлал одоогоор алга",
    },
    errors: {
      bodyRequired: "Зарлалын агуулга шаардлагатай.",
      invalidStatus: "Зөв зарлалын төлөв сонгоно уу.",
      loadFailed: "Зарлалуудыг ачаалж чадсангүй. Дахин ачаалаад оролдоно уу.",
      staffOnlyCreate:
        "Зөвхөн сургуулийн админ болон багш нар зарлал үүсгэх боломжтой.",
      titleRequired: "Зарлалын гарчиг шаардлагатай.",
    },
    eyebrow: "Сургуулийн мэдэгдэл",
    form: {
      body: "Агуулга",
      status: "Төлөв",
      title: "Гарчиг",
    },
    list: {
      staffTitle: "Сургуулийн мэдэгдэл",
      studentTitle: "Идэвхтэй мэдэгдлүүд",
    },
    success: {
      created: "Зарлал үүслээ.",
    },
    title: "Зарлал",
  },
  profile: {
    accountDetails: "Бүртгэлийн мэдээлэл",
    actions: {
      save: "Хувийн мэдээлэл хадгалах",
    },
    description: "Бүртгэлийн мэдээллээ харж, харагдах нэрээ шинэчилнэ үү.",
    errors: {
      fullNameRequired: "Бүтэн нэр шаардлагатай.",
    },
    fallback: {
      noProfileFound: "Хувийн мэдээлэл олдсонгүй",
      notAvailable: "Боломжгүй",
    },
    fields: {
      email: "Имэйл",
      fullName: "Бүтэн нэр",
      role: "Үүрэг",
      school: "Сургууль",
      status: "Төлөв",
    },
    roster: {
      classGroup: "Ангийн бүлэг / homeroom",
      grade: "Анги",
      name: "Жагсаалтын нэр",
      notFound: "Энэ сурагчийн бүртгэлд холбогдсон жагсаалтын бичлэг олдсонгүй.",
      status: "Жагсаалтын төлөв",
      studentNumber: "Сурагчийн дугаар",
      title: "Сурагчдын жагсаалт",
    },
    settings: {
      description:
        "Та бүтэн нэрээ шинэчилж болно. Үүрэг болон сургуулийг ажилтнууд удирдана.",
      noProfileRow:
        "Энэ бүртгэлтэй холбогдсон профайлын мөр одоогоор алга.",
      title: "Хувийн мэдээллийн тохиргоо",
    },
    success: {
      updated: "Хувийн мэдээлэл шинэчлэгдлээ.",
    },
    title: "Хувийн мэдээлэл",
  },
  staff: {
    actions: {
      createTeacher: "Багш үүсгэх",
      creating: "Үүсгэж байна...",
      deactivateTeacher: "Багшийг идэвхгүй болгох",
      protectedAccount: "Хамгаалагдсан бүртгэл",
      reactivateTeacher: "Багшийг дахин идэвхжүүлэх",
    },
    create: {
      description:
        "Багшид зориулсан имэйл/нууц үгийн нэвтрэх бүртгэл үүсгэнэ үү. Имэйл урилга одоогоор идэвхжээгүй.",
      title: "Багшийн бүртгэл үүсгэх",
    },
    description:
      "Энэ сургуулийн багшийн бүртгэл үүсгэж, ажилтны хандалтыг удирдана уу.",
    empty: {
      description:
        "Сургуулийн админ үүсгэсэн багшийн бүртгэлүүд энд харагдана.",
      title: "Ажилтны профайл одоогоор алга",
    },
    errors: {
      duplicateProfile: "Тэр бүртгэлд профайл аль хэдийн байна.",
      emailRequired: "Багшийн имэйл шаардлагатай.",
      fullNameRequired: "Багшийн бүтэн нэр шаардлагатай.",
      loadFailed: "Ажилтнуудыг ачаалж чадсангүй. Дахин ачаалаад оролдоно уу.",
      passwordMinLength: "Нууц үг дор хаяж 8 тэмдэгттэй байх ёстой.",
      staffOnlyCreate:
        "Зөвхөн сургуулийн админ багшийн бүртгэл үүсгэх боломжтой.",
      teacherCreateFailed: "Багшийн бүртгэл үүсгэж чадсангүй.",
    },
    fallback: {
      emailUnavailable: "Имэйл боломжгүй",
    },
    form: {
      email: "Имэйл",
      fullName: "Бүтэн нэр",
      temporaryPassword: "Түр нууц үг",
    },
    profiles: {
      title: "Ажилтны профайлууд",
    },
    success: {
      created: "Багшийн бүртгэл үүслээ.",
    },
    table: {
      actions: "Үйлдэл",
      created: "Үүсгэсэн",
      email: "Имэйл",
      fullName: "Бүтэн нэр",
      role: "Үүрэг",
      status: "Төлөв",
    },
    title: "Ажилтнууд",
  },
  settings: {
    actions: {
      save: "Сургуулийн тохиргоо хадгалах",
    },
    description:
      "Сургуулийн нэр, аймаг/муж болон сургуулийн профайлын мэдээллийг шинэчилнэ үү.",
    empty: {
      noSchool: "Таны профайлд сургуулийн бичлэг олдсонгүй.",
    },
    errors: {
      loadFailed:
        "Сургуулийн мэдээллийг ачаалж чадсангүй. Дахин ачаалаад оролдоно уу.",
      nameRequired: "Сургуулийн нэр шаардлагатай.",
      updateStaffOnly:
        "Зөвхөн сургуулийн админ сургуулийн тохиргоо шинэчлэх боломжтой.",
    },
    fields: {
      province: "Аймаг/муж",
      schoolName: "Сургуулийн нэр",
      slug: "Slug",
      status: "Төлөв",
    },
    form: {
      provincePlaceholder: "British Columbia",
    },
    schoolInfo: {
      title: "Сургуулийн мэдээлэл",
    },
    success: {
      updated: "Сургуулийн тохиргоо шинэчлэгдлээ.",
    },
    title: "Сургуулийн тохиргоо",
    update: {
      description:
        "Та сургуулийн нэр болон аймаг/мужийг шинэчилж болно. Slug, төлөв болон сургуулийн эзэмшлийг тусад нь удирдана.",
      title: "Сургуулийн тохиргоо шинэчлэх",
    },
  },
  schoolConnections: {
    actions: {
      approve: "Батлах",
      approving: "Баталж байна...",
      reject: "Татгалзах",
      rejecting: "Татгалзаж байна...",
      request: "Холболт хүсэх",
      requesting: "Хүсэлт илгээж байна...",
    },
    description:
      "Сургууль хоорондын холболтын хүсэлт илгээж, батална уу. Сурагчдын жагсаалт болон хувийн мэдээллийг энд хуваалцахгүй.",
    direction: {
      received: "Хүлээн авсан",
      sent: "Илгээсэн",
    },
    errors: {
      connectionExists: "Тэр сургуультай холболт аль хэдийн байна.",
      connectionsLoadFailed:
        "Холболтуудыг ачаалж чадсангүй. Дахин ачаалаад оролдоно уу.",
      currentSchoolMissing: "Танай сургуулийн бичлэгийг ачаалж чадсангүй.",
      invalidResponse: "Зөв холболтын хариу сонгоно уу.",
      invalidSchool: "Холбогдох зөв сургууль сонгоно уу.",
      pendingRequestNotFound: "Тэр хүлээгдэж буй хүсэлт олдсонгүй.",
      schoolsLoadFailed:
        "Сургуулийг ачаалж чадсангүй. Дахин ачаалаад оролдоно уу.",
      activeSchoolNotFound: "Тэр идэвхтэй сургууль олдсонгүй.",
    },
    fallback: {
      unknownSchool: "Тодорхойгүй сургууль",
    },
    fields: {
      province: "Аймаг/муж",
      schoolName: "Сургуулийн нэр",
      slug: "Slug",
      status: "Төлөв",
    },
    history: {
      emptyDescription:
        "Батлагдсан, татгалзсан болон хүлээгдэж буй холболтууд энд жагсана.",
      emptyTitle: "Сургуулийн холболт одоогоор алга",
      title: "Холболтын түүх",
    },
    incoming: {
      emptyDescription:
        "Бусад сургуулиас ирсэн холболтын хүсэлтүүд админы хяналтад энд харагдана.",
      emptyTitle: "Ирж буй хүсэлт алга",
      requestedDate: "{date} өдөр хүсэлт илгээсэн",
      title: "Ирж буй хүсэлтүүд",
    },
    otherSchools: {
      emptyDescription:
        "Бусад идэвхтэй сургуулиуд платформд нэгдсэний дараа энд харагдана.",
      emptyTitle: "Бусад идэвхтэй сургууль одоогоор алга",
      title: "Бусад идэвхтэй сургуулиуд",
    },
    success: {
      approved: "Холболтын хүсэлт батлагдлаа.",
      rejected: "Холболтын хүсэлт татгалзагдлаа.",
      requestSent: "Холболтын хүсэлт илгээгдлээ.",
    },
    title: "Сургуулийн холболтууд",
    yourSchool: {
      title: "Танай сургууль",
    },
  },
  dashboard: {
    analytics: {
      count: "Тоо",
      noActivityData: "Үйл ажиллагааны мэдээлэл хараахан алга",
      noUpcomingActivities: "Удахгүй болох үйл ажиллагаа алга",
      opportunitiesByCategory: {
        description: "Удахгүй болох боломжуудыг ангиллаар харуулав",
        title: "Ангиллаар харуулсан боломжууд",
      },
      overview: "Хяналтын самбарын тойм",
      upcomingActivities: {
        description: "Дараагийн зургаан долоо хоногт төлөвлөсөн үйл ажиллагаа",
        title: "Удахгүй болох үйл ажиллагаа",
      },
      viewDetails: "Дэлгэрэнгүй харах",
      week: "Долоо хоног",
    },
    attention: {
      description: "Хяналт шаардлагатай байж болох зүйлсийг шалгана уу.",
      emptyDescription: "Одоогоор бүх зүйл хэвийн байна.",
      emptyTitle: "Яаралтай зүйл алга",
      title: "Анхаарал шаардсан зүйлс",
    },
    browseEvents: "Үйл ажиллагаа үзэх",
    checkins: {
      description:
        "Батлагдсан үйл ажиллагааны хамгийн сүүлийн амжилттай ирцийн бүртгэлүүд.",
      emptyDescription:
        "Сурагчид үйл ажиллагааны QR холбоосоор ирцээ бүртгүүлсний дараа сүүлийн бүртгэлүүд энд харагдана.",
      emptyTitle: "Ирцийн бүртгэл одоогоор алга",
      title: "Сүүлийн ирц",
    },
    description:
      "Сургуулийн сурагчдын жагсаалт, клуб, үйл ажиллагаа, бүртгэл, ирцийн мэдээллийг нэг дороос хараарай.",
    eyebrow: "Сургуулийн үйл ажиллагааны тойм",
    fallback: {
      event: "Үйл ажиллагаа",
      rosterStudent: "Жагсаалтын сурагч",
    },
    joinClubs: "Клубт элсэх",
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
            "Эхлээд баталгаажсан сурагчдын жагсаалтыг үүсгэнэ үү. Сурагчид жагсаалтад бүртгэгдэх хүртэл бүртгүүлэх боломжгүй.",
          title: "Сурагч нэмэх",
        },
        createClubs: {
          description:
            "Сурагчдад нээлттэй элсэх боломжтой клуб нээх.",
          title: "Клуб үүсгэх",
        },
        createEvents: {
          description:
            "Сурагчид бүртгүүлж, оролцох боломжтой үйл ажиллагааг нийтлэх.",
          title: "Үйл ажиллагаа үүсгэх",
        },
        generateInviteCodes: {
          description:
            "Жагсаалтад байгаа сурагчид бүртгэлээ идэвхжүүлэхийн тулд нэг удаагийн урилгын код үүсгэнэ үү.",
          title: "Урилгын код үүсгэх",
        },
        studentsJoin: {
          description:
            "Урилгын кодуудыг сурагчидтай хуваалцаж, өөрсдийн бүртгэлээ үүсгүүлэх.",
          title: "Сурагчид бүртгүүлэх",
        },
        trackAttendance: {
          description:
            "Батлагдсан үйл ажиллагаанд ирцийн хуудас болон QR бүртгэл ашиглах.",
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
    platform: {
      description: "Нэг удаад сонгосон нэг сургуулийн үйл ажиллагааг харна.",
      emptyDescription:
        "Сургууль сонгосны дараа үйл ажиллагааны товч мэдээлэл энд харагдана.",
      eyebrow: "Платформын администраторын горим",
      schoolContext: "Сургуулийн хяналтын самбарын орчин",
      schoolPlaceholder: "Сургууль сонгох",
      schoolsUnavailable: "Сургуулийн сонголтууд одоогоор боломжгүй байна.",
      selectedSchool: "{school} сургуулийн хяналтын самбар",
      selectSchool: "Хяналтын самбарыг харахын тулд сургуулиа сонгоно уу",
    },
    quickActions: {
      title: "Шуурхай үйлдлүүд",
      addStudents: {
        description:
          "Баталгаажсан сурагчдын жагсаалтыг бүртгэл эхлэхээс өмнө үүсгэх эсвэл импортлох.",
        label: "Сурагч нэмэх",
      },
      createClub: {
        description: "Сурагчдад нээлттэй элсэх боломжтой клуб нээх.",
        label: "Клуб үүсгэх",
      },
      createEvent: {
        description:
          "Үйл ажиллагаа үүсгэх эсвэл зөвшөөрөл хүсэх.",
        label: "Үйл ажиллагаа үүсгэх",
      },
      generateInviteCodes: {
        description: "Жагсаалтад бүртгэгдсэн сурагчдад нэг удаагийн урилгын код олгох.",
        label: "Урилгын код үүсгэх",
      },
      viewReports: {
        description: "Экспорт, бүртгэл, ирцийн нийт дүнг шалгах.",
        label: "Тайлан харах",
      },
    },
    recommendedFlow: {
      description:
        "Сурагчид шууд өөрсдөө бүртгүүлэх боломжгүй. Эхлээд сурагчдыг жагсаалтад нэмээд, бэлэн болсон үед нэг удаагийн урилгын код үүсгэнэ үү.",
      title: "Санал болгож буй алхамууд",
    },
    staffWelcome: {
      description:
        "Баталгаажсан жагсаалтаас эхэлж, урилгын код олгоод, дараа нь сурагчдад клуб олох, үйл ажиллагаанд бүртгүүлэх, ирцээ бүртгүүлэхэд тусална уу.",
      eyebrow: "Өнөөдрийн ажлын хэсэг",
      title: "Сургуулийн үйл ажиллагааны хөтөлбөрөө нэг дороос удирдаарай.",
    },
    stats: {
      activeClubs: "Идэвхтэй клуб",
      activeStudents: "Идэвхтэй сурагчид",
      attendanceCheckins: "Ирцийн бүртгэл",
      eventRegistrations: "Үйл ажиллагааны бүртгэл",
      recentParticipation: "Сүүлийн үеийн оролцоо",
      upcomingRegistrations: "Удахгүй болох бүртгэлүүд",
      upcomingEvents: "Удахгүй болох үйл ажиллагаа",
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
          "Идэвхтэй клубүүдийг олж, өөрт тохирох клубт элсэх.",
      },
      viewRegisteredEvents: {
        description: "Өмнө бүртгүүлсэн үйл ажиллагаагаа шалгах.",
      },
    },
    studentDescription:
      "Элссэн клуб, удахгүй болох үйл ажиллагааны бүртгэл болон ирцийн мэдээллээ харахын тулд энэ хяналтын самбарыг ашиглана уу.",
    studentEyebrow: "Сурагчийн үйл ажиллагааны төв",
    studentOverviewDescription:
      "Элссэн клуб, удахгүй болох үйл ажиллагааны бүртгэл болон ирцийн мэдээллээ харахын тулд энэ хяналтын самбарыг ашиглана уу.",
    studentOverviewTitle: "Сургууль дээр юу болж байгааг олох.",
    studentStats: {
      attendedEvents: "Оролцсон үйл ажиллагаа",
      availableOpportunities: "Удахгүй болох боломжууд",
      joinedClubs: "Элссэн клуб",
      registeredUpcomingEvents:
        "Бүртгүүлсэн удахгүй болох үйл ажиллагаа",
    },
    title: "Хяналтын самбар",
    welcomeBack: "Тавтай морилно уу",
    upcoming: {
      description:
        "Танай сургуулийн удахгүй болох батлагдсан үйл ажиллагаа.",
      emptyDescription:
        "Ажилтнууд эсвэл клубын удирдагчид үүсгэсний дараа батлагдсан ирээдүйн үйл ажиллагаа энд харагдана.",
      emptyTitle: "Удахгүй болох үйл ажиллагаа одоогоор алга",
      locationNotSet: "Байршил тохируулаагүй",
      title: "Удахгүй болох батлагдсан үйл ажиллагаа",
    },
    viewRegisteredEvents: "Миний бүртгүүлсэн үйл ажиллагаа",
  },
  landing: {
    activityLabelAttendance: "Ирц",
    activityLabelClubs: "Клубын үйл ажиллагаа",
    activityLabelInvites: "Урилгын хандалт",
    activityRowAttendance: "Шууд ирцийн бүртгэл",
    activityRowClubs: "Багш баталсан",
    activityRowInvites: "Нэг удаагийн сурагчийн код",
    activityWeekOverview: "Үйл ажиллагааны долоо хоногийн тойм",
    audienceAdmins: "Сургуулийн админууд",
    audienceAdminsBody:
      "Сурагчид, ажилтнууд, урилгын код, сургуулийн тохиргоо болон тайланг удирдана.",
    audienceDescription:
      "Үүрэг бүрт ойлгомжтой зам өгч, сургууль хувийн сурагчийн мэдээллийг ил гаргахгүйгээр үйл ажиллагаагаа турших боломжтой.",
    audienceEyebrow: "Сургуулийн хамт олонд зориулав",
    audienceStudents: "Сурагчид",
    audienceStudentsBody:
      "Клубт элсэж, үйл ажиллагаанд бүртгүүлж, зарлал шалгаж, ирцээ бүртгүүлнэ.",
    audienceTeachers: "Багш нар",
    audienceTeachersBody:
      "Клуб үүсгэж, үйл ажиллагаа удирдаж, үйл ажиллагаа баталж, ирц авна.",
    checkIn: "Ирцийн бүртгэл",
    clubsAndEvents: "Клуб ба үйл ажиллагаа",
    clubsAndEventsBody:
      "Сурагчид идэвхтэй клубийг үзэж, батлагдсан үйл ажиллагаанд бүртгүүлж, удахгүй болох зүйлсээ хянах боломжтой.",
    demoWorkflow: "Демо ажлын урсгал",
    events: "Үйл ажиллагаа",
    goToDashboard: "Хяналтын самбар руу очих",
    headline:
      "Сургуулийн клуб, үйл ажиллагаа болон ирцийг нэг аюулгүй орчинд удирдаарай.",
    intro:
      "School Activity Hub нь сургуулиудад сурагчдын жагсаалт, урилгын код, клуб, үйл ажиллагаа батлах, QR ирц болон тайланг олон нийтэд нээхгүйгээр удирдахад тусална.",
    joinWithInviteCode: "Урилгын кодоор бүртгүүлэх",
    pilotWorkflow: "Туршилтын ажлын урсгал",
    platformEyebrow: "Хувийн сургуулийн үйл ажиллагааны платформ",
    previewClubEventManagement: "Клуб ба үйл ажиллагааны удирдлага",
    previewClubEventManagementBody:
      "Клуб үүсгэж, үйл ажиллагаа нийтэлж, оролцоог эмх цэгцтэй байлгана.",
    previewQrAttendance: "QR ирц",
    previewQrAttendanceBody:
      "Үйл ажиллагааны үеэр энгийн ирцийн хуудсаар ирц бүртгэнэ.",
    previewReports: "Сургуулийн тайлан",
    previewReportsBody: "Бүртгэл, ирц болон оролцооны товч мэдээллийг харна.",
    previewTeacherApproval: "Багшийн зөвшөөрөл",
    previewTeacherApprovalBody:
      "Сурагчид оролцохоос өмнө үйл ажиллагааг хянан батална.",
    previewVerifiedStudentAccess: "Баталгаажсан сурагчийн хандалт",
    previewVerifiedStudentAccessBody:
      "Сурагчид зөвхөн сургуулиас олгосон урилгын кодоор бүртгүүлнэ.",
    privateByDesign: "Анхнаасаа хаалттай, аюулгүй",
    privateByDesignBody:
      "Платформ нь сургуулийн удирддаг хандалт, үүргийн шалгалт, ажилтны тодорхой хяналт дээр суурилсан.",
    qrReady: "QR бэлэн",
    rostered: "Жагсаалтад бүртгэгдсэн",
    schoolPilotSnapshot: "Сургуулийн туршилтын товч тойм",
    signIn: "Нэвтрэх",
    staffSignIn: "Сургуулийн ажилтан нэвтрэх",
    studentInviteHelper: "Сурагчид сургуулиасаа авсан урилгын кодоор бүртгүүлнэ.",
    studentJoinWithInvite: "Сурагч урилгын кодоор бүртгүүлэх",
    students: "Сурагчид",
    teacherOversight: "Багшийн хяналт",
    teacherOversightBody:
      "Сургуулийн админ болон багш нар баталгаажуулалт, аюулгүй байдлын тэмдэглэл, ирц, тайланг нэг газраас удирдана.",
    trustBilingual: "Англи/Монгол хоёр хэлний дэмжлэг",
    trustEyebrow: "Итгэлцэл ба аюулгүй байдал",
    trustInviteOnly: "Зөвхөн урилгаар нэвтрэх сурагчийн бүртгэл",
    trustQrAttendance: "QR ирцийн бүртгэл",
    trustSchoolRosters: "Сургуулийн сурагчдын жагсаалт",
    trustStaffApproval: "Оролцохоос өмнөх ажилтны зөвшөөрөл",
    verifiedAccess: "Баталгаажсан хандалт",
    verifiedStudentsOnly: "Зөвхөн баталгаажсан сурагчид",
    verifiedStudentsOnlyBody:
      "Сурагчид ажилтны удирддаг жагсаалтаас нэг удаагийн урилгын кодоор бүртгэлээ идэвхжүүлнэ.",
    whatThisAppDoes: "Энэ апп юу хийдэг вэ?",
    whoIsThisFor: "Энэ хэнд зориулагдсан бэ?",
    workflowDescription:
      "Ажилтнууд, багш нар, сурагчид ойлгоход хялбар ажлын урсгалаар тохиргооноос оролцоо хүртэл явна.",
    workflowTitle: "Сургуулийн үйл ажиллагааны туршилтаа 5 алхмаар эхлүүлээрэй.",
  },
  language: {
    en: "English",
    label: "Хэл",
    mn: "Монгол",
  },
  theme: {
    dark: "Харанхуй",
    label: "Загвар",
    light: "Гэрэлтэй",
    switch: "Загвар солих",
    system: "Систем",
  },
  metadata: {
    description: "Хувийн сургуулийн клуб, үйл ажиллагаа, урилгын код, ирц.",
  },
  setup: {
    actions: {
      createSchool: "Сургууль үүсгэх",
      creating: "Үүсгэж байна...",
    },
    description:
      "Эхний сургуулийг үүсгэнэ үү. Таны одоогийн бүртгэл энэ ажлын талбарын сургуулийн админ болно.",
    errors: {
      adminProfileSaveFailed:
        "Админ профайлыг хадгалж чадсангүй тул сургууль үүссэнгүй. Админы мэдээллийг шалгаад дахин оролдоно уу.",
      createFailed: "Сургуулийг үүсгэж чадсангүй.",
      loginRequired: "Эхний сургуулийг үүсгэхийн тулд та нэвтэрсэн байх ёстой.",
      nameRequired: "Сургуулийн нэр шаардлагатай.",
      slugMinLength: "Сургуулийн slug дор хаяж 3 тэмдэгттэй байх ёстой.",
    },
    form: {
      schoolName: "Сургуулийн нэр",
      schoolSlug: "Сургуулийн slug",
      slugPlaceholder: "my-school",
      timezone: "Цагийн бүс",
      timezoneDefault: "America/Vancouver",
    },
    title: "Анхны тохиргоо",
  },
  nav: {
    account: "Бүртгэл",
    activities: "Үйл ажиллагаа",
    announcements: "Зарлал",
    approvals: "Үйл ажиллагааны зөвшөөрөл",
    attendance: "Ирц",
    auditLog: "Платформын аудитын бүртгэл",
    calendar: "Хуанли",
    clubIdeas: "Клубын санаа",
    clubRequests: "Клуб байгуулах хүсэлт",
    clubs: "Клуб",
    dashboard: "Хяналтын самбар",
    events: "Үйл ажиллагаа",
    inviteCodes: "Сурагчийн урилгын код",
    logout: "Гарах",
    loggingOut: "Гарч байна...",
    main: "Үндсэн",
    manage: "Хэрэглэгч ба хандалт",
    menu: "Цэс",
    more: "Бусад",
    operations: "Хяналт ба бүртгэл",
    partnerSchools: "Хамтрагч сургуулиуд",
    platform: "Платформ",
    platformDashboard: "Платформын хяналтын самбар",
    platformConnections: "Платформын холболт",
    platformAdmins: "Платформын админууд",
    profile: "Хувийн мэдээлэл",
    privacy: "Нууцлал",
    reports: "Үйл ажиллагааны тайлан",
    safeguardingInbox: "Аюулгүй байдлын хүсэлтүүд",
    schoolConnections: "Хамтрагч сургуулиуд",
    schoolManagement: "Сургуулийн удирдлага",
    settings: "Сургуулийн тохиргоо",
    schools: "Сургууль",
    safety: "Аюулгүй байдал ба тусламж",
    safetyAndPrivacy: "Аюулгүй байдал ба нууцлал",
    staff: "Ажилтны бүртгэл",
    students: "Сурагчид",
    superAdmin: "Платформын админ",
  },
  invites: {
    actions: {
      alreadyUsedOrInactive: "Аль хэдийн ашиглагдсан эсвэл идэвхгүй",
      bulkGenerateShort: "Олон код үүсгэх",
      generate: "Урилгын код үүсгэх",
      generating: "Үүсгэж байна...",
      revoke: "Код цуцлах",
      revoking: "Цуцалж байна...",
    },
    bulk: {
      allUnlinked: {
        description:
          "Хараахан бүртгүүлээгүй бүх идэвхтэй жагсаалтын сурагчид.",
        label: "Холбоогүй бүх идэвхтэй сурагчид",
      },
      copyTextList: "Текст жагсаалт хуулах",
      description:
        "Сурагчийн бүртгэл хараахан холбоогүй хэд хэдэн идэвхтэй сурагчид нэг удаагийн урилгын код үүсгэнэ үү.",
      downloadCsv: "Код татах",
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
      generatedTitle: "Үүссэн урилгын код",
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
      submit: "Олон код үүсгэх",
      success: {
        generated:
          "{count} урилгын код үүслээ. Одоо хуулж эсвэл татаж аваарай; дахин харуулахгүй.",
        skippedExisting:
          "Сонгосон {count} сурагч аль хэдийн идэвхтэй урилгын кодтой байсан тул алгасагдлаа.",
      },
      title: "Олон код үүсгэх",
    },
    description:
      "Жагсаалтад байгаа сурагчид бүртгэлээ идэвхжүүлэх боломжтой нэг удаагийн урилгын код үүсгэнэ үү.",
    empty: {
      description:
        "Идэвхтэй жагсаалтын сурагч бүртгэлээ үүсгэхэд бэлэн үед урилгын код үүсгэнэ үү.",
      title: "Одоогоор урилгын код алга",
    },
    errors: {
      codesLoadFailed:
        "Урилгын кодуудыг ачаалж чадсангүй. Дахин ачаалаад оролдоно уу.",
      staffOnly: "Зөвхөн сургуулийн админ болон багш нар урилгын код үүсгэх боломжтой.",
      studentAlreadyHasActiveCode:
        "Энэ сурагчид аль хэдийн идэвхтэй урилгын код байна.",
      studentInactiveOrWrongSchool:
        "Тэр сурагч идэвхтэй биш эсвэл танай сургуульд хамаарахгүй байна.",
      studentsLoadFailed:
        "Сурагчдыг ачаалж чадсангүй. Дахин ачаалаад оролдоно уу.",
      studentRequired: "Идэвхтэй сурагч сонгоно уу.",
    },
    eyebrow: "Урилгын хандалт",
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
      plainCodeLabel: "Нэг удаагийн урилгын код",
      studentLabel: "Идэвхтэй сурагч",
      title: "Нэг удаагийн урилгын код",
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
    title: "Урилгын код",
  },
  roles: {
    noProfile: "Хувийн мэдээлэл хараахан байхгүй",
    schoolAdmin: "Сургуулийн админ",
    student: "Сурагч",
    teacher: "Багш",
  },
  students: {
    actions: {
      add: "Сурагч нэмэх",
      alreadyInactive: "Аль хэдийн идэвхгүй",
      importCsv: "Сурагчдыг жагсаалтад нэмэх",
      markInactive: "Идэвхгүй болгох",
    },
    addSection: {
      description: "Хурдан нэмэлт эсвэл жижиг туршилтын жагсаалтад үүнийг ашиглана уу.",
      title: "Нэг сурагч нэмэх",
    },
    description:
      "Эхлээд сурагчдыг жагсаалтад нэмнэ үү. Сурагчид шууд өөрсдөө бүртгүүлэх боломжгүй.",
    empty: {
      description:
        "Урилгын код үүсгэхээс өмнө нэг сурагчийг гараар нэмэх эсвэл сурагчдын жагсаалт импортлоно уу.",
      title: "Одоогоор сурагч алга",
    },
    errors: {
      duplicateStudentNumber:
        "Ийм сурагчийн дугаартай сурагч аль хэдийн байна.",
      firstAndLastName: "Нэр болон овгийг хоёуланг нь оруулна уу.",
      fullNameRequired: "Сурагчийн бүтэн нэр шаардлагатай.",
      gradeRequired: "Анги шаардлагатай.",
      loadFailed: "Сурагчдыг ачаалж чадсангүй. Дахин ачаалаад оролдоно уу.",
      staffOnlyAdd: "Зөвхөн сургуулийн админ болон багш нар сурагч нэмэх боломжтой.",
    },
    eyebrow: "Сурагчдын жагсаалт",
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
          "Зөвхөн сургуулийн админ болон багш нар сурагчдын жагсаалт импортлох боломжтой.",
      },
      fileLabel: "CSV файл",
      importing: "Импортолж байна...",
      result: {
        imported: "{count} сурагч жагсаалтад нэмэгдлээ.",
        noStudents: "Сурагч нэмэгдсэнгүй.",
        skipped: "{count} мөр алгасагдсан:",
        more: "...мөн {count} мөр нэмж.",
      },
      sampleCsv:
        "full_name,grade,class_group,student_number\nAvery Stone,7,7A,S-1001\nMina Patel,8,8B,S-1002",
      sampleTitle: "CSV загвар",
      submit: "Жагсаалт нэмэх",
    },
    importSection: {
      description:
        "Том жагсаалт бэлдэх үед нэг мөрөнд нэг сурагчтай CSV файл оруулна уу.",
      title: "Сурагчдын жагсаалт импортлох",
    },
    roster: {
      title: "Сурагчдын жагсаалт",
    },
    success: {
      added: "Сурагч нэмэгдлээ.",
    },
    table: {
      actions: "Үйлдэл",
      classGroup: "Ангийн бүлэг",
      created: "Үүсгэсэн",
      fullName: "Сурагчийн нэр",
      grade: "Анги",
      status: "Төлөв",
      studentNumber: "Сурагчийн дугаар",
    },
    title: "Сурагчид",
  },
  superAdmin: {
    accessRequired: "Платформын эрх шаардлагатай",
    actions: {
      backToSchools: "Сургуулиуд руу буцах",
      backToPlatformDashboard: "Платформын хяналтын самбар руу буцах",
      viewConnections: "Холболтууд харах",
      viewSchools: "Сургуулиуд харах",
    },
    auditLog: {
      actionLabels: {
        connectionApproved: "Холболт батлагдсан",
        connectionCreated: "Холболт үүссэн",
        connectionRejected: "Холболт татгалзсан",
        connectionRevoked: "Холболт цуцалсан",
        platformAdminAdded: "Платформын админ нэмэгдсэн",
        platformAdminDeactivated: "Платформын админ идэвхгүй болсон",
        platformAdminReactivated: "Платформын админ дахин идэвхжсэн",
        schoolAdminCreated: "Сургуулийн админ үүссэн",
        schoolAdminDeactivated: "Сургуулийн админ идэвхгүй болсон",
        schoolAdminReactivated: "Сургуулийн админ дахин идэвхжсэн",
        schoolCreated: "Сургууль үүссэн",
        schoolUpdated: "Сургууль шинэчлэгдсэн",
      },
      description:
        "Платформын админуудын хийсэн сүүлийн платформын түвшний өөрчлөлтүүдийг шалгана.",
      emptyDescription:
        "Супер админууд өөрчлөлт хийсний дараа платформын үйлдлүүд энд харагдана.",
      emptyTitle: "Аудитын бүртгэл олдсонгүй",
      fields: {
        action: "Үйлдэл",
        actor: "Үйлдэл хийсэн хэрэглэгч",
        createdAt: "Үүссэн огноо",
        date: "Огноо",
        metadata: "Нэмэлт мэдээлэл",
        target: "Зорилтот зүйл",
        targetSchool: "Холбогдох сургууль",
      },
      platformSafety: "Платформын аюулгүй байдал",
      loadFailedDescription:
        "Аудитын бүртгэлийг ачаалж чадсангүй. Хуудсыг дахин ачаалаад оролдоно уу.",
      noRecentActions: "Одоогоор платформын сүүлийн үйлдэл алга.",
      recentActions: "Сүүлийн платформын үйлдлүүд",
      searchPlaceholder: "Аудитын бүртгэл хайх",
      title: "Платформын аудитын бүртгэл",
      unavailableDescription:
        "Платформын аудитын бүртгэлийн migration ажилласныг шалгаж, Supabase schema cache-ийг дахин ачаалаад энэ хуудсыг сэргээнэ үү.",
      unavailableTitle: "Аудитын бүртгэл одоогоор ашиглах боломжгүй байна.",
    },
    connections: {
      actions: {
        approve: "Зөвшөөрөх",
        approving: "Зөвшөөрч байна...",
        create: "Холболт үүсгэх",
        creating: "Үүсгэж байна...",
        noActions: "Үйлдэл байхгүй",
        reject: "Татгалзах",
        rejecting: "Татгалзаж байна...",
        revoke: "Цуцлах",
        revoking: "Цуцалж байна...",
      },
      allConnections: "Бүх холболтууд",
      create: {
        description:
          "Хоёр идэвхтэй сургуулийн хооронд хүлээгдэж буй эсвэл идэвхтэй холболт үүсгэнэ үү.",
        title: "Холболт үүсгэх",
      },
      description:
        "Сургууль хоорондын холболтыг платформын түвшинд шалгах, үүсгэх, зөвшөөрөх, татгалзах болон цуцлах.",
      emptyDescription:
        "Сургуулийн холболтын хүсэлт болон идэвхтэй холболтууд энд харагдана.",
      emptyTitle: "Холболт олдсонгүй",
      errors: {
        connectionExists:
          "Эдгээр сургуулиуд аль хэдийн холбогдсон эсвэл хүлээгдэж буй холболттой байна.",
        createFailed:
          "Холболт үүсгэж чадсангүй. Сонгосон сургуулиудаа шалгаад дахин оролдоно уу.",
        invalidAction: "Зөв холболтын үйлдэл сонгоно уу.",
        schoolsRequired: "Энэ холболтод хоёр сургуулийг хоёуланг нь сонгоно уу.",
        selfConnection: "Сургууль өөртэйгөө холбогдох боломжгүй.",
        updateFailed: "Холболт шинэчилж чадсангүй. Дахин ачаалаад оролдоно уу.",
      },
      fallback: {
        unknownSchool: "Тодорхойгүй сургууль",
      },
      fields: {
        actions: "Үйлдэл",
        fromSchool: "Илгээсэн сургууль",
        requested: "Хүсэлт илгээсэн огноо",
        status: "Холболтын төлөв",
        toSchool: "Хүлээн авах сургууль",
        updated: "Шинэчилсэн огноо",
      },
      form: {
        chooseSchool: "Сургууль сонгох",
      },
      status: {
        active: "Идэвхтэй",
        pending: "Хүлээгдэж буй",
        rejected: "Татгалзсан",
        revoked: "Цуцалсан",
      },
      success: {
        created: "Холболт үүслээ",
        updated: "Холболт шинэчлэгдлээ",
      },
      title: "Платформын холболтын удирдлага",
    },
    dashboard: {
      description:
        "Сурагчдын жагсаалт, урилгын код, ирцийн бүртгэл болон бусад хувийн сургуулийн өгөгдлийг нээхгүйгээр платформын өндөр түвшний үйл ажиллагааг хянана уу.",
      title: "Платформын хяналтын самбар",
    },
    metrics: {
      activeSchools: "Идэвхтэй сургуулиуд",
      allSchools: "Бүх сургуулиуд",
      platformAdmins: "Платформын админууд",
      schoolConnections: "Сургуулийн холболтууд",
    },
    newSchool: {
      actions: {
        createSchool: "Сургууль үүсгэх",
        createSchoolAndAdmin: "Сургууль болон админ үүсгэх",
        createSchoolOnly: "Зөвхөн сургууль үүсгэх",
        creating: "Үүсгэж байна...",
      },
      description:
        "Шинэ сургууль үүсгээд шаардлагатай бол анхны сургуулийн админ бүртгэлийг нэмнэ үү.",
      errors: {
        adminCreateFailed:
          "Сургуулийн админы бүртгэл үүсгэж чадсангүй. Админы мэдээллийг шалгаад дахин оролдоно уу.",
        adminFieldsRequired:
          "Админы бүтэн нэр, имэйл, түр нууц үгийг оруулна уу эсвэл зөвхөн сургууль үүсгэнэ үү.",
        adminProfileFailed:
          "Сургуулийн админы профайл үүсгэж чадсангүй. Админы мэдээллийг шалгаад дахин оролдоно уу.",
        createFailed:
          "Сургууль үүсгэж чадсангүй. Мэдээллээ шалгаад дахин оролдоно уу.",
        invalidSlug:
          "Сургуулийн таних нэрэнд жижиг үсэг, тоо болон зураас ашиглана уу.",
        invalidStatus: "Зөв сургуулийн төлөв сонгоно уу.",
        nameRequired: "Сургуулийн нэр шаардлагатай.",
        slugExists: "Энэ сургуулийн таних нэр аль хэдийн байна",
        slugRequired: "Сургуулийн таних нэр шаардлагатай.",
      },
      form: {
        adminEmail: "Админы имэйл",
        adminFullName: "Админы бүтэн нэр",
        createAdmin: "Анхны сургуулийн админ үүсгэх",
        firstSchoolAdmin: "Анхны сургуулийн админ",
        province: "Аймаг/муж",
        schoolIdentifier: "Сургуулийн таних нэр",
        schoolName: "Сургуулийн нэр",
        slugHelp:
          "Сургуулийн нэрээс автоматаар үүснэ. Жижиг үсэг, тоо болон зураас ашиглана уу.",
        status: "Төлөв",
        temporaryPassword: "Түр нууц үг",
      },
      success: {
        created: "Сургууль амжилттай үүслээ",
      },
      title: "Шинэ сургууль",
      warning:
        "Зөвхөн платформын админ сургууль үүсгэх боломжтой. Сургуулийн админ зөвхөн өөрийн сургуулийг удирдана.",
    },
    platformAdmins: {
      actions: {
        add: "Платформын админ нэмэх",
        adding: "Нэмж байна...",
        deactivate: "Платформын админыг идэвхгүй болгох",
        deactivating: "Идэвхгүй болгож байна...",
        reactivate: "Платформын админыг дахин идэвхжүүлэх",
        reactivating: "Дахин идэвхжүүлж байна...",
      },
      add: {
        description:
          "Хувийн мэдээлэлтэй хэрэглэгчид платформын эрх нэмнэ үү.",
        title: "Платформын админ нэмэх",
      },
      current: {
        description:
          "Платформын админууд платформын түвшний хуудас болон үйлдлүүдэд хандах боломжтой.",
        title: "Одоогийн платформын админууд",
      },
      description:
        "Итгэмжлэгдсэн платформын админуудыг харах, нэмэх, идэвхгүй болгох болон дахин идэвхжүүлэх.",
      empty: {
        description:
          "Анхны бүртгэлийг гараар тохируулсны дараа платформын админууд энд харагдана.",
        title: "Платформын админ олдсонгүй",
      },
      errors: {
        addFailed:
          "Платформын админ нэмж чадсангүй. Имэйлээ шалгаад дахин оролдоно уу.",
        alreadyPlatformAdmin: "Энэ хэрэглэгч аль хэдийн платформын админ байна.",
        cannotDeactivateSelf:
          "Та өөрийн платформын эрхийг эндээс идэвхгүй болгох боломжгүй",
        emailRequired: "Админы имэйл шаардлагатай.",
        invalidAction: "Зөв платформын админ үйлдэл сонгоно уу.",
        lookupFailed: "Хэрэглэгч хайхад алдаа гарлаа. Имэйлээ шалгаад дахин оролдоно уу.",
        profileRequired:
          "Платформын админ болохын өмнө хэрэглэгчийн профайл үүссэн байх шаардлагатай",
        updateFailed:
          "Платформын админыг шинэчилж чадсангүй. Дахин ачаалаад оролдоно уу.",
        userNotFound: "Хэрэглэгч олдсонгүй",
      },
      fields: {
        actions: "Үйлдэл",
        adminEmail: "Админы имэйл",
        created: "Үүсгэсэн огноо",
        email: "Имэйл",
        fullName: "Бүтэн нэр",
        schoolRole: "Сургуулийн үүрэг",
        status: "Төлөв",
      },
      safetyNote:
        "Платформын админууд сургууль болон платформын тохиргоог удирдах боломжтой. Энэ эрхийг зөвхөн итгэмжлэгдсэн хэрэглэгчдэд өгнө үү.",
      success: {
        added: "Платформын админ нэмэгдлээ",
        deactivated: "Платформын админ идэвхгүй боллоо",
        reactivated: "Платформын админ дахин идэвхжлээ",
      },
      title: "Платформын админуудыг удирдах",
    },
    schoolDetail: {
      actions: {
        addAdmin: "Сургуулийн админ нэмэх",
        addingAdmin: "Үүсгэж байна...",
        deactivateAdmin: "Админыг идэвхгүй болгох",
        deactivatingAdmin: "Идэвхгүй болгож байна...",
        manageSchool: "Сургууль удирдах",
        reactivateAdmin: "Админыг дахин идэвхжүүлэх",
        reactivatingAdmin: "Дахин идэвхжүүлж байна...",
        updateSchool: "Сургууль хадгалах",
        updatingSchool: "Хадгалж байна...",
      },
      admins: {
        description:
          "Энэ сургуулийн сургуулийн админ бүртгэлүүдийг үүсгэж, удирдана.",
        emptyDescription:
          "Энэ сургууль өөрийн ажилтан, сурагч, клуб, үйл ажиллагааг удирдах боломжтой болохын тулд сургуулийн админ нэмнэ үү.",
        emptyTitle: "Сургуулийн админ олдсонгүй",
        title: "Сургуулийн админууд",
      },
      connectionsSummary: {
        active: "Идэвхтэй холболтууд",
        pending: "Хүлээгдэж буй холболтууд",
        title: "Холболтын товч мэдээлэл",
      },
      description:
        "Сурагчдын хувийн мэдээллийг нээхгүйгээр сургуулийн профайл болон сургуулийн админ бүртгэлүүдийг удирдана.",
      edit: {
        description:
          "Сургуулийн нэр, аймаг/муж, төлөвийг шинэчилнэ үү. Сургуулийн таних нэр зөвхөн харах боломжтой.",
        title: "Сургууль засварлах",
      },
      errors: {
        adminAlreadyExists:
          "Энэ имэйлтэй хэрэглэгч аль хэдийн байна. Өөр имэйл ашиглах эсвэл байгаа профайлыг удирдана уу.",
        adminCreateFailed:
          "Сургуулийн админы бүртгэл үүсгэж чадсангүй. Админы мэдээллийг шалгаад дахин оролдоно уу.",
        adminEmailRequired: "Админы имэйл шаардлагатай.",
        adminFullNameRequired: "Админы бүтэн нэр шаардлагатай.",
        adminProfileFailed:
          "Сургуулийн админы профайл үүсгэж чадсангүй. Админы мэдээллийг шалгаад дахин оролдоно уу.",
        adminStatusFailed:
          "Сургуулийн админы төлөвийг шинэчилж чадсангүй. Дахин ачаалаад оролдоно уу.",
        cannotDeactivateSelf:
          "Эндээс өөрийн платформын админ профайлыг идэвхгүй болгох боломжгүй.",
        invalidStatus: "Зөв сургуулийн төлөв сонгоно уу.",
        loadFailed:
          "Сургуулийн зарим мэдээллийг ачаалж чадсангүй. Дахин сэргээж оролдоно уу.",
        nameRequired: "Сургуулийн нэр шаардлагатай.",
        schoolNotFound: "Сургууль олдсонгүй.",
        updateFailed:
          "Сургуулийг шинэчилж чадсангүй. Мэдээллээ шалгаад дахин оролдоно уу.",
      },
      fields: {
        actions: "Үйлдэл",
        adminEmail: "Админы имэйл",
        adminFullName: "Админы бүтэн нэр",
        created: "Үүсгэсэн",
        email: "Имэйл",
        fullName: "Бүтэн нэр",
        province: "Аймаг/муж",
        readOnly: "Зөвхөн харах",
        schoolAdmins: "Сургуулийн админууд",
        schoolIdentifier: "Сургуулийн таних нэр",
        schoolName: "Сургуулийн нэр",
        status: "Төлөв",
        students: "Сурагчид",
        teachers: "Багш нар",
        temporaryPassword: "Түр нууц үг",
        updated: "Шинэчилсэн",
      },
      overview: {
        title: "Сургуулийн тойм",
      },
      notFound: {
        description:
          "Энэ сургууль олдсонгүй. Сургуулийн лавлах руу буцаж өөр сургууль сонгоно уу.",
      },
      privacyNotice:
        "Платформын админууд энэ хуудсан дээр сурагчдын хувийн мэдээллийг харах боломжгүй.",
      success: {
        adminCreated: "Сургуулийн админ амжилттай үүслээ",
        adminDeactivated: "Сургуулийн админ идэвхгүй боллоо",
        adminReactivated: "Сургуулийн админ дахин идэвхжлээ",
        updated: "Сургууль амжилттай шинэчлэгдлээ",
      },
      title: "Сургуулийн дэлгэрэнгүй",
    },
    schools: {
      allSchools: "Бүх сургуулиуд",
      description: "Платформын хяналтад зориулсан зөвхөн унших сургуулийн лавлах.",
      emptyDescription:
        "Дараагийн супер админ үе шатанд сургуулиуд үүсгэнэ. Энэ үе шат зөвхөн унших горимтой.",
      emptyTitle: "Сургууль олдсонгүй",
      fields: {
        created: "Үүсгэсэн",
        name: "Сургуулийн нэр",
        province: "Аймаг/муж",
        schoolIdentifier: "Сургуулийн таних нэр",
        status: "Төлөв",
      },
      title: "Сургуулиуд",
    },
  },
  safety: {
    actions: {
      back: "Аюулгүй байдал ба тусламж руу буцах",
    },
    cards: {
      designationsAction: "Хариу арга хэмжээний багийг удирдах",
      designationsDescription:
        "Нууц мэдээллийг нээж, хариу өгөх гурваас ихгүй итгэмжлэгдсэн ажилтныг сонгоно.",
      designationsTitle: "Аюулгүй байдлын хариу арга хэмжээний баг",
      inboxAction: "Хязгаарлагдмал хүсэлтүүдийг нээх",
      inboxDescription:
        "Өөрийн сургуулийн нууц хүсэлтийг хянаж, зөвхөн шаардлагатай явцын мэдээллийг бүртгэнэ.",
      inboxTitle: "Аюулгүй байдлын хариу арга хэмжээний хэсэг",
      myReportsAction: "Миний хүсэлтийн төлөв харах",
      myReportsDescription:
        "Өөрийн илгээсэн хүсэлтийн аюулгүй төлөв, хариу өгсөн цагийг харна.",
      myReportsTitle: "Миний аюулгүй байдлын хүсэлт",
      reportAction: "Аюулгүй байдлын асуудал мэдээлэх",
      reportDescription:
        "Нууц асуудлаа сургуулийн тусгайлан томилсон аюулгүй байдлын ажилтанд илгээнэ.",
      reportTitle: "Нууц мэдээлэх суваг",
    },
    categories: {
      activityOrEvent: "Үйл ажиллагаатай холбоотой асуудал",
      bullyingOrHarassment: "Дээрэлхэлт эсвэл дарамт",
      onlineOrPlatform: "Онлайн эсвэл платформын аюулгүй байдал",
      other: "Бусад аюулгүй байдлын асуудал",
      personalSafety: "Хувийн аюулгүй байдал",
    },
    confidentiality: {
      identity:
        "Энэ суваг нууц боловч нэргүй биш. Томилогдсон ажилтан аюулгүй хариу өгөхийн тулд таны баталгаажсан бүртгэл хүсэлттэй холбоотой үлдэнэ.",
      offline:
        "Та итгэдэг насанд хүрсэн хүн эсвэл сургуулийн албанд биечлэн хэлж болно. Цахим маягт ашиглах албагүй.",
      restricted:
        "Зөвхөн танай сургуулийн идэвхтэй томилогдсон аюулгүй байдлын ажилтан тайлбарыг уншина. Энгийн багш, томилогдоогүй сургуулийн админ, платформын админ автоматаар хандах эрхгүй.",
      title: "Нууцлал ба мэдээлэх бусад арга",
    },
    description:
      "Аюулгүй байдлын мэдээлэл авах, нууц асуудал илгээх эсвэл өөрийн хүсэлтийн аюулгүй төлөвийг харах.",
    designations: {
      activeCount: "{maximum} хариу арга хэмжээний ажилтнаас {count} нь идэвхтэй",
      activeCountHelp:
        "Хариу арга хэмжээний багт хамгийн ихдээ гурван идэвхтэй багш эсвэл сургуулийн админ байж болно.",
      actions: {
        activate: "Хариу арга хэмжээний багт нэмэх",
        activating: "Нэмж байна...",
        deactivate: "Хариу арга хэмжээний багаас хасах",
        deactivating: "Хасаж байна...",
      },
      assignedAt: "Анх томилсон",
      description:
        "Сургуулийн админ идэвхтэй багш эсвэл сургуулийн админыг томилж болно. Энэ эрх нь өөрийн сургуулийн маш нууц хүсэлтэд хандах боломж олгоно.",
      emptyDescription: "Энэ үүргийг олгохын өмнө тохирох ажилтны профайл үүсгэнэ үү.",
      emptyTitle: "Тохирох ажилтан олдсонгүй",
      errors: {
        ineligibleProfile: "Танай сургуулийн идэвхтэй багш эсвэл сургуулийн админыг сонгоно уу.",
        invalidSelection: "Зөв ажилтан болон эрхийн төлөв сонгоно уу.",
        limitReached: "Аюулгүй байдлын хариу арга хэмжээний багт гурван идэвхтэй ажилтан байна.",
        loadFailed: "Аюулгүй байдлын хариу арга хэмжээний багийг ачаалж чадсангүй. Дахин ачаалаад оролдоно уу.",
        noChange: "Энэ томилгоо аль хэдийн сонгосон төлөвтэй байна.",
        updateFailed: "Аюулгүй байдлын хариу арга хэмжээний багийг шинэчилж чадсангүй.",
      },
      success: {
        activated: "Ажилтан аюулгүй байдлын хариу арга хэмжээний багт нэмэгдлээ.",
        deactivated: "Ажилтан аюулгүй байдлын хариу арга хэмжээний багаас хасагдлаа.",
      },
      title: "Аюулгүй байдлын хариу арга хэмжээний баг",
      unassigned: "Томилогдоогүй",
      warningDescription:
        "Энэ эрхийг зөвхөн сургалттай, батлагдсан ажилтанд олгоно. Сургуулийн сэтгэл зүйч тусдаа үүрэг үүсгэхгүйгээр одоо байгаа багш эсвэл сургуулийн админы бүртгэлээ ашиглана.",
      warningTitle: "Хязгаарлагдмал хариуцлага",
    },
    errors: {
      categoryRequired: "Асуудлын ерөнхий ангиллыг сонгоно уу.",
      descriptionRequired: "Асуудлыг товч тайлбарлана уу.",
      descriptionTooLong: "Тайлбарыг 2,000 тэмдэгтээс хэтрүүлэхгүй байна уу.",
      invalidRelatedActivity: "Танай сургуулийн зөв үйл ажиллагааг сонгоно уу.",
      invalidWorkflowUpdate: "Явцын дараагийн зөв төлөвийг сонгоно уу.",
      loadInboxFailed: "Нууц хүсэлтийг ачаалж чадсангүй. Дахин ачаалаад оролдоно уу.",
      loadOwnReportsFailed: "Таны хүсэлтийн төлөвийг ачаалж чадсангүй. Дахин ачаалаад оролдоно уу.",
      submitFailed: "Хүсэлтийг илгээж чадсангүй. Дахин оролдох эсвэл биечлэн мэдээлэх аргыг ашиглана уу.",
      updateFailed: "Хүсэлтийн төлөвийг шинэчилж чадсангүй.",
    },
    inbox: {
      contactRequested: "Холбоо барих хүсэлттэй",
      description:
        "Өөрийн сургуулийн томилогдсон аюулгүй байдлын хариу арга хэмжээний багт зориулсан хязгаарлагдмал хэсэг.",
      emptyDescription: "Энэ сургуулийн нууц хүсэлтийн хэсэгт хүсэлт алга.",
      emptyTitle: "Аюулгүй байдлын хүсэлт алга",
      externalReferralAt: "Гадаад эсвэл биечилсэн шилжүүлэг бүртгэсэн",
      nextStatus: "Явцын дараагийн төлөв",
      reporterUnavailable: "Мэдээлэгчийн нэр боломжгүй",
      restrictedDescription:
        "Шалгалтын тэмдэглэл, хэргийн дэлгэрэнгүйг сургуулийн батлагдсан цахим бус системд хадгална. Нууц тайлбарыг ердийн лог, хяналтын самбар эсвэл шинжилгээнд хуулж болохгүй.",
      restrictedTitle: "Маш нууц мэдээлэл",
      title: "Аюулгүй байдлын хүсэлтүүд",
      updateStatus: "Төлөв шинэчлэх",
      viewConfidentialDescription: "Нууц тайлбар харах",
    },
    myReports: {
      closedAt: "Хаасан",
      description:
        "Энд зөвхөн мэдээлэгчид харуулахад аюулгүй төлөв байна. Хүсэлтийн тайлбарыг энэ хуудсанд буцаахгүй.",
      emptyDescription: "Таны илгээсэн хүсэлт хязгаарлагдмал төлөвийн мэдээлэлтэй энд харагдана.",
      emptyTitle: "Аюулгүй байдлын хүсэлт илгээгээгүй",
      safeSubset:
        "Нууцлалыг хамгаалахын тулд энд зөвхөн ангилал, төлөв, холбоо барих хүсэлт болон хариу өгсөн цагийг харуулна.",
      reviewStartedAt: "Хяналт эхэлсэн",
      submittedAt: "Илгээсэн",
      title: "Миний аюулгүй байдлын хүсэлт",
    },
    related: {
      clubPrefix: "Клуб",
      eventPrefix: "Үйл ажиллагаа",
    },
    report: {
      actions: {
        submit: "Нууц хүсэлт илгээх",
        submitting: "Аюулгүй илгээж байна...",
      },
      description:
        "Томилогдсон ажилтан асуудлыг ойлгоход шаардлагатай мэдээллийг л хуваалцана уу. Нотлох материал эсвэл хамааралгүй хувийн мэдээлэл нэмэхгүй.",
      fields: {
        category: "Асуудлын ангилал",
        description: "Товч тайлбар",
        descriptionHelp:
          "Товч бичнэ үү. Онош, шаардлагагүй нэр болон хувийн мэдээлэл оруулахгүй.",
        immediateContact: "Томилогдсон ажилтан надтай холбоо барихыг хүсэж байна",
        immediateContactHelp:
          "Энэ нь эргэж холбоо барих хүсэлт бөгөөд яаралтай тусламж үүсгэхгүй. Платформыг байнга хянадаггүй.",
        noRelatedActivity: "Холбоотой үйл ажиллагаа байхгүй",
        relatedActivity: "Холбоотой сургуулийн үйл ажиллагаа эсвэл клуб (заавал биш)",
      },
      title: "Аюулгүй байдлын асуудал мэдээлэх",
    },
    status: {
      beingReviewed: "Хянаж байна",
      closed: "Хаасан",
      submitted: "Илгээсэн",
    },
    success: {
      submitted:
        "Таны нууц хүсэлт илгээгдлээ. Төлөвийг Миний аюулгүй байдлын хүсэлт хэсгээс харна уу.",
      updated: "Аюулгүй байдлын хүсэлтийн төлөв шинэчлэгдлээ.",
    },
    title: "Аюулгүй байдал ба тусламж",
    urgent: {
      designatedOnly:
        "Зөвхөн сургуулийн томилогдсон аюулгүй байдлын хариу арга хэмжээний баг уг мэдээллийг хянах боломжтой.",
      notEmergency: "Энэ нь яаралтай тусламжийн үйлчилгээ биш.",
      title: "Аюулгүй байдлын чухал мэдэгдэл",
      urgentProcess:
        "Яаралтай асуудлыг сургуулийн ажилтанд шууд эсвэл орон нутгийн зохих яаралтай тусламжийн журмаар мэдээлнэ үү.",
    },
  },
  privacy: {
    access: {
      items: {
        platform:
          "Платформын админ эрх нь аюулгүй байдлын нууц тайлбар эсвэл сургуулийн хувийн бүртгэлд автоматаар хандах эрх олгохгүй.",
        school:
          "Эрх бүхий өөрийн сургуулийн ажилтан зөвхөн үүрэгт нь шаардлагатай мэдээлэлд хандана.",
        self: "Та өөрийн профайл болон өөрийн бүртгэлд нээлттэй сургуулийн мэдээллийг харж болно.",
      },
      title: "Үйл ажиллагааны өгөгдөлд хэн хандах вэ",
    },
    commitments: {
      noSale: "Платформ сурагчийн өгөгдлийг худалдахгүй, сурталчилгаанд ашиглахгүй.",
      safeguardingLimits:
        "Батлагдсан ажилтан сургуулийн аюулгүй байдал эсвэл хуулийн журмыг дагах шаардлагатай үед аюулгүй байдлын нууцлал хязгаарлагдаж болно.",
      title: "Нууцлалын амлалт ба хязгаар",
    },
    description:
      "Платформ ямар үйл ажиллагааны мэдээлэл ашигладаг болон хандалтыг хэрхэн хязгаарладгийг ойлгоно.",
    manual: {
      description:
        "Нууцлалын хүсэлтийг оролцогч сургууль гараар шийдвэрлэнэ. Сургуулийн баталсан журмаар сургуультай шууд холбоо барина уу.",
      title: "Нууцлалын хүсэлтийг гараар шийдвэрлэх",
    },
    operational: {
      items: {
        account: "Баталгаажсан бүртгэл, сургууль, үүрэг, профайл, сурагчдын жагсаалт болон хандалтын мэдээлэл.",
        activities: "Үйлчилгээг ажиллуулахад шаардлагатай клуб, үйл ажиллагаа, бүртгэл, зөвшөөрөл, ирц, зарлалын бүртгэл.",
        safety: "Хэрэглэгч энэ үйл явцыг сонгосон үед үүсэх хязгаарлагдмал аюулгүй байдлын мэдээлэл.",
      },
      title: "Платформын ашигладаг үйл ажиллагааны өгөгдөл",
    },
    research: {
      items: {
        noDisadvantage:
          "Сонголттой судалгаанаас татгалзах нь платформ эсвэл үйл ажиллагаанд хандах эрхийг хаах ёсгүй.",
        noInference:
          "Товшилт, оролцоог ганцаардал, сэтгэцийн эрүүл мэнд, зан чанар эсвэл нөхөрлөлийг оношлоход ашиглахгүй.",
        separate:
          "Үйл ажиллагааны оролцоо сонголттой судалгаанаас тусдаа. Энэ үе шатанд судалгааны асуулга эсвэл зөвшөөрлийн бүртгэлийг энэ апп-д хадгалахгүй.",
      },
      title: "Үйл ажиллагааны хэрэглээ ба судалгаа тусдаа",
    },
    title: "Нууцлал",
  },
  workflow: {
    addStudents: "Сурагч нэмэх",
    createClubsEvents: "Клуб/үйл ажиллагаа үүсгэх",
    generateInviteCodes: "Урилгын код үүсгэх",
    studentsJoin: "Сурагчид бүртгүүлэх",
    trackAttendance: "Ирц хянах",
  },
} satisfies PartialDictionary;
