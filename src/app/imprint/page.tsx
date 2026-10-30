import LegalPage from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Imprint" };

export default function Imprint() {
  return (
    <LegalPage title="Imprint / legal notice">
      <p>
        [A LAWYER SHOULD CONFIRM WHETHER AN IMPRINT IS REQUIRED FOR YOUR ORGANISATION AND WHICH
        DETAILS IT MUST CONTAIN. In Germany, websites of this kind usually need one.]
      </p>
      <h2>Provider</h2>
      <p>
        {LEGAL.legalName}
        <br />
        {LEGAL.legalForm}
        <br />
        {LEGAL.address}
      </p>
      <h2>Represented by</h2>
      <p>{LEGAL.representatives}</p>
      <h2>Contact</h2>
      <p>
        Email: {LEGAL.contactEmail}
        <br />
        Phone: {LEGAL.phone}
      </p>
      <h2>Register and tax</h2>
      <p>
        Registration: {LEGAL.registration}
        <br />
        VAT ID: {LEGAL.vatId}
      </p>
      <h2>Responsible for content</h2>
      <p>{LEGAL.contentResponsible}</p>
    </LegalPage>
  );
}