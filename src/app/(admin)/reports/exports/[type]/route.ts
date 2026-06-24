import {
  getCurrentStaffProfile,
  getReportCsvExport,
} from "../../report-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const profile = await getCurrentStaffProfile();

  if (!profile) {
    return new Response("Not found", { status: 404 });
  }

  const { type } = await params;
  const exportData = await getReportCsvExport(type, profile.school_id);

  if (!exportData) {
    return new Response("Export not found", { status: 404 });
  }

  return new Response(exportData.csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${exportData.filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
