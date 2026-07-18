import { LegalPage, H2, P, Ul } from "../legal-layout";

export const metadata = { title: "Data Processing Agreement — Dee April Parfums B2B" };

export default function Dpa() {
  return (
    <LegalPage title="Data Processing Agreement" updated="13 July 2026">
      <P>
        This Data Processing Agreement ("DPA") forms part of the arrangement between DA Design ApS
        (Dee April Parfums), Piniehøj 17, 2960 Rungsted Kyst, Denmark ("Controller") and PROJECT 1804
        ("Processor"), covering personal data processed through the Dee April Parfums B2B wholesale portal and its
        "Dee B2B" e-conomic integration.
      </P>

      <H2>1. Subject matter and duration</H2>
      <P>
        The Processor operates the wholesale ordering portal and its integration with e-conomic on the Controller's
        behalf, for as long as the portal remains in active use.
      </P>

      <H2>2. Nature and purpose of processing</H2>
      <P>
        Hosting, storing, and syncing wholesale order and customer data so that orders can be placed, invoiced, and
        recorded in the Controller's e-conomic bookkeeping.
      </P>

      <H2>3. Categories of data subjects and personal data</H2>
      <Ul>
        <li>Data subjects: the Controller's wholesale buyers and their staff contacts</li>
        <li>Data: name, company, business address, VAT number, email address, order and invoice history</li>
      </Ul>
      <P>No special categories of personal data (per GDPR Art. 9) are processed.</P>

      <H2>4. Processor obligations</H2>
      <Ul>
        <li>Process personal data only on the Controller's documented instructions, as described in this DPA</li>
        <li>Ensure personnel with access are bound by confidentiality</li>
        <li>Implement appropriate technical and organizational security measures (encryption in transit, passwordless
          authentication, restricted credential access)</li>
        <li>Assist the Controller in responding to data subject access, correction, and deletion requests</li>
        <li>Notify the Controller without undue delay upon becoming aware of a personal data breach</li>
        <li>Delete or return personal data at the end of the engagement, except where retention is required by law
          (e.g., Danish bookkeeping retention rules)</li>
      </Ul>

      <H2>5. Sub-processors</H2>
      <P>The Processor uses the following sub-processors to operate the portal:</P>
      <Ul>
        <li>Visma A/S (e-conomic) — bookkeeping and invoicing</li>
        <li>Railway — application hosting and database</li>
        <li>Resend — transactional email delivery</li>
      </Ul>
      <P>The Processor will notify the Controller of any intended changes to this sub-processor list.</P>

      <H2>6. International transfers</H2>
      <P>
        All sub-processors listed above host data within the EU. Should this change, the Processor will ensure an
        appropriate GDPR transfer mechanism (such as Standard Contractual Clauses) is in place.
      </P>

      <H2>7. Audit</H2>
      <P>
        The Controller may request reasonable information from the Processor to verify compliance with this DPA.
      </P>

      <H2>Contact</H2>
      <P>hello@project-1804.com</P>
    </LegalPage>
  );
}
