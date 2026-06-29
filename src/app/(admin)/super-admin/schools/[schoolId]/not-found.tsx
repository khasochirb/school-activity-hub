import {
  HeaderActionLink,
  PageHeader,
} from "../../../_components/page-ui";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";

export default async function SuperAdminSchoolNotFound() {
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
        description={t("superAdmin.schoolDetail.notFound.description")}
        eyebrow={t("nav.superAdmin")}
        title={t("superAdmin.schoolDetail.errors.schoolNotFound")}
      />
    </div>
  );
}
