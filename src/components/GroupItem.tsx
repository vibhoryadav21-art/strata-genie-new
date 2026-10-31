"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import CampaignName from "@/components/CampaignName";
import DeleteCampaignButton from "@/components/DeleteCampaignButton";
import LocalTime from "@/components/LocalTime";

export type ItemData = {
  id: string;
  name: string | null;
  fallback: string;
  thumbUrl: string | null;
  kind: "image" | "video";
  status: string;
  statusLabel: string;
  processAt: string | null;
  waiting: boolean;
  attention: string[];
  scheduled: number;
  published: number;
  failed: number;
  nextAt: string | null;
  canDelete: boolean;
};

function StatusLine({ item, autoPost }: { item: ItemData; autoPost: boolean }) {
  if (item.status === "draft") return <>Upload didn&apos;t finish</>;
  if (item.waiting && item.processAt) {
    return (
      <>
        Scheduled for <LocalTime iso={item.processAt} />
        {autoPost ? ", then posted automatically" : ""}
      </>
    );
  }
  if (item.status === "queued") return <>Waiting for Genie to pick it up…</>;
  if (item.status === "processing") return <>Genie is working on it…</>;
  if (item.published > 0) return <>{item.published} published</>;
  if (item.scheduled > 0 && item.nextAt) {
    return (
      <>
        Posting at <LocalTime iso={item.nextAt} />
      </>
    );
  }
  if (item.status === "ready") return <>Ready. Open it to review and post.</>;
  if (item.status === "failed") return <>Processing failed</>;
  return <>{item.statusLabel}</>;
}

export default function GroupItem({ item, autoPost }: { item: ItemData; autoPost: boolean }) {
  return (
    <div className="item-row">
      <div className="item-thumb">
        {item.thumbUrl &&
          (item.kind === "image" ? (
            <img src={item.thumbUrl} alt="" />
          ) : (
            <video src={`${item.thumbUrl}#t=0.1`} preload="metadata" muted playsInline />
          ))}
      </div>

      <div className="item-main">
        <CampaignName
          id={item.id}
          name={item.name}
          fallback={item.fallback}
          href={`/strata/genie/campaigns/${item.id}`}
        />
        <div className="camp-meta">
          <StatusLine item={item} autoPost={autoPost} />
        </div>
        {item.attention.length > 0 && (
          <div className="camp-attention">{item.attention.join(" · ")}</div>
        )}
      </div>

      <div className="camp-status">
        <span className={`pill ${item.waiting ? "queued" : item.status}`}>{item.statusLabel}</span>
        {item.attention.length > 0 && <span className="pill attention">Needs attention</span>}
      </div>

      <div className="camp-actions">
        <Link href={`/strata/genie/campaigns/${item.id}`} className="btn xs secondary">
          Open
        </Link>
        <DeleteCampaignButton id={item.id} disabled={!item.canDelete} compact />
      </div>
    </div>
  );
}