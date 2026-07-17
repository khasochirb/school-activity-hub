"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { timeServer } from "@/lib/server-timing";
import { createClient } from "@/lib/supabase/server";

type ServerI18n = {
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
};

type StaffProfile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

export type CreateStudentState = {
  message: string;
  success: boolean;
};

export type ImportStudentsState = {
  message: string;
  success: boolean;
};

type ParsedCsvRecord = {
  rowNumber: number;
  values: string[];
};

type ParsedImportRow = {
  classGroup: string;
  firstName: string;
  grade: string;
  lastName: string;
  rowNumber: number;
  studentNumber: string;
};

export async function createStudent(
  _state: CreateStudentState,
  formData: FormData,
): Promise<CreateStudentState> {
  const { t, tf } = await getServerI18n();
  const profile = await getCurrentStaffProfile();

  if (!profile) {
    return {
      message: t("students.errors.staffOnlyAdd"),
      success: false,
    };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const grade = String(formData.get("grade") ?? "").trim();
  const classGroup = String(formData.get("class_group") ?? "").trim();
  const studentNumber = String(formData.get("student_number") ?? "").trim();
  const nameParts = fullName.split(/\s+/).filter(Boolean);

  if (!fullName) {
    return { message: t("students.errors.fullNameRequired"), success: false };
  }

  if (nameParts.length < 2) {
    return {
      message: t("students.errors.firstAndLastName"),
      success: false,
    };
  }

  if (!grade) {
    return { message: t("students.errors.gradeRequired"), success: false };
  }

  const [firstName, ...lastNameParts] = nameParts;
  const supabase = await createClient();
  const { error } = await timeServer("students.action.create-student.insert", () =>
    supabase.from("student_rosters").insert({
      school_id: profile.school_id,
      first_name: firstName,
      last_name: lastNameParts.join(" "),
      grade_level: grade,
      homeroom: classGroup || null,
      student_number: studentNumber || null,
      status: "active",
      created_by_profile_id: profile.id,
    }),
  );

  if (error) {
    return {
      message:
        error.code === "23505"
          ? t("students.errors.duplicateStudentNumber")
          : tf("students.errors.addFailed", {
              error: t("common.somethingWentWrong"),
            }),
      success: false,
    };
  }

  revalidatePath("/students");

  return { message: t("students.success.added"), success: true };
}

export async function importStudentsFromCsv(
  _state: ImportStudentsState,
  formData: FormData,
): Promise<ImportStudentsState> {
  const { t, tf } = await getServerI18n();
  const profile = await getCurrentStaffProfile();

  if (!profile) {
    return {
      message: t("students.import.errors.staffOnly"),
      success: false,
    };
  }

  const file = formData.get("csv_file");

  if (!(file instanceof File) || file.size === 0) {
    return { message: t("students.import.errors.chooseFile"), success: false };
  }

  const parsedCsv = parseCsv(await file.text(), { t, tf });

  if (!parsedCsv.headers.length) {
    return { message: t("students.import.errors.csvEmpty"), success: false };
  }

  const headerMap = getHeaderMap(parsedCsv.headers);
  const fullNameIndex = headerMap.get("full_name");
  const gradeIndex = headerMap.get("grade");
  const classGroupIndex = headerMap.get("class_group");
  const studentNumberIndex = headerMap.get("student_number");
  const importErrors = [...parsedCsv.errors];

  if (fullNameIndex === undefined) {
    importErrors.push(t("students.import.errors.missingFullNameHeader"));
  }

  if (gradeIndex === undefined) {
    importErrors.push(t("students.import.errors.missingGradeHeader"));
  }

  if (fullNameIndex === undefined || gradeIndex === undefined) {
    return {
      message: formatImportMessage(0, importErrors, tf),
      success: false,
    };
  }

  const parsedRows = parsedCsv.rows.map((row) =>
    parseImportRow(
      row,
      {
        classGroupIndex,
        fullNameIndex,
        gradeIndex,
        studentNumberIndex,
      },
      tf,
    ),
  );
  const studentNumbers = parsedRows
    .filter((row) => row.row)
    .map((row) => row.row?.studentNumber)
    .filter((studentNumber): studentNumber is string => Boolean(studentNumber));
  const duplicateCsvNumbers = getDuplicateValues(studentNumbers);
  const existingStudentNumbers = await getExistingStudentNumbers(
    profile.school_id,
    Array.from(new Set(studentNumbers)),
  );
  const validRows: ParsedImportRow[] = [];

  parsedRows.forEach((parsedRow) => {
    const rowErrors = [...parsedRow.errors];
    const row = parsedRow.row;

    if (row?.studentNumber) {
      if (duplicateCsvNumbers.has(row.studentNumber)) {
        rowErrors.push(
          tf("students.import.errors.duplicateInCsv", {
            row: row.rowNumber,
            studentNumber: row.studentNumber,
          }),
        );
      }

      if (existingStudentNumbers.has(row.studentNumber)) {
        rowErrors.push(
          tf("students.import.errors.duplicateInSchool", {
            row: row.rowNumber,
            studentNumber: row.studentNumber,
          }),
        );
      }
    }

    if (rowErrors.length) {
      importErrors.push(...rowErrors);
      return;
    }

    if (row) {
      validRows.push(row);
    }
  });

  if (!validRows.length) {
    return {
      message: formatImportMessage(0, importErrors, tf),
      success: false,
    };
  }

  const supabase = await createClient();
  const { error } = await timeServer(
    "students.action.import-students.insert",
    () =>
      supabase.from("student_rosters").insert(
        validRows.map((row) => ({
          school_id: profile.school_id,
          first_name: row.firstName,
          last_name: row.lastName,
          grade_level: row.grade,
          homeroom: row.classGroup || null,
          student_number: row.studentNumber || null,
          status: "active",
          created_by_profile_id: profile.id,
        })),
      ),
  );

  if (error) {
    return {
      message:
        error.code === "23505"
          ? t("students.import.errors.duplicatesExist")
          : tf("students.import.errors.importFailed", {
              error: t("common.somethingWentWrong"),
            }),
      success: false,
    };
  }

  revalidatePath("/students");

  return {
    message: formatImportMessage(validRows.length, importErrors, tf),
    success: true,
  };
}

export async function markStudentInactive(formData: FormData) {
  const profile = await getCurrentStaffProfile();

  if (!profile) {
    redirect("/dashboard");
  }

  const studentId = String(formData.get("student_id") ?? "").trim();

  if (!studentId) {
    return;
  }

  const supabase = await createClient();
  await timeServer("students.action.mark-inactive.update", () =>
    supabase
      .from("student_rosters")
      .update({ status: "inactive" })
      .eq("id", studentId)
      .eq("school_id", profile.school_id),
  );

  revalidatePath("/students");
}

async function getCurrentStaffProfile(): Promise<StaffProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await timeServer("students.action.current-staff.auth-get-user", () =>
    supabase.auth.getUser(),
  );

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await timeServer(
    "students.action.current-staff.profile",
    () =>
      supabase
        .from("profiles")
        .select("id, school_id, role")
        .eq("id", user.id)
        .maybeSingle<StaffProfile>(),
  );

  if (!profile || !["school_admin", "teacher"].includes(profile.role)) {
    return null;
  }

  return profile;
}

