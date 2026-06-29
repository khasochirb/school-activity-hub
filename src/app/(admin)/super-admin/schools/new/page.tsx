import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import {
  HeaderActionLink,
  PageHeader,
} from "../../../_components/page-ui";
import { CreateSchoolForm } from "./create-school-form";

export default async function NewSuperAdminSchoolPage() {
  await requirePlatformAdmin();

  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <HeaderActionLink href="/super-admin/schools" variant="secondary">
            {t("superAdmin.actions.backToSchools")}
          </HeaderActionLink>
        }
        description={t("superAdmin.newSchool.description")}
        eyebrow={t("nav.superAdmin")}
        title={t("superAdmin.newSchool.title")}
      />

      <section className="notice-box">
        <p className="text-sm font-semibold">
          {t("superAdmin.newSchool.warning")}
        </p>
      </section>

      <section className="section-card section-card-padded">
        <CreateSchoolForm
          labels={{
            adminEmail: t("superAdmin.newSchool.form.adminEmail"),
            adminFullName: t("superAdmin.newSchool.form.adminFullName"),
            createAdmin: t("superAdmin.newSchool.form.createAdmin"),
            createSchoolAndAdmin: t(
              "superAdmin.newSchool.actions.createSchoolAndAdmin",
            ),
            createSchoolOnly: t("superAdmin.newSchool.actions.createSchoolOnly"),
            creating: t("superAdmin.newSchool.actions.creating"),
            firstSchoolAdmin: t("superAdmin.newSchool.form.firstSchoolAdmin"),
            province: t("superAdmin.newSchool.form.province"),
            schoolIdentifier: t("superAdmin.newSchool.form.schoolIdentifier"),
            schoolName: t("superAdmin.newSchool.form.schoolName"),
            slugHelp: t("superAdmin.newSchool.form.slugHelp"),
            status: t("superAdmin.newSchool.form.status"),
            statusActive: t("status.active"),
            statusArchived: t("status.archived"),
            temporaryPassword: t("superAdmin.newSchool.form.temporaryPassword"),
          }}
        />
      </section>
    </div>
  );
}
