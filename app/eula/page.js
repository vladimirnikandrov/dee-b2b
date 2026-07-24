import { LegalPage, H2, P, Ul } from "../legal-layout";

export const metadata = { title: "Terms of Use — DEE B2B" };

export default function Eula() {
  return (
    <LegalPage title="Terms of Use (EULA)" updated="13 July 2026">
      <P>
        The "Dee B2B" application and the DEE wholesale portal (order.deeapril.com,
        order.maison-dee.com) are built and operated by PROJECT 1804 for the sole use of DA Design ApS
        (DEE) and its wholesale customers. This is a private, internal integration — it is not licensed
        or made available to any other company.
      </P>

      <H2>Permitted use</H2>
      <P>
        Access is limited to DA Design ApS staff and its approved wholesale buyers. Accounts are not transferable and
        must not be shared outside your organization.
      </P>

      <H2>No warranty</H2>
      <P>
        The portal and its e-conomic integration are provided "as is." While we take reasonable care to keep order and
        invoice data accurate, PROJECT 1804 makes no warranty that the service will be uninterrupted or error-free.
      </P>

      <H2>Limitation of liability</H2>
      <P>
        To the extent permitted by Danish law, PROJECT 1804's liability for any claim arising from use of this portal
        is limited to direct damages and excludes indirect or consequential loss.
      </P>

      <H2>Changes and termination</H2>
      <Ul>
        <li>We may update these terms from time to time; continued use after a change constitutes acceptance.</li>
        <li>Access may be suspended or terminated for accounts used in violation of these terms.</li>
      </Ul>

      <H2>Governing law</H2>
      <P>These terms are governed by the laws of Denmark.</P>

      <H2>Contact</H2>
      <P>hello@project-1804.com</P>
    </LegalPage>
  );
}
