import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Cookie notice" };

export default function Cookies() {
  return (
    <LegalPage title="Cookie notice">
      <p>
        We currently use only cookies that are strictly necessary for the site to work. We do not
        use advertising or analytics cookies.
      </p>
      <h2>Cookies we use</h2>
      <ul>
        <li>
          <strong>Sign-in session cookies</strong> (names starting with &ldquo;sb-&rdquo;): keep you
          logged in. They last for the duration of your session or until you log out. [VERIFY NAMES
          AND DURATIONS BEFORE LAUNCH]
        </li>
        <li>
          <strong>ig_oauth_state:</strong> a security check that lasts about 10 minutes while you
          connect an Instagram account.
        </li>
      </ul>
      <h2>If this changes</h2>
      <p>
        If we add analytics or other non-essential cookies, we will ask for your consent first and
        update this notice. [LAWYER TO CONFIRM CONSENT REQUIREMENTS]
      </p>
    </LegalPage>
  );
}