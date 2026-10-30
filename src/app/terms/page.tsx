import LegalPage from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Terms of use" };

export default function Terms() {
  return (
    <LegalPage title="Terms of use">
      <h2>1. Who these terms are with</h2>
      <p>
        These terms are between you and {LEGAL.legalName} ({LEGAL.orgName}), {LEGAL.address}. They
        apply to our website and to the STRATA products, currently Genie.
      </p>

      <h2>2. The service</h2>
      <p>
        Genie helps you prepare photos and videos for social media: it edits them, suggests
        captions and tags, and, if you connect an account, can publish or schedule posts that you
        approve. Features may change, and some are still being tested.
      </p>

      <h2>3. Your account</h2>
      <p>
        You must be at least {LEGAL.minAge} and give accurate information. Keep your login private.
        You are responsible for everything done through your account. A free trial lasts 7 days and
        includes one post. [CONFIRM TRIAL TERMS]
      </p>

      <h2>4. Your content</h2>
      <p>
        You keep the rights to what you upload. You give us permission to store, process and
        transmit it only as needed to provide the service, including sending previews to AI
        providers and publishing to the accounts you connect. You confirm that you have the rights
        to everything you upload and publish, and that it does not infringe anyone&apos;s rights.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to use Genie to:</p>
      <ul>
        <li>upload or publish unlawful, hateful, harassing, deceptive or harmful content;</li>
        <li>upload content involving minors in a way that could cause them harm;</li>
        <li>impersonate others, or create misleading content about real people;</li>
        <li>break the rules of the social platforms you post to, or try to bypass our limits or security.</li>
      </ul>
      <p>We may remove content or suspend accounts that break these rules.</p>

      <h2>6. AI-generated suggestions</h2>
      <p>
        Captions, tags and edits are generated automatically and can be inaccurate or unsuitable.
        You are responsible for reviewing them before they are published, including any labelling
        of AI-assisted content required by the platforms or by law.
      </p>

      <h2>7. Connected social accounts</h2>
      <p>
        When you connect an account, you authorise us to publish on your behalf as you instruct.
        You can disconnect at any time. The terms of each platform also apply, and we are not
        responsible for their rules, changes or outages.
      </p>

      <h2>8. Plans and payment</h2>
      <p>
        Plans, limits and prices are shown on the pricing page. [PAYMENT, RENEWAL, CANCELLATION,
        REFUND AND TAX TERMS TO BE ADDED WHEN PAYMENTS LAUNCH]
      </p>

      <h2>9. Availability</h2>
      <p>
        We try to keep the service available but do not guarantee uninterrupted operation.
        Processing and scheduled posts may be delayed. [TO BE REVIEWED]
      </p>

      <h2>10. Liability</h2>
      <p>[LIMITATION OF LIABILITY, TO BE DRAFTED BY A LAWYER ACCORDING TO APPLICABLE LAW]</p>

      <h2>11. Ending the agreement</h2>
      <p>
        You can stop using the service and delete your data at any time (see our{" "}
        <a href="/data-deletion">data deletion instructions</a>). We may suspend or end access for
        serious or repeated breaches of these terms.
      </p>

      <h2>12. Changes, law and contact</h2>
      <p>
        We may update these terms and will publish the new version here. These terms are governed
        by {LEGAL.governingLaw}. Contact: {LEGAL.contactEmail}.
      </p>
    </LegalPage>
  );
}