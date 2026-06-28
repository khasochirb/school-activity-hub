import {
  getCurrentStaffProfile,
  getReportCsvExport,
} from "../../report-data";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const profile = await getCurrentStaffProfile();

  if (!profile) {
    return new Response(t("reports.exports.notFound"), { status: 404 });
  }

  const { type } = await params;
  const exportData = await getReportCsvExport(type, profile.school_id);

  if (!exportData) {
    return new Response(t("reports.exports.exportNotFound"), { status: 404 });
  }

  return new Response(exportData.csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${exportData.filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
