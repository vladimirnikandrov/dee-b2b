import { LegalPage, H2, P, Ul } from "../legal-layout";

export const metadata = { title: "Privacy Policy — Dee April Parfums B2B" };

export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy" updated="13 July 2026">
      <P>
        This policy covers the Dee April Parfums B2B wholesale portal (order.deeapril.com, order.maison-dee.com) and its
        integration with e-conomic ("Dee B2B" app), operated by PROJECT 1804 on behalf of DA Design ApS
        (Dee April Parfums), Piniehøj 17, 2960 Rungsted Kyst, Denmark.
      </P>

      <H2>What data we collect</H2>
      <P>When you create a wholesale account or place an order, we collect:</P>
      <Ul>
        <li>Company name, contact name, billing/shipping address, VAT number</li>
        <li>Email address (used for login codes and order/invoice notifications)</li>
        <li>Order history — products, quantities, prices, and invoice status</li>
      </Ul>

      <H2>Why we process it</H2>
      <P>
        This data is used solely to operate the wholesale ordering portal: authenticating your account, fulfilling and
        invoicing orders, and — where you have an active order — creating a matching customer record and invoice
        drafts in e-conomic, our accounting system.
      </P>

      <H2>Who we share it with</H2>
      <P>
        We share order and customer data with e-conomic (operated by Visma A/S) solely to generate invoice drafts for
        DA Design ApS's own bookkeeping. We do not sell your data, and we do not share it with any other third party
        beyond the service providers strictly necessary to run this portal (hosting on Railway, transactional email via
        Resend).
      </P>

      <H2>How long we keep it</H2>
      <P>
        Order and invoicing data is retained for as long as required by Danish bookkeeping law (currently five years
        from the end of the relevant financial year). Account data is retained for as long as your account is active.
      </P>

      <H2>Security</H2>
      <P>
        All traffic to the portal is encrypted (HTTPS/TLS). Login uses one-time emailed codes rather than passwords.
        Access to the underlying database and e-conomic credentials is restricted to authorized personnel only.
      </P>

      <H2>Your rights</H2>
      <P>
        Under GDPR, you can request access to, correction of, or deletion of your personal data, subject to our
        bookkeeping retention obligations above. Contact us using the details below to exercise these rights.
      </P>

      <H2>Contact</H2>
      <P>hello@project-1804.com</P>
    </LegalPage>
  );
}
