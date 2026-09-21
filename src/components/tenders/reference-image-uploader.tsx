"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";

import {
  recordReferenceImagesAction,
  signReferenceImageUploadsAction,
} from "@/app/actions/reference-images";
import { ImageProblemNotice } from "@/components/images/image-problem-notice";
import { useImageUpload } from "@/components/images/use-image-upload";
import { imageAccept, type PendingImage } from "@/lib/images/images";

/**
 * Drop five pictures in at once, against the Tender.
 *
 * The upload is per-Tender and the assignment to an Item happens afterwards, because
 * that is how the work arrives: one email, five pictures, and no way to tell from the
 * email which of the Tender's Items each is about. So there is no Item picker here —
 * they land Unassigned and get placed on the gallery below.
 *
 * One input, and no `capture` on it. These arrived by email an hour ago and are already
 * in the library, so the gesture is *choose the five that came in*; the camera hint
 * belongs on the Quote Photo input, where the picture is taken during the call.
 *
 * The sign-upload-record loop itself lives in `useImageUpload`, shared with Quote Photos.
 */
export function ReferenceImageUploader({
  tenderId,
  allowance,
}: {
  tenderId: string;
  /**
   * How many more Reference Images this Tender may carry, or null on a plan capping none.
   *
   * The Tender's allowance and not an Item's, because that is the grain the act has: a
   * Reference Image arrives Unassigned, so the per-Item figure on the plan row is turned
   * into the Tender's by `referenceImageCap` before it is counted against what is stored
   * (ADR-0040).
   *
   * A courtesy, never the gate — `signReferenceImageUploads` refuses the same way and is
   * what actually holds. This is so the refusal arrives before a phone on mobile data
   * spends the upload, and while the picker is still on screen to act on it.
   */
  allowance: number | null;
}) {
  const t = useTranslations("tenders.referenceImages");
  const input = useRef<HTMLInputElement>(null);
  const { error, progress, busy, upload } = useImageUpload({ allowance });
  const toThisTender = {
    sign: (images: PendingImage[]) =>
      signReferenceImageUploadsAction({ tenderId, images }),
    record: (storagePaths: string[]) =>
      recordReferenceImagesAction({ tenderId, storagePaths }),
  };

  return (
    <div className="flex flex-col gap-label">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t("add")}</span>
        <input
          ref={input}
          type="file"
          multiple
          accept={imageAccept}
          disabled={busy}
          className="file:bg-muted file:text-foreground hover:file:bg-muted/70 border-input h-11 w-full cursor-pointer rounded-control border bg-transparent text-sm file:mr-3 file:h-full file:cursor-pointer file:rounded-l-lg file:border-0 file:px-3 file:text-sm file:font-medium disabled:pointer-events-none disabled:opacity-50"
          onChange={async (event) => {
            const files = [...(event.target.files ?? [])];

            if (files.length === 0) return;

            try {
              await upload(files, toThisTender);
            } finally {
              // However the attempt ended, and especially when it failed: the input keeps
              // its old FileList otherwise, so re-picking the same five fires no `change`
              // event at all — which turns the retry after a dropped signal, the case this
              // whole flow is shaped around, into a tap that looks like a hang.
              if (input.current) input.current.value = "";
            }
          }}
        />
      </label>

      <p className="type-quiet">{t("hint")}</p>

      {progress ? (
        <p role="status" className="type-quiet">
          {t("uploading", { done: progress.done, total: progress.total })}
        </p>
      ) : null}

      <ImageProblemNotice error={error ?? undefined} />
    </div>
  );
}
