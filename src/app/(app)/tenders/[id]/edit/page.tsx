import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Screen } from "@/components/screen";
import { Measure } from "@/components/ui/screen-body";
import { Section } from "@/components/ui/section";
import { ScreenHeader } from "@/components/ui/screen-header";
import { AssigneeControls } from "@/components/tenders/assignee-controls";
import { EditTenderForm } from "@/components/tenders/edit-tender-form";
import { ReferenceImageGallery } from "@/components/tenders/reference-image-gallery";
import { ReferenceImageUploader } from "@/components/tenders/reference-image-uploader";
import {
  AddTenderItemForm,
  EditTenderItemForm,
} from "@/components/tenders/tender-item-forms";
import { currentUser } from "@/lib/auth/session";
import { listReferenceImages } from "@/lib/images/reference-images";
import { listMembers, ownerOptions } from "@/lib/org/members";
import { getTender } from "@/lib/tenders/tenders";

export default async function EditTenderPage({
  params,
}: PageProps<"/tenders/[id]/edit">) {
  const { id } = await params;
  const store = await cookies();
  const user = await currentUser(store);

  if (!user) redirect("/login");

  // Three reads that never needed each other. `listReferenceImages` was written as
  // `tender.id`, which reads like a dependency on the Tender having come back; it is the
  // `id` out of the params either way, so all three start together. The cost is the
  // reads still happening when there is no such Tender — they come back empty through
  // RLS and are thrown away, which is one wasted trip on the mistaken link in exchange
  // for two removed from every real edit.
  const [tender, members, referenceImages] = await Promise.all([
    getTender(id, store),
    listMembers(store),
    listReferenceImages(id, store),
  ]);

  if (!tender) notFound();

  const t = await getTranslations("tenders");

  return (
    <Screen
      location={{
        kind: "record",
        backHref: `/tenders/${tender.id}`,
        reference: tender.reference,
        detail: tender.clientName,
      }}
    >
      <ScreenHeader eyebrow={tender.reference} heading={t("edit")}>
        <p className="type-quiet">{t("editDescription")}</p>
      </ScreenHeader>

      {/* The Owner this Tender already has, even if they have since been disabled and
          so are not in `members`: a picker that cannot show them reassigns them. */}
      <Measure>
        <EditTenderForm
          tenderId={tender.id}
          members={ownerOptions(members, {
            id: tender.ownerUserId,
            name: tender.ownerName,
          })}
          defaults={tender}
        />
      </Measure>

      <Measure>
        <Section id="items" title={t("item.plural")}>
          <p className="type-quiet">{t("item.hint")}</p>

          {/* One fold per Item, summarised by the product name (ADR-0031). Both props
              are the same count read twice, and both are derived here rather than
              remembered: the reader is correcting one Item, so the rest stay shut. */}
          {tender.items.map((item) => (
            <EditTenderItemForm
              key={item.id}
              tenderId={tender.id}
              item={item}
              // The last Item cannot go: a Tender that asks for nothing is a Tender
              // nobody can Bid on, and the server refuses it either way.
              removable={tender.items.length > 1}
              // A fold over a list of one is a tap in front of the only thing there is
              // to edit.
              defaultOpen={tender.items.length === 1}
            />
          ))}

          <AddTenderItemForm tenderId={tender.id} />
        </Section>
      </Measure>

      {/* Buildspec screen 3 puts Reference Images on this screen, and they upload
          per-Tender: five pictures arrive in one email with nothing saying which Item
          each is of, so the placing happens below, against pictures you can see. */}
      <Section id="reference-images" title={t("referenceImages.title")}>
        {/* The hint lives on the input rather than on the heading — one sentence, beside
            the thing it is about. */}
        <ReferenceImageUploader tenderId={tender.id} />

        <ReferenceImageGallery
          tenderId={tender.id}
          images={referenceImages}
          items={tender.items}
        />
      </Section>

      {/* Buildspec screen 3 names Assignees alongside the dates and the Items. They
          also sit on the detail page, because that is where somebody who was never
          asked goes to put themselves on a Tender. */}
      {/* **A `Section` here and a `Fold` on the detail screen, on purpose.** The same
          block is a lookup there — *who else is on this?* — and the work here, since
          managing Assignees is one of the things this screen exists to do. It is also
          where the heading went when the Tender detail's fold took it over: the component
          stopped drawing its own `<h2>` and this page, which draws it bare, was left with
          an unlabelled list. */}
      <Section id="assignees" title={t("assignees.title")}>
        <AssigneeControls
          tenderId={tender.id}
          assignees={tender.assignees}
          members={members}
          callerId={user.id}
          isOwner={tender.ownerUserId === user.id}
        />
      </Section>
    </Screen>
  );
}