async function getExistingStudentNumbers(
  schoolId: string,
  studentNumbers: string[],
) {
  if (!studentNumbers.length) {
    return new Set<string>();
  }

  const supabase = await createClient();
  const { data: existingStudents } = await timeServer(
    "students.action.import-students.existing-student-numbers",
    () =>
      supabase
        .from("student_rosters")
        .select("student_number")
        .eq("school_id", schoolId)
        .in("student_number", studentNumbers)
        .returns<Array<{ student_number: string | null }>>(),
  );

  return new Set(
    (existingStudents ?? [])
      .map((student) => student.student_number)
      .filter((studentNumber): studentNumber is string => Boolean(studentNumber)),
  );
}

async function getServerI18n(): Promise<ServerI18n> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);

  return { t, tf };
}

function parseCsv(text: string, i18n: ServerI18n) {
  const normalizedText = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const lines = normalizedText.split("\n");

  while (lines.length && !lines[lines.length - 1].trim()) {
    lines.pop();
  }

  const records: ParsedCsvRecord[] = [];
  const errors: string[] = [];

  lines.forEach((line, index) => {
    const rowNumber = index + 1;
    const parsedLine = parseCsvLine(line, i18n.t);

    if (parsedLine.error) {
      errors.push(
        i18n.tf("students.import.errors.rowPrefix", {
          error: parsedLine.error,
          row: rowNumber,
        }),
      );
      return;
    }

    records.push({ rowNumber, values: parsedLine.values });
  });

  return {
    errors,
    headers: records[0]?.values ?? [],
    rows: records.slice(1),
  };
}

