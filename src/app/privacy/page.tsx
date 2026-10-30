import LegalPage from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Privacy notice" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy notice">
      <h2>1. Who we are</h2>
      <p>
        The controller of your personal data is {LEGAL.legalName} ({LEGAL.orgName}), a{" "}
        {LEGAL.legalForm}, {LEGAL.address}. Contact for privacy questions: {LEGAL.privacyEmail}.
      </p>
      <p>
        This notice covers the website {LEGAL.siteUrl}, the STRATA product line and its products
        (currently Genie, and Erudite once it launches).
      </p>

      <h2>2. What data we process</h2>
      <ul>
        <li>
          <strong>Account data:</strong> your email address, your password (stored only in
          protected form by our authentication provider), your plan and trial status.
        </li>
        <li>
          <strong>Content you give us:</strong> photos and videos you upload, your instructions
          for how a post should look, and the results Genie creates from them (edited files,
          captions and tags).
        </li>
        <li>
          <strong>Connected social accounts:</strong> the username and ID of an account you
          connect (for example Instagram) and an access token, stored encrypted, so that we can
          publish what you approve or schedule.
        </li>
        <li>
          <strong>Posting records:</strong> what was scheduled or published, when, and whether it
          succeeded.
        </li>
        <li>
          <strong>Technical data:</strong> IP address, browser and device information and
          timestamps in server logs, used to run and protect the service.
        </li>
        <li>
          <strong>Messages:</strong> feedback or support requests you send us.
        </li>
        <li>
          <strong>Payment data (once payments are enabled):</strong> handled by our payment
          provider. We do not store card numbers. [DESCRIBE WHEN PAYMENTS ARE ADDED]
        </li>
      </ul>

      <h2>3. Why we process it, and on what legal basis</h2>
      <ul>
        <li>To provide the service you asked for, including your account (performance of a contract).</li>
        <li>To keep the service secure, prevent abuse and improve it (our legitimate interests).</li>
        <li>To meet legal obligations, such as tax or accounting rules where they apply.</li>
        <li>Where we ask for it, and only then, on the basis of your consent, which you can withdraw at any time.</li>
      </ul>
      <p>[A LAWYER SHOULD CONFIRM THE LEGAL BASIS FOR EACH PURPOSE]</p>

      <h2>4. Artificial intelligence</h2>
      <p>
        To create edits, captions and tags, Genie sends small preview images taken from your
        uploads, together with your instructions, to AI service providers. The suggestions can be
        wrong, so please review everything before it is published. We do not use your content to
        train our own models. [CONFIRM EACH AI PROVIDER&apos;S DATA-USE TERMS, INCLUDING FREE
        TIERS, BEFORE LAUNCH, AND LIST THEM]
      </p>

      <h2>5. Who receives your data</h2>
      <p>We use service providers who process data on our behalf:</p>
      <ul>
        <li>Hosting, file storage and AI processing: Cloudflare.</li>
        <li>Database and sign-in: Supabase.</li>
        <li>AI text and image analysis: Cloudflare Workers AI and Google (Gemini). [CONFIRM]</li>
        <li>Social networks you connect, such as Meta (Instagram), which receive what you choose to publish.</li>
        <li>Payments, once enabled: Stripe. [CONFIRM]</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2>6. Transfers outside the EU/EEA</h2>
      <p>
        Some providers may process data outside the EU/EEA. In that case we rely on appropriate
        safeguards such as standard contractual clauses. [DESCRIBE REGIONS AND SAFEGUARDS]
      </p>

      <h2>7. How long we keep data</h2>
      <ul>
        <li>Account data: while your account exists, then [PERIOD].</li>
        <li>Campaigns, uploaded files and results: until you delete the campaign or your account. Deleting a campaign removes its files from our storage.</li>
        <li>Server logs: [PERIOD].</li>
        <li>Backups: [PERIOD].</li>
      </ul>

      <h2>8. Your rights</h2>
      <p>
        You have the right to access your data, to have it corrected or deleted, to restrict or
        object to its processing, to receive it in a portable format, and to withdraw consent. You
        can also complain to your data protection supervisory authority. To use these rights,
        write to {LEGAL.privacyEmail}. See also our{" "}
        <a href="/data-deletion">data deletion instructions</a>.
      </p>

      <h2>9. Security</h2>
      <p>
        We protect data with encryption in transit, encrypted storage of social account tokens,
        access controls and separation between customers&apos; data. No system is perfectly secure.
        [LAWYER AND SECURITY REVIEW]
      </p>

      <h2>10. Age</h2>
      <p>
        Our services are not intended for people under {LEGAL.minAge}. [ADD HOW YOUTH PROGRAMMES
        OF WHITECLOAK LABS ARE HANDLED, IF RELEVANT]
      </p>

      <h2>11. Cookies</h2>
      <p>
        See our <a href="/cookies">cookie notice</a>.
      </p>

      <h2>12. Changes and contact</h2>
      <p>
        We may update this notice and will publish the new version here. Questions: {LEGAL.privacyEmail}.
      </p>
    </LegalPage>
  );
}