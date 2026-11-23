"use server";

import { revalidatePath } from "next/cache";
import { linkParentToChild, type ParentJoinState } from "@/lib/family/parent-codes";
import { getParentViewer } from "@/lib/family/family-data";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";

// A signed-in parent adds another child with that child's parent code.
export async function addChildWithCode(
  _state: ParentJoinState,
  formData: FormData,
): Promise<ParentJoinState> {
  const dictionary = getDictionary(await getCurrentLocale());
  const t = (key: string) => translate(dictionary, key);
  const parent = await getParentViewer();

  if (!parent) return { message: t("family.errors.notParent"), success: false };

  const result = await linkParentToChild({
    code: String(formData.get("invite_code") ?? ""),
    parentProfileId: parent.id,
    parentSchoolId: parent.schoolId,
  });

  if (result.error) return { message: t(`family.errors.${result.error}`), success: false };

  revalidatePath("/family");

  return { message: t("family.add.success"), success: true };
}
