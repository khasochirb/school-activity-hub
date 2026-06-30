import type { PartialDictionary } from "./en";

export const mn = {
  app: {
    name: "Сургуулийн үйл ажиллагааны төв",
    shortName: "SAH",
    subtitle: "Клуб, арга хэмжээ, урилга ба ирц",
  },
  feedback: {
    archiveClub: "Клуб архивлах",
    areYouSure: "Та итгэлтэй байна уу?",
    cannotBeUndone: "Энэ үйлдлийг буцаах боломжгүй.",
    cancelEvent: "Арга хэмжээ цуцлах",
    clearDemoData: "Демо өгөгдөл цэвэрлэх",
    confirm: "Баталгаажуулах",
    deactivateStaff: "Ажилтны эрхийг идэвхгүй болгох",
    deleteAnnouncement: "Зарлал устгах",
    error: "Алдаа",
    info: "Мэдээлэл",
    reactivateStaff: "Ажилтны эрхийг дахин идэвхжүүлэх",
    revokeInviteCode: "Урилгын код хүчингүй болгох",
    savedSuccessfully: "Амжилттай хадгалагдлаа",
    somethingWentWrong: "Алдаа гарлаа",
    success: "Амжилттай",
    warning: "Анхааруулга",
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
        inviteExpired: "Урилгын кодын хугацаа дууссан байна.",
        inviteInactive:
          "Урилгын код аль хэдийн ашиглагдсан эсвэл идэвхгүй болсон байна.",
        inviteNoRoster:
          "Урилгын код бүртгэлд байгаа сурагчтай холбогдоогүй байна.",
        inviteNotFound: "Урилгын код олдсонгүй.",
        inviteRequired: "Урилгын кодоо оруулна уу.",
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
    addManually: "Гараар нэмэх",
    approved: "Батлагдсан",
    backToDashboard: "Хянах самбар руу буцах",
    backToEvents: "Арга хэмжээ рүү буцах",
    cancel: "Цуцлах",
    canceled: "Цуцлагдсан",
    close: "Хаах",
    create: "Үүсгэх",
    createNew: "Шинээр үүсгэх",
    delete: "Устгах",
    details: "Дэлгэрэнгүй",
    hideDetails: "Дэлгэрэнгүйг нуух",
    hideForm: "Маягт нуух",
    inactive: "Идэвхгүй",
    importFromCsv: "CSV-ээс импортлох",
    lessDetails: "Бага дэлгэрэнгүй",
    moreDetails: "Илүү дэлгэрэнгүй",
    no: "Үгүй",
    noExtraDetails: "Нэмэлт мэдээлэл алга",
    notAvailableShort: "N/A",
    open: "Нээх",
    next: "Дараах",
    pending: "Хүлээгдэж буй",
    pageNumber: "Хуудас {number}",
    primaryAction: "Үндсэн үйлдэл",
    previous: "Өмнөх",
    rejected: "Татгалзсан",
    revoked: "Хүчингүй болгосон",
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
    pendingApproval: "Батлахыг хүлээж байна",
    redeemed: "Ашигласан",
    rejected: "Татгалзсан",
    revoked: "Хүчингүй болгосон",
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
    filter: "Шүүх",
    inactive: "Идэвхгүй",
    noResults: "Үр дүн олдсонгүй",
    noResultsDescription: "Өөр хайлт хийж эсвэл шүүлтүүрийг арилгана уу.",
    past: "Өнгөрсөн",
    received: "Хүлээн авсан",
    role: "Үүрэг",
    search: "Хайх",
    searchAnnouncements: "Зарлал хайх",
    searchClubs: "Клуб хайх",
    searchEvents: "Арга хэмжээ хайх",
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
      join: "Клубт нэгдэх",
      joining: "Нэгдэж байна...",
      leave: "Клубээс гарах",
      leaving: "Гарч байна...",
      makeLeader: "Клубын удирдагч болгох",
    },
    active: {
      title: "Идэвхтэй клубууд",
    },
    create: {
      description: "Сурагчид олж нэгдэх боломжтой идэвхтэй клуб нэмнэ үү.",
    },
    description:
      "Сурагчид нэгдэж болох клубууд үүсгэж, бэлэн үед сурагч удирдагч томилно уу.",
    empty: {
      staffDescription:
        "Сурагчид нэгдэх зүйлтэй болохын тулд эхний клубийг үүсгэнэ үү.",
      studentDescription:
        "Сургуулийн ажилтнууд үүсгэсний дараа идэвхтэй клубууд энд харагдана.",
      title: "Клуб одоогоор алга",
    },
    errors: {
      duplicateName: "Ийм нэртэй клуб аль хэдийн байна.",
      invalidCategory: "Зөв ангилал сонгоно уу.",
      invalidStatus: "Зөв клубын төлөв сонгоно уу.",
      loadFailed: "Клубуудыг ачаалж чадсангүй. Сэргээгээд дахин оролдоно уу.",
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
      name: "Нэр",
      noCategory: "Ангилалгүй",
      status: "Төлөв",
    },
    members: {
      empty:
        "Гишүүд одоогоор алга. Сурагчид энэ клубт нэгдсэний дараа энд харагдана.",
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
    title: "Клубууд",
  },
  clubRequests: {
    actions: {
      approve: "Клуб нээхийг зөвшөөрөх",
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
      staffTitle: "Хянах хүсэлт одоогоор алга.",
      studentDescription: "Хамгийн түрүүнд клуб санал болгоорой.",
      studentTitle: "Одоогоор клубын санаа алга.",
    },
    errors: {
      createFailed: "Клубын санааг илгээж чадсангүй. Дахин оролдоно уу.",
      invalidCategory: "Зөв ангилал сонгоно уу.",
      loadFailed:
        "Клубын хүсэлтүүдийг ачаалж чадсангүй. Сэргээгээд дахин оролдоно уу.",
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
      staffTitle: "Бүх клубын хүсэлтүүд",
      studentTitle: "Клубын санаанууд",
    },
    messages: {
      approved: "Энэ клуб зөвшөөрөгдсөн",
      becameClub: "Хүсэлтын дагуу клуб үүссэн",
    },
    staffDecisionNotice:
      "Сурагчид клубын санааг дэмжиж болох ч эцсийн шийдвэрийг ажилтнууд гаргана.",
    staffDescription:
      "Сурагчдын клубын санааг хянаж, дэмжлэгийг харьцуулж, сургууль клуб үүсгэхэд бэлэн үед хүсэлтийг зөвшөөрнө.",
    staffTitle: "Клубын хүсэлтүүд",
    status: {
      pendingReview: "Хянагдаж байна",
    },
    studentDescription:
      "Шинэ клуб санал болгож, сургуулийнхаа бусад сурагчдын санааг дэмжээрэй.",
    studentTitle: "Клубын санаанууд",
    success: {
      created: "Клубын санаа илгээгдлээ.",
    },
  },
  events: {
    actions: {
      attendanceQr: "Ирц ба QR",
      cancel: "Арга хэмжээг цуцлах",
      cancelMyRegistration: "Бүртгэл цуцлах",
      cancelling: "Цуцалж байна...",
      create: "Арга хэмжээ үүсгэх",
      createApproved: "Батлагдсан арга хэмжээ үүсгэх",
      creating: "Арга хэмжээ үүсгэж байна...",
      eventFull: "Арга хэмжээ дүүрсэн",
      join: "Арга хэмжээнд нэгдэх",
      joining: "Нэгдэж байна...",
      resetFilters: "Шүүлтүүрийг дахин тохируулах",
      saveSafety: "Аюулгүй байдлын мэдээлэл хадгалах",
      saveSharing: "Хуваалцах тохиргоо хадгалах",
      submitForApproval: "Батлуулахаар илгээх",
      submitting: "Илгээж байна...",
    },
    capacity: {
      noLimit: "Хязгааргүй",
    },
    card: {
      details: "Арга хэмжээний дэлгэрэнгүй",
      eventType: "Арга хэмжээний төрөл",
      hostedBy: "Зохион байгуулагч",
      location: "Байршил",
      maxParticipants: "Оролцогчдын дээд тоо",
      mySchool: "Манай сургууль",
      permission: "Зөвшөөрөл",
      registration: "Бүртгэл",
      safety: "Аюулгүй байдал",
      schoolEvent: "Сургуулийн арга хэмжээ",
    },
    create: {
      leaderDescription:
        "Клубын удирдагчийн арга хэмжээг сурагчид нэгдэхээс өмнө ажилтнуудад батлуулахаар илгээнэ.",
      leaderNeedsClub:
        "Клубын удирдагчаар томилогдсоны дараа арга хэмжээ илгээх боломжтой.",
      staffDescription:
        "Сургуулийн ажилтнуудын үүсгэсэн арга хэмжээ шууд батлагдаж, удахгүй болох үед сурагчдад харагдана.",
    },
    description:
      "Батлагдсан үйл ажиллагаа үүсгэж, сурагчдын бүртгэлийг удирдаж, арга хэмжээ эхлэхэд ирцийн check-in нээнэ үү.",
    detail: {
      approvedAt: "Батлагдсан",
      attendance: "Ирц",
      createdAt: "Үүссэн",
      eventInformation: "Арга хэмжээний мэдээлэл",
      internalEvent: "Дотоод арга хэмжээ",
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
      noPastTitle: "Өнгөрсөн арга хэмжээ алга",
      noUpcomingTitle: "Удахгүй болох арга хэмжээ алга",
      staffDescription:
        "Батлагдсан арга хэмжээ үүсгэх, клубын арга хэмжээ батлагдахыг хүлээх эсвэл шүүлтүүрийг өөрчилнө үү.",
      studentDescription:
        "Ажилтнууд эсвэл клубын удирдагчид нийтэлсний дараа батлагдсан удахгүй болох арга хэмжээнүүд энд харагдана.",
      title: "Эдгээр шүүлтүүрт тохирох арга хэмжээ алга",
    },
    errors: {
      createFailed:
        "Арга хэмжээг үүсгэж чадсангүй. Мэдээллээ шалгаад дахин оролдоно уу.",
      invalidCategory: "Зөв ангилал сонгоно уу.",
      invalidClub: "Зөв клуб сонгоно уу.",
      invalidRiskLevel: "Зөв эрсдэлийн түвшин сонгоно уу.",
      leaderClubRequired:
        "Клубын удирдагчид өөрийн клубүүдээс нэгийг сонгох ёстой.",
      loadFailed:
        "Арга хэмжээнүүдийг ачаалж чадсангүй. Сэргээгээд дахин оролдоно уу.",
      locationRequired: "Байршил шаардлагатай.",
      maxParticipantsPositive:
        "Оролцогчдын дээд тоо эерэг тоо байх ёстой.",
      staffOrLeaderOnly:
        "Зөвхөн сургуулийн ажилтан эсвэл клубын удирдагч арга хэмжээ үүсгэх боломжтой.",
      timeRequired: "Эхлэх болон дуусах цаг шаардлагатай.",
      titleRequired: "Арга хэмжээний гарчиг шаардлагатай.",
      unauthenticated: "Та нэвтэрсэн байх ёстой.",
      validTimeOrder: "Дуусах цаг эхлэх цагаас хойш байх ёстой.",
    },
    eyebrow: "Үйл ажиллагааны календарь",
    fallback: {
      clubEvent: "Клубын арга хэмжээ",
      connectedSchool: "Холбогдсон сургууль",
    },
    filters: {
      category: "Ангилал",
      club: "Клубын арга хэмжээнүүд",
      description:
        "Танай сургуулийн арга хэмжээ, хуваалцсан арга хэмжээ, бүртгэлүүд, клубын арга хэмжээ болон ангиллуудын хооронд шилжинэ үү.",
      myRegistered: "Миний бүртгүүлсэн арга хэмжээнүүд",
      mySchool: "Манай сургуулийн арга хэмжээнүүд",
      shared: "Хуваалцсан арга хэмжээнүүд",
      title: "Арга хэмжээ хайх",
      upcoming: "Удахгүй болох",
      viewLabel: "Арга хэмжээний харагдац",
    },
    formGroups: {
      basicDetails: "Үндсэн мэдээлэл",
      dateTime: "Огноо ба цаг",
      safetyPermissions: "Аюулгүй байдал ба зөвшөөрөл",
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
      endsAt: "Дуусах цаг",
      eventDate: "Арга хэмжээний огноо",
      eventTimePreview: "Арга хэмжээний цагийн урьдчилсан харагдац",
      location: "Байршил",
      maxParticipants: "Оролцогчдын дээд тоо",
      noCategory: "Ангилалгүй",
      permissionNote: "Зөвшөөрлийн тэмдэглэл",
      permissionNotePlaceholder:
        "Ажилтнууд, сурагчид эсвэл гэр бүлд зориулсан нэмэлт тэмдэглэл",
      permissionRequired: "Зөвшөөрөл шаардлагатай",
      quickDuration: "Хугацаа хурдан сонгох",
      riskLevel: "Эрсдэлийн түвшин",
      schoolWideEvent: "Сургуулийн хэмжээний арга хэмжээ",
      startTime: "Эхлэх цаг",
      startsAt: "Эхлэх цаг",
      timePreviewEmpty: "Хуваарийг урьдчилан харахын тулд огноо, цаг сонгоно уу.",
      timezoneHelper: "Цагийг танай сургуулийн цагийн бүсээр хадгална.",
      title: "Гарчиг",
    },
    listTitles: {
      club: "Клубын арга хэмжээнүүд",
      past: "Өнгөрсөн арга хэмжээнүүд",
      registered: "Миний бүртгүүлсэн арга хэмжээнүүд",
      sharedClub: "Хуваалцсан клубын арга хэмжээнүүд",
      sharedPast: "Хуваалцсан өнгөрсөн арга хэмжээнүүд",
      sharedRegistered: "Хуваалцсан бүртгүүлсэн арга хэмжээнүүд",
      sharedUpcoming: "Хуваалцсан удахгүй болох арга хэмжээнүүд",
      upcoming: "Удахгүй болох арга хэмжээнүүд",
    },
    permission: {
      mayBeRequired: "Шаардлагатай байж магадгүй",
      notRequired: "Шаардлагагүй",
      note: "Зөвшөөрлийн тэмдэглэл",
      required: "Зөвшөөрөл шаардлагатай",
      status: {
        declined: "Зөвшөөрөл татгалзсан",
        notRequired: "Зөвшөөрөл шаардлагагүй",
        pending: "Зөвшөөрөл хүлээгдэж байна",
        received: "Зөвшөөрөл авсан",
      },
      studentNotice:
        "Энэ арга хэмжээнд сургууль/эцэг эхийн зөвшөөрөл шаардлагатай байж магадгүй.",
    },
    registration: {
      checkedIn: "Check-in хийсэн",
      count: "{count} нэгдсэн",
      joined: "Нэгдсэн",
      maxSuffix: "/ дээд тал нь {count}",
      notJoined: "Нэгдээгүй",
      unavailable: "Бүртгүүлэх боломжгүй",
      youAreRegistered: "Та бүртгүүлсэн байна",
    },
    risk: {
      high: "Өндөр эрсдэл",
      low: "Бага эрсдэл",
      medium: "Дунд эрсдэл",
    },
    schedule: {
      later: "Дараа",
      past: "Өнгөрсөн арга хэмжээнүүд",
      thisWeek: "Энэ долоо хоног",
      today: "Өнөөдөр",
    },
    sharing: {
      allowConnectedRegistration:
        "Холбогдсон сургуулийн сурагчдыг бүртгүүлэхийг зөвшөөрөх",
      internalOnly: "Зөвхөн дотоод",
      noConnections: "Батлагдсан сургуулийн холболт одоогоор алга.",
      shareWith: "Хуваалцах сургууль",
      sharedEvent: "Хуваалцсан арга хэмжээ",
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
      createdApproved: "Арга хэмжээ үүсэж батлагдлаа.",
      submittedForApproval: "Арга хэмжээг батлуулахаар илгээлээ.",
    },
    validation: {
      dateRequired: "Огноо шаардлагатай.",
      endTimeRequired: "Дуусах цаг шаардлагатай.",
      startTimeRequired: "Эхлэх цаг шаардлагатай.",
      timeOrder: "Дуусах цаг нь эхлэх цагаас хойш байх ёстой.",
    },
    view: {
      list: "Жагсаалтаар харах",
      schedule: "Хуваариар харах",
      viewList: "Жагсаалт харах",
      viewSchedule: "Хуваарь харах",
    },
    title: "Арга хэмжээнүүд",
  },
  approvals: {
    actions: {
      approve: "Арга хэмжээг батлах",
      approving: "Баталж байна...",
      reject: "Арга хэмжээг татгалзах",
      rejecting: "Татгалзаж байна...",
    },
    description:
      "Клубын удирдагчийн арга хэмжээний хүсэлтүүдийг сурагчдад харагдахаас өмнө шалгана уу.",
    empty: {
      description:
        "Клубын удирдагчийн илгээсэн хүсэлтүүд ажилтны хяналт шаардлагатай үед энд харагдана.",
      title: "Хүлээгдэж буй арга хэмжээний батлах хүсэлт алга",
    },
    errors: {
      loadFailed:
        "Хүлээгдэж буй арга хэмжээнүүдийг ачаалж чадсангүй. Сэргээгээд дахин оролдоно уу.",
    },
    event: {
      location: "Байршил",
      maxParticipants: "Оролцогчдын дээд тоо",
      permission: "Зөвшөөрөл",
      safety: "Аюулгүй байдал",
      submitted: "Илгээсэн",
    },
    fallback: {
      clubEvent: "Клубын арга хэмжээ",
    },
    pending: {
      title: "Хүлээгдэж буй арга хэмжээний батлах хүсэлтүүд",
    },
    reject: {
      reasonLabel: "Татгалзсан шалтгаан",
    },
    title: "Батлах хүсэлтүүд",
  },
  attendance: {
    actions: {
      copied: "Хуулагдсан",
      copyLink: "Check-in холбоос хуулах",
      openLink: "Check-in холбоос нээх",
      savePermission: "Зөвшөөрөл хадгалах",
    },
    checkInLink: {
      description:
        "Check-in нээлттэй үед энэ холбоос эсвэл QR кодыг бүртгүүлсэн сурагчидтай хуваалцана уу.",
      fullUrl: "Бүрэн check-in URL",
      title: "Check-in холбоос",
    },
    empty: {
      description:
        "Энэ арга хэмжээнд нэгдсэн сурагчид зөвшөөрөл хянах болон check-in хийхэд энд харагдана.",
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
        pending: "Зөвшөөрөл хүлээгдэж байна",
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
      ariaLabel: "Арга хэмжээний check-in холбоосын QR код",
      instruction: "Ирц бүртгүүлэхийн тулд энэ кодыг уншуулна уу",
      title: "Check-in QR",
    },
    summary: {
      attendanceRate: "Ирцийн хувь",
      checkedIn: "Ирц бүртгүүлсэн",
      notCheckedIn: "Ирц бүртгүүлээгүй",
      registeredStudents: "Бүртгүүлсэн сурагчид",
      title: "Ирцийн товч мэдээлэл",
    },
    table: {
      checkInStatus: "Check-in төлөв",
      checkInTime: "Check-in цаг",
      checkedIn: "Check-in хийсэн",
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
    title: "Ирц ба QR",
  },
  checkIn: {
    actions: {
      checkIn: "Check-in хийх",
      checkingIn: "Check-in хийж байна...",
    },
    details: {
      location: "Байршил",
      permission: "Зөвшөөрөл",
      safety: "Аюулгүй байдал",
      time: "Цаг",
    },
    errors: {
      activeStudentsOnly:
        "Зөвхөн идэвхтэй сурагчийн бүртгэл энэ check-in холбоосыг ашиглах боломжтой.",
      eventUnavailable: "Энэ арга хэмжээнд check-in хийх боломжгүй.",
      invalidRegistrationStatus:
        "Энэ арга хэмжээний бүртгэлээр check-in хийх боломжгүй.",
      missingEvent: "Энэ check-in холбоост арга хэмжээ алга.",
      mustJoinFirst: "Check-in хийхээс өмнө энэ арга хэмжээнд нэгдэнэ үү.",
      noRoster:
        "Таны бүртгэл идэвхтэй жагсаалтын сурагчтай холбогдоогүй байна.",
    },
    failedTitle: "Ирц бүртгэгдсэнгүй",
    helpText: "Тусламж хэрэгтэй бол энэ хуудсыг ажилтанд үзүүлнэ үү.",
    permissionNote: "Зөвшөөрлийн тэмдэглэл",
    success: {
      alreadyCheckedIn: "Та аль хэдийн check-in хийсэн байна.",
      checkedIn: "Ирц амжилттай бүртгэгдлээ",
    },
    successTitle: "Ирц амжилттай бүртгэгдлээ",
    title: "Арга хэмжээний check-in",
  },
  reports: {
    actions: {
      exportCsv: "CSV экспортлох",
    },
    countLabels: {
      checkins: "Check-in",
      registrations: "Бүртгэлүүд",
    },
    description:
      "Сургуулийн хэмжээний үйл ажиллагааны хураангуйг шалгаж, жагсаалт, бүртгэл болон ирцийн CSV файлууд экспортлоно уу.",
    empty: {
      addStudents: "Сурагч нэмэх",
      createEvent: "Арга хэмжээ үүсгэх",
      description:
        "Тайлан харахын тулд арга хэмжээ зохион байгуулж, ирц бүртгэнэ үү.",
      title: "Одоогоор тайлангийн өгөгдөл алга",
    },
    exports: {
      attendanceCheckins: "Ирцийн check-in",
      description:
        "Туршилтын үнэлгээ эсвэл админы хүлээлгэн өгөхөд зориулж сургуулийн хүрээний CSV файлууд татна уу.",
      downloadCsv: "CSV татах",
      eventRegistrations: "Арга хэмжээний бүртгэлүүд",
      exportNotFound: "Экспорт олдсонгүй",
      notFound: "Олдсонгүй",
      studentRoster: "Сурагчдын жагсаалт",
      title: "Тайлан экспортлох",
    },
    eyebrow: "Үйл ажиллагааны тайлагнал",
    fallback: {
      event: "Арга хэмжээ",
      rosterStudent: "Жагсаалтын сурагч",
    },
    sections: {
      attendanceSummary: "Ирцийн товч мэдээлэл",
      eventActivity: "Арга хэмжээний үйл ажиллагаа",
      exportReports: "Тайлан экспортлох",
      overview: "Тайлангийн тойм",
      participationSummary: "Оролцооны товч мэдээлэл",
    },
    summary: {
      activeClubs: "Идэвхтэй клубууд",
      activeStudents: "Идэвхтэй сурагчид",
      approvedEvents: "Батлагдсан арга хэмжээнүүд",
      attendanceCheckins: "Ирцийн check-in",
      attendanceRate: "Ирцийн хувь",
      eventRegistrations: "Арга хэмжээний бүртгэлүүд",
      totalEvents: "Нийт арга хэмжээ",
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
          "Арга хэмжээний check-in нийт дүн одоогоор алга. Сурагчид check-in хийсний дараа арга хэмжээнүүд энд харагдана.",
        title: "Хамгийн олон check-in-тэй арга хэмжээнүүд",
      },
      eventsWithMostRegistrations: {
        emptyDescription:
          "Арга хэмжээний бүртгэлийн нийт дүн одоогоор алга. Сурагчид бүртгүүлсний дараа арга хэмжээнүүд энд харагдана.",
        title: "Хамгийн олон бүртгэлтэй арга хэмжээнүүд",
      },
      studentsWithMostCheckins: {
        emptyDescription:
          "Сурагчдын ирцийн нийт дүн одоогоор алга. Арга хэмжээнүүд QR холбоос ашигласны дараа check-in харагдана.",
        title: "Хамгийн олон ирцийн check-in хийсэн сурагчид",
      },
      studentsWithMostRegistrations: {
        emptyDescription:
          "Сурагчдын бүртгэлийн нийт дүн одоогоор алга. Сурагчид арга хэмжээнд нэгдсэний дараа энд харагдана.",
        title: "Хамгийн олон арга хэмжээний бүртгэлтэй сурагчид",
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
      loadFailed: "Зарлалуудыг ачаалж чадсангүй. Сэргээгээд дахин оролдоно уу.",
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
      save: "Профайл хадгалах",
    },
    description: "Бүртгэлийн мэдээллээ харж, харагдах нэрээ шинэчилнэ үү.",
    errors: {
      fullNameRequired: "Бүтэн нэр шаардлагатай.",
    },
    fallback: {
      noProfileFound: "Профайл олдсонгүй",
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
      title: "Сурагчийн жагсаалт",
    },
    settings: {
      description:
        "Та бүтэн нэрээ шинэчилж болно. Үүрэг болон сургуулийг ажилтнууд удирдана.",
      noProfileRow:
        "Энэ бүртгэлтэй холбогдсон профайлын мөр одоогоор алга.",
      title: "Профайлын тохиргоо",
    },
    success: {
      updated: "Профайл шинэчлэгдлээ.",
    },
    title: "Профайл",
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
      loadFailed: "Ажилтнуудыг ачаалж чадсангүй. Сэргээгээд дахин оролдоно уу.",
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
        "Сургуулийн мэдээллийг ачаалж чадсангүй. Сэргээгээд дахин оролдоно уу.",
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
        "Холболтуудыг ачаалж чадсангүй. Сэргээгээд дахин оролдоно уу.",
      currentSchoolMissing: "Танай сургуулийн бичлэгийг ачаалж чадсангүй.",
      invalidResponse: "Зөв холболтын хариу сонгоно уу.",
      invalidSchool: "Холбогдох зөв сургууль сонгоно уу.",
      pendingRequestNotFound: "Тэр хүлээгдэж буй хүсэлт олдсонгүй.",
      schoolsLoadFailed:
        "Сургуулиудыг ачаалж чадсангүй. Сэргээгээд дахин оролдоно уу.",
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
    attention: {
      description: "Ажилтны анхаарал шаардаж болох зүйлсийг шалгана уу.",
      emptyDescription: "Одоогоор бүх зүйл хэвийн байна.",
      emptyTitle: "Яаралтай зүйл алга",
      title: "Анхаарах зүйлс",
    },
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
      title: "Түргэн үйлдлүүд",
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
    welcomeBack: "Тавтай морил",
    upcoming: {
      description:
        "Танай сургуулийн календарь дээрх дараагийн батлагдсан үйл ажиллагаанууд.",
      emptyDescription:
        "Ажилтнууд эсвэл клубын удирдагчид үүсгэсний дараа батлагдсан ирээдүйн арга хэмжээнүүд энд харагдана.",
      emptyTitle: "Удахгүй болох арга хэмжээ одоогоор алга",
      locationNotSet: "Байршил тохируулаагүй",
      title: "Удахгүй болох батлагдсан арга хэмжээнүүд",
    },
    viewRegisteredEvents: "Миний бүртгүүлсэн арга хэмжээнүүд",
  },
  landing: {
    activityLabelAttendance: "Ирц",
    activityLabelClubs: "Клубын арга хэмжээнүүд",
    activityLabelInvites: "Урилгын хандалт",
    activityRowAttendance: "Шууд check-in бүртгэлүүд",
    activityRowClubs: "Багш баталсан",
    activityRowInvites: "Нэг удаагийн сурагчийн кодууд",
    activityWeekOverview: "Үйл ажиллагааны долоо хоногийн тойм",
    audienceAdmins: "Сургуулийн админууд",
    audienceAdminsBody:
      "Сурагчид, ажилтнууд, урилгын код, сургуулийн тохиргоо болон тайланг удирдана.",
    audienceDescription:
      "Үүрэг бүрт ойлгомжтой зам өгч, сургууль хувийн сурагчийн мэдээллийг ил гаргахгүйгээр үйл ажиллагаагаа турших боломжтой.",
    audienceEyebrow: "Сургуулийн хамт олонд зориулав",
    audienceStudents: "Сурагчид",
    audienceStudentsBody:
      "Клубт нэгдэж, арга хэмжээнд бүртгүүлж, зарлал шалгаж, ирцээ бүртгүүлнэ.",
    audienceTeachers: "Багш нар",
    audienceTeachersBody:
      "Клуб үүсгэж, арга хэмжээ удирдаж, үйл ажиллагаа баталж, ирц авна.",
    checkIn: "Check-in",
    clubsAndEvents: "Клуб ба арга хэмжээ",
    clubsAndEventsBody:
      "Сурагчид идэвхтэй клубүүдийг үзэж, батлагдсан арга хэмжээнд бүртгүүлж, удахгүй болох зүйлсээ хянах боломжтой.",
    demoWorkflow: "Демо ажлын урсгал",
    events: "Арга хэмжээ",
    goToDashboard: "Хянах самбар руу очих",
    headline:
      "Сургуулийн клуб, арга хэмжээ болон ирцийг нэг аюулгүй орчинд удирдаарай.",
    intro:
      "School Activity Hub нь сургуулиудад сурагчдын жагсаалт, урилгын код, клуб, арга хэмжээ батлах, QR ирц болон тайланг олон нийтэд нээхгүйгээр удирдахад тусална.",
    joinWithInviteCode: "Урилгын кодоор нэгдэх",
    pilotWorkflow: "Туршилтын ажлын урсгал",
    platformEyebrow: "Хувийн сургуулийн үйл ажиллагааны платформ",
    previewClubEventManagement: "Клуб ба арга хэмжээний удирдлага",
    previewClubEventManagementBody:
      "Клуб үүсгэж, арга хэмжээ нийтэлж, оролцоог эмх цэгцтэй байлгана.",
    previewQrAttendance: "QR ирц",
    previewQrAttendanceBody:
      "Арга хэмжээний үеэр энгийн ирцийн хуудсаар check-in ажиллуулна.",
    previewReports: "Сургуулийн тайлан",
    previewReportsBody: "Бүртгэл, ирц болон оролцооны товч мэдээллийг харна.",
    previewTeacherApproval: "Багшийн зөвшөөрөл",
    previewTeacherApprovalBody:
      "Сурагчид оролцохоос өмнө үйл ажиллагааг хянан батална.",
    previewVerifiedStudentAccess: "Баталгаажсан сурагчийн хандалт",
    previewVerifiedStudentAccessBody:
      "Сурагчид зөвхөн сургуулиас олгосон урилгын кодоор нэгдэнэ.",
    privateByDesign: "Анхнаасаа хаалттай, аюулгүй",
    privateByDesignBody:
      "Платформ нь сургуулийн удирддаг хандалт, үүргийн шалгалт, ажилтны тодорхой хяналт дээр суурилсан.",
    qrReady: "QR бэлэн",
    rostered: "Жагсаалтад орсон",
    schoolPilotSnapshot: "Сургуулийн туршилтын товч тойм",
    signIn: "Нэвтрэх",
    staffSignIn: "Сургуулийн ажилтан нэвтрэх",
    studentInviteHelper: "Сурагчид сургуулиасаа авсан урилгын кодоор нэвтэрнэ.",
    studentJoinWithInvite: "Сурагч урилгын кодоор нэгдэх",
    students: "Сурагчид",
    teacherOversight: "Багшийн хяналт",
    teacherOversightBody:
      "Сургуулийн админ болон багш нар баталгаажуулалт, аюулгүй байдлын тэмдэглэл, ирц, тайланг нэг газраас удирдана.",
    trustBilingual: "Англи/Монгол хоёр хэлний дэмжлэг",
    trustEyebrow: "Итгэлцэл ба аюулгүй байдал",
    trustInviteOnly: "Зөвхөн урилгаар нэвтрэх сурагчийн бүртгэл",
    trustQrAttendance: "QR ирцийн бүртгэл",
    trustSchoolRosters: "Сургуулийн удирддаг сурагчдын жагсаалт",
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
    description: "Хувийн сургуулийн клуб, арга хэмжээ, урилгын код, ирц.",
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
    announcements: "Зарлал",
    approvals: "Арга хэмжээний зөвшөөрөл",
    auditLog: "Платформын аудитын бүртгэл",
    clubIdeas: "Клубын санаа",
    clubRequests: "Клубын хүсэлт",
    clubs: "Клуб",
    dashboard: "Хянах самбар",
    events: "Арга хэмжээ",
    inviteCodes: "Сурагчийн урилгын код",
    logout: "Гарах",
    loggingOut: "Гарч байна...",
    main: "Үндсэн",
    manage: "Хэрэглэгч ба хандалт",
    menu: "Цэс",
    operations: "Хяналт ба бүртгэл",
    platform: "Платформ",
    platformConnections: "Платформын холболт",
    platformAdmins: "Платформын админууд",
    profile: "Хувийн мэдээлэл",
    reports: "Үйл ажиллагааны тайлан",
    schoolConnections: "Сургуулийн сүлжээ",
    schoolManagement: "Сургуулийн удирдлага",
    settings: "Сургуулийн тохиргоо",
    schools: "Сургуулиуд",
    staff: "Ажилтны бүртгэл",
    students: "Сурагчид",
    superAdmin: "Платформын админ",
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
      codesLoadFailed:
        "Урилгын кодуудыг ачаалж чадсангүй. Сэргээгээд дахин оролдоно уу.",
      staffOnly: "Зөвхөн сургуулийн админ болон багш нар урилгын код үүсгэх боломжтой.",
      studentAlreadyHasActiveCode:
        "Энэ сурагчид аль хэдийн идэвхтэй урилгын код байна.",
      studentInactiveOrWrongSchool:
        "Тэр сурагч идэвхтэй биш эсвэл танай сургуульд хамаарахгүй байна.",
      studentsLoadFailed:
        "Сурагчдыг ачаалж чадсангүй. Сэргээгээд дахин оролдоно уу.",
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
      loadFailed: "Сурагчдыг ачаалж чадсангүй. Сэргээгээд дахин оролдоно уу.",
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
  superAdmin: {
    accessRequired: "Платформын эрх шаардлагатай",
    actions: {
      backToSchools: "Сургуулиуд руу буцах",
      backToPlatformDashboard: "Платформын хянах самбар руу буцах",
      viewConnections: "Холболтууд харах",
      viewSchools: "Сургуулиуд харах",
    },
    auditLog: {
      actionLabels: {
        connectionApproved: "Холболт зөвшөөрөгдсөн",
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
      noRecentActions: "Одоогоор платформын сүүлийн үйлдэл алга.",
      recentActions: "Сүүлийн платформын үйлдлүүд",
      searchPlaceholder: "Аудитын бүртгэл хайх",
      title: "Платформын аудитын бүртгэл",
      unavailableDescription:
        "Платформын аудитын бүртгэлийн migration-ийг ажиллуулаад энэ хуудсыг дахин сэргээнэ үү.",
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
        updateFailed: "Холболт шинэчилж чадсангүй. Сэргээгээд дахин оролдоно уу.",
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
        pending: "Хүлээгдэж байна",
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
      title: "Платформын хянах самбар",
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
          "Профайлтай байгаа хэрэглэгчид платформын эрх нэмнэ үү.",
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
          "Платформын админыг шинэчилж чадсангүй. Сэргээгээд дахин оролдоно уу.",
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
          "Энэ сургууль өөрийн ажилтан, сурагч, клуб, арга хэмжээг удирдах боломжтой болохын тулд сургуулийн админ нэмнэ үү.",
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
        title: "Сургууль засах",
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
          "Сургуулийн админы төлөвийг шинэчилж чадсангүй. Сэргээгээд дахин оролдоно уу.",
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
  workflow: {
    addStudents: "Сурагч нэмэх",
    createClubsEvents: "Клуб/арга хэмжээ үүсгэх",
    generateInviteCodes: "Урилгын код үүсгэх",
    studentsJoin: "Сурагчид нэгдэх",
    trackAttendance: "Ирц хянах",
  },
} satisfies PartialDictionary;
