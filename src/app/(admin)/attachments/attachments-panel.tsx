import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { getAttachmentAccess, listAttachments, type AttachmentRow } from "@/lib/attachments/attachment-access";
import { formatFileSize, type AttachmentOwnerType } from "@/lib/attachments/attachments";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { deleteAttachment } from "./actions";
import { AttachmentUploader } from "./attachment-uploader";

// The files of one club, event or announcement: a download list for everyone
// who may see it, plus add and delete for those who may manage it. Shows
// nothing to people with no access, or when there are no files and they
// cannot add any.
export async function AttachmentsPanel({
  compact = false,
  ownerId,
  ownerType,
  preloaded,
}: {
  compact?: boolean;
  ownerId: string;
  ownerType: AttachmentOwnerType;
  /** For lists (announcements): files and rights worked out once for all rows. */
  preloaded?: { canManage: boolean; files: AttachmentRow[] };
}) {
  const checked = preloaded ? null : await getAttachmentAccess(ownerType, ownerId);

  if (!preloaded && !checked?.canView) return null;

  const access = preloaded ?? { canManage: checked!.canManage };
  const files = preloaded ? preloaded.files : await listAttachments(ownerType, ownerId, checked!.schoolId);

  if (!files.length && !access.canManage) return null;

  const dictionary = getDictionary(await getCurrentLocale());
  const t = (key: string) => translate(dictionary, key);

  return (
    <section className="attach" data-compact={compact || undefined}>
      {compact ? null : <h2>{t("attachments.title")}</h2>}
      {files.length ? (
        <ul>
          {files.map((file) => (
            <li key={file.id}>
              <a download href={`/files/${file.id}`}>
                <span aria-hidden="true" className="attach-icon" data-kind={file.content_type === "application/pdf" ? "pdf" : "doc"}>
                  {file.content_type === "application/pdf" ? "PDF" : "DOC"}
                </span>
                <span className="attach-name">
                  <b>{file.file_name}</b>
                  <small>{formatFileSize(file.size_bytes)}</small>
                </span>
              </a>
              {access.canManage ? (
                <form action={deleteAttachment}>
                  <input name="attachment_id" type="hidden" value={file.id} />
                  <ConfirmSubmitButton
                    cancelLabel={t("common.cancel")}
                    className="btn btn-quiet min-h-9 px-3"
                    confirmDescription={file.file_name}
                    confirmLabel={t("attachments.delete")}
                    confirmTitle={t("attachments.deleteTitle")}
                    pendingLabel={t("common.saving")}
                  >
                    {t("attachments.delete")}
                  </ConfirmSubmitButton>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {access.canManage ? (
        <AttachmentUploader
          labels={{
            add: t("attachments.add"),
            errors: {
              denied: t("attachments.errors.denied"),
              invalidType: t("attachments.errors.invalidType"),
              saveFailed: t("attachments.errors.saveFailed"),
              tooLarge: t("attachments.errors.tooLarge"),
              tooMany: t("attachments.errors.tooMany"),
              uploadFailed: t("attachments.errors.uploadFailed"),
            },
            hint: t("attachments.hint"),
            uploading: t("attachments.uploading"),
          }}
          ownerId={ownerId}
          ownerType={ownerType}
        />
      ) : null}
    </section>
  );
}
