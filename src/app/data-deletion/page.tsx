import LegalPage from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Data deletion" };

export default function DataDeletion() {
  return (
    <LegalPage title="How to delete your data">
      <h2>Delete a campaign</h2>
      <p>
        In Genie, open <strong>Campaigns</strong> and choose <strong>Delete</strong> on a campaign.
        This removes its uploaded files, results and records from our storage and database.
      </p>
      <h2>Disconnect a social account</h2>
      <p>
        In Genie, open <strong>Connected accounts</strong> and choose <strong>Disconnect</strong>.
        This removes the stored access token and cancels scheduled posts. You can also remove
        STRATA in the settings of the social platform (for Instagram: Settings, Apps and websites).
      </p>
      <h2>Delete your account and all data</h2>
      <p>
        Send a request from the email address of your account to {LEGAL.privacyEmail}. We will
        delete your account and associated data within [PERIOD], except where the law requires us
        to keep something. [A SELF-SERVICE &ldquo;DELETE MY ACCOUNT&rdquo; BUTTON IS PLANNED]
      </p>
    </LegalPage>
  );
}