function parseCsvLine(line: string, t: (key: string) => string) {
  const values: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (inQuotes) {
        inQuotes = false;
      } else if (!field.length) {
        inQuotes = true;
      } else {
        return {
          error: t("students.import.errors.csvQuote"),
          values,
        };
      }
    } else if (char === "," && !inQuotes) {
      values.push(field);
      field = "";
    } else {
      field += char;
    }
  }

  if (inQuotes) {
    return {
      error: t("students.import.errors.csvUnclosedQuote"),
      values,
    };
  }

  values.push(field);

  return { values };
}

function getHeaderMap(headers: string[]) {
  const headerMap = new Map<string, number>();

  headers.forEach((header, index) => {
    const normalizedHeader = normalizeHeader(header);

    if (normalizedHeader && !headerMap.has(normalizedHeader)) {
      headerMap.set(normalizedHeader, index);
    }
  });

  return headerMap;
}

function parseImportRow(
  record: ParsedCsvRecord,
  indexes: {
    classGroupIndex: number | undefined;
    fullNameIndex: number;
    gradeIndex: number;
    studentNumberIndex: number | undefined;
  },
  tf: (key: string, values: Record<string, string | number>) => string,
) {
  const rowValues = record.values.map((value) => value.trim());

  if (!rowValues.some(Boolean)) {
    return {
      errors: [
        tf("students.import.errors.rowEmpty", { row: record.rowNumber }),
      ],
      row: null,
    };
  }

  const fullName = getRowValue(rowValues, indexes.fullNameIndex);
  const grade = getRowValue(rowValues, indexes.gradeIndex);
  const classGroup = getRowValue(rowValues, indexes.classGroupIndex);
  const studentNumber = getRowValue(rowValues, indexes.studentNumberIndex);
  const errors: string[] = [];
  const nameParts = fullName.split(/\s+/).filter(Boolean);

  if (!fullName) {
    errors.push(
      tf("students.import.errors.missingFullName", {
        row: record.rowNumber,
      }),
    );
  }

  if (!grade) {
    errors.push(
      tf("students.import.errors.missingGrade", {
        row: record.rowNumber,
      }),
    );
  }

  if (fullName && nameParts.length < 2) {
    errors.push(
      tf("students.import.errors.fullNameFirstLast", {
        row: record.rowNumber,
      }),
    );
  }

  if (errors.length) {
    return { errors, row: null };
  }

  const [firstName, ...lastNameParts] = nameParts;

  return {
    errors,
    row: {
      classGroup,
      firstName,
      grade,
      lastName: lastNameParts.join(" "),
      rowNumber: record.rowNumber,
      studentNumber,
    },
  };
}

function getRowValue(values: string[], index: number | undefined) {
  if (index === undefined) {
    return "";
  }

  return values[index]?.trim() ?? "";
}

function getDuplicateValues(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  values.forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  });

  return duplicates;
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
}

function formatImportMessage(
  importedCount: number,
  errors: string[],
  tf: (key: string, values: Record<string, string | number>) => string,
) {
  const lines: string[] = [];

  if (importedCount > 0) {
    lines.push(
      tf("students.import.result.imported", { count: importedCount }),
    );
  } else {
    lines.push(tf("students.import.result.noStudents", { count: 0 }));
  }

  if (errors.length) {
    const visibleErrors = errors.slice(0, 10);

    lines.push(
      tf("students.import.result.skipped", { count: errors.length }),
      ...visibleErrors,
    );

    if (errors.length > visibleErrors.length) {
      lines.push(
        tf("students.import.result.more", {
          count: errors.length - visibleErrors.length,
        }),
      );
    }
  }

  return lines.join("\n");
}
