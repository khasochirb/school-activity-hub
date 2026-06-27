"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { timeServer } from "@/lib/server-timing";
import { createClient } from "@/lib/supabase/server";

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
  const profile = await getCurrentStaffProfile();

  if (!profile) {
    return {
      message: "Only school admins and teachers can add students.",
      success: false,
    };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const grade = String(formData.get("grade") ?? "").trim();
  const classGroup = String(formData.get("class_group") ?? "").trim();
  const studentNumber = String(formData.get("student_number") ?? "").trim();
  const nameParts = fullName.split(/\s+/).filter(Boolean);

  if (!fullName) {
    return { message: "Student full name is required.", success: false };
  }

  if (nameParts.length < 2) {
    return {
      message: "Enter both a first and last name.",
      success: false,
    };
  }

  if (!grade) {
    return { message: "Grade is required.", success: false };
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
          ? "A student with that student number already exists."
          : `Student could not be added: ${error.message}`,
      success: false,
    };
  }

  revalidatePath("/students");

  return { message: "Student added.", success: true };
}

export async function importStudentsFromCsv(
  _state: ImportStudentsState,
  formData: FormData,
): Promise<ImportStudentsState> {
  const profile = await getCurrentStaffProfile();

  if (!profile) {
    return {
      message: "Only school admins and teachers can import students.",
      success: false,
    };
  }

  const file = formData.get("csv_file");

  if (!(file instanceof File) || file.size === 0) {
    return { message: "Choose a CSV file to import.", success: false };
  }

  const parsedCsv = parseCsv(await file.text());

  if (!parsedCsv.headers.length) {
    return { message: "CSV is empty or missing a header row.", success: false };
  }

  const headerMap = getHeaderMap(parsedCsv.headers);
  const fullNameIndex = headerMap.get("full_name");
  const gradeIndex = headerMap.get("grade");
  const classGroupIndex = headerMap.get("class_group");
  const studentNumberIndex = headerMap.get("student_number");
  const importErrors = [...parsedCsv.errors];

  if (fullNameIndex === undefined) {
    importErrors.push("Header row is missing required column: full_name.");
  }

  if (gradeIndex === undefined) {
    importErrors.push("Header row is missing required column: grade.");
  }

  if (fullNameIndex === undefined || gradeIndex === undefined) {
    return {
      message: formatImportMessage(0, importErrors),
      success: false,
    };
  }

  const parsedRows = parsedCsv.rows.map((row) =>
    parseImportRow(row, {
      classGroupIndex,
      fullNameIndex,
      gradeIndex,
      studentNumberIndex,
    }),
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
          `Row ${row.rowNumber}: duplicate student_number in this CSV (${row.studentNumber}).`,
        );
      }

      if (existingStudentNumbers.has(row.studentNumber)) {
        rowErrors.push(
          `Row ${row.rowNumber}: duplicate student_number already exists in this school (${row.studentNumber}).`,
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
      message: formatImportMessage(0, importErrors),
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
          ? "Import stopped because one or more student numbers already exist."
          : `Students could not be imported: ${error.message}`,
      success: false,
    };
  }

  revalidatePath("/students");

  return {
    message: formatImportMessage(validRows.length, importErrors),
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

function parseCsv(text: string) {
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
    const parsedLine = parseCsvLine(line);

    if (parsedLine.error) {
      errors.push(`Row ${rowNumber}: ${parsedLine.error}`);
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

function parseCsvLine(line: string) {
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
          error: "contains an unexpected quote.",
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
      error: "has an unclosed quoted value.",
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
) {
  const rowValues = record.values.map((value) => value.trim());

  if (!rowValues.some(Boolean)) {
    return {
      errors: [`Row ${record.rowNumber}: row is empty.`],
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
    errors.push(`Row ${record.rowNumber}: missing full_name.`);
  }

  if (!grade) {
    errors.push(`Row ${record.rowNumber}: missing grade.`);
  }

  if (fullName && nameParts.length < 2) {
    errors.push(
      `Row ${record.rowNumber}: full_name must include first and last name.`,
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

function formatImportMessage(importedCount: number, errors: string[]) {
  const lines: string[] = [];

  if (importedCount > 0) {
    lines.push(
      `Imported ${importedCount} student${importedCount === 1 ? "" : "s"}.`,
    );
  } else {
    lines.push("No students were imported.");
  }

  if (errors.length) {
    const visibleErrors = errors.slice(0, 10);

    lines.push(
      `Skipped ${errors.length} row${errors.length === 1 ? "" : "s"}:`,
      ...visibleErrors,
    );

    if (errors.length > visibleErrors.length) {
      lines.push(`...and ${errors.length - visibleErrors.length} more.`);
    }
  }

  return lines.join("\n");
}
