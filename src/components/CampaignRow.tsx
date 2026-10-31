"use client";
import { useState } from "react";
import Link from "next/link";
import CampaignName from "@/components/CampaignName";
import DeleteCampaignButton from "@/components/DeleteCampaignButton";
import PublishControls, { type Account } from "@/components/PublishControls";
import LocalTime from "@/components/LocalTime";

export type RowData = {
  id: string;
  name: string | null;
  caption: string;
  createdAt: string;
  status: string;
  statusLabel: string;
  active: boolean;
  attention: string[];
  scheduled: number;
  published: number;
  failed: number;
  nextAt: string | null;
  postableIds: string[];
  canDelete: boolean;
};

export default function CampaignRow({ row, accounts }: { row: RowData; accounts: Account[] }) {
  const [open, setOpen] = useState(false);
  const canPost = row.postableIds.length > 0;

  const parts: string[] = [];
  if (row.published) parts.push(`${row.published} published`);
  if (row.scheduled) parts.push(`${row.scheduled} scheduled`);
  if (row.failed) parts.push(`${row.failed} failed`);

  return (
    <div className="camp-row">
      <div className="camp-main">
        <div className="camp-title">
          <CampaignName
            id={row.id}
            name={row.name}
            fallback={row.caption}
            href={`/strata/genie/campaigns/${row.id}`}
          />
          <div className="camp-meta">
            <LocalTime iso={row.createdAt} />
            {parts.length > 0 && <> · {parts.join(" · ")}</>}
            {row.nextAt && (
              <>
                {" "}
                · next post <LocalTime iso={row.nextAt} />
              </>
            )}
          </div>
          {row.attention.length > 0 && (
            <div className="camp-attention">{row.attention.join(" · ")}</div>
          )}
        </div>

        <div className="camp-status">
          <span className={`pill ${row.status}`}>{row.statusLabel}</span>
          {row.active && <span className="pill active">Active</span>}
          {row.attention.length > 0 && <span className="pill attention">Needs attention</span>}
        </div>

        <div className="camp-actions">
          <Link href={`/strata/genie/campaigns/${row.id}`} className="btn xs secondary">
            Open
          </Link>
          <button
            type="button"
            className="btn xs secondary"
            onClick={() => setOpen((v) => !v)}
            disabled={!canPost}
            title={canPost ? undefined : "Available once the campaign is ready and an Instagram version exists"}
          >
            {open ? "Close" : "Post"}
          </button>
          <DeleteCampaignButton id={row.id} disabled={!row.canDelete} compact />
        </div>
      </div>

      {open && canPost && (
        <div className="camp-panel">
          <PublishControls outputIds={row.postableIds} accounts={accounts} buttonLabel="Post now" />
        </div>
      )}
    </div>
  );
}