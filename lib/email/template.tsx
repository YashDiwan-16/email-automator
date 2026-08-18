import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";

import type { EmailPersonalization } from "./schema";

const BRAND = {
  ink: "#10243E",
  inkSoft: "#1A3555",
  orange: "#F47A3C",
  orangeSoft: "#FFF1E8",
  teal: "#25A99A",
  tealSoft: "#EAF8F5",
  paper: "#F4F1EA",
  white: "#FFFFFF",
  text: "#223044",
  muted: "#637083",
  line: "#DFE5EA",
} as const;

const CHALLENGE_AREAS = [
  {
    title: "Core Science",
    accent: BRAND.orange,
    background: BRAND.orangeSoft,
    details: [
      { label: "Mathematics stream:", value: "PCM + Applied Mathematics" },
      { label: "Biology stream:", value: "PCB + Biotechnology" },
    ],
  },
  {
    title: "Core Skills",
    accent: BRAND.teal,
    background: BRAND.tealSoft,
    details: [
      {
        value:
          "Verbal Ability • Quantitative Ability • Analytical Ability • General Knowledge • Entrepreneurship • Financial Literacy",
      },
    ],
  },
] as const;

const LEVELS = [
  {
    level: "1–2",
    format:
      "10 questions • 10 minutes. 1 question from each of 10 disciplines; up to 10 attempts.",
    access: "FREE • Digital / open",
  },
  {
    level: "3",
    format:
      "30 questions • 30 minutes. 3 questions from each discipline; up to 5 attempts to qualify.",
    access: "FREE • Digital / open",
  },
  {
    level: "4–6",
    format:
      "Approx. 30–60 questions • 30–90 minutes. Online tests conducted at the participating institution.",
    access:
      "₹999 for Levels 4–6. Strict physical proctoring • attendance verified • no AI, mobiles, reference material or external aid.",
  },
  {
    level: "7–10",
    format:
      "Advanced Super League pathway • 90–180 minute assessments at designated centres.",
    access:
      "Proctored national pathway • higher-level participation may be supported by colleges / sponsors / donors.",
  },
] as const;

const BENEFITS = [
  {
    title: "For Students",
    accent: BRAND.teal,
    items: [
      "Discover strengths beyond exam marks",
      "Build confidence and competitive temperament",
      "Strengthen analytical and multidisciplinary thinking",
      "Earn rankings, badges, certificates and recognition",
      "Receive EduBite access FREE for bite-sized daily learning and consistency",
    ],
  },
  {
    title: "For Colleges / Schools",
    accent: BRAND.orange,
    items: [
      "Identify hidden, high-potential talent",
      "Create healthy internal competition",
      "Improve student engagement without adding a new curriculum",
      "Gain national academic visibility",
      "Showcase student achievement and institutional excellence",
    ],
  },
] as const;

const KEY_DATES = [
  { label: "Interest Reply", value: "28 Aug 2026", color: BRAND.orangeSoft },
  { label: "Detailed Pack", value: "By end-August", color: BRAND.tealSoft },
  { label: "Final Confirmation", value: "15 Sep 2026", color: "#EEF3F9" },
] as const;

const EMAIL_SIGNATURE = {
  closing: "Warm Regards",
  name: "Mr. Sankar",
  organization: "EduDeca – Whiz360",
  email: "alexis36sg@gmail.com",
} as const;

/** Update the version whenever the approved subject or body changes. */
export const PREDEFINED_EMAIL_TEMPLATE = {
  version: "2026-08-18.7",
  subject: "EduDeca – Invitation to Participate",
  preview:
    "Invitation for Class XI & XII students: EduDeca – India's Whiz360 Knowledge Challenge.",
} as const;

export interface PredefinedEmailTemplateInput {
  contactEmail: string;
  personalization: EmailPersonalization;
}

function formatDetails(
  details: ReadonlyArray<{ readonly label?: string; readonly value: string }>,
): string[] {
  return details.map((detail) =>
    detail.label ? `${detail.label} ${detail.value}` : detail.value,
  );
}

export function createPredefinedEmailContent(
  personalization: EmailPersonalization,
) {
  const signature = EMAIL_SIGNATURE;
  const text = [
    "Dear Principal / Head of Institution,",
    "",
    `We invite ${personalization.university} to express interest in participating in EduDeca – Whiz360, a 360° Knowledge Challenge for Class XI and XII students across India.`,
    "",
    "The objective is to create a prestigious, scalable platform that rewards academic depth while also testing aptitude, analytical ability, entrepreneurship, financial literacy, general knowledge and consistency. It encourages students to look beyond bookish knowledge and rote learning.",
    "",
    "INDIA HAS TALENT HUNTS FOR MUSIC AND DANCE.",
    "Where is the national stage for India's Whizkids?",
    "EduDeca is an All-India academic decathlon designed to discover students who can think, reason, solve, connect ideas and lead — not merely reproduce what they have memorised.",
    "",
    "What does Whiz360 test?",
    ...CHALLENGE_AREAS.flatMap((area) => [
      area.title,
      ...formatDetails(area.details),
      "",
    ]),
    "The 10-level journey",
    "Low-friction entry → progressive challenge → proctored merit → national recognition.",
    ...LEVELS.flatMap((level) => [
      `Levels ${level.level}`,
      level.format,
      level.access,
      "",
    ]),
    "Why should your institution participate?",
    ...BENEFITS.flatMap((benefit) => [
      benefit.title,
      ...benefit.items.map((item) => `• ${item}`),
      "",
    ]),
    "National Recognition",
    "Prizes, rankings and recognition that make achievement visible",
    "Current structure includes a ₹10 lakh first prize for the winning college, along with national rankings, badges, certificates and trophies. Runner-up prize / recognition structures including ₹5 lakh and ₹3 lakh are subject to final competition rules and sponsorship availability.",
    "",
    "Key dates",
    ...KEY_DATES.map((date) => `${date.label}: ${date.value}`),
    "",
    "A simple first step",
    "If your institution would like to explore participation, simply reply to this email with “Interested in EduDeca” on or before 28 August 2026.",
    "We will let you know by end-August with further details once the college indicates interest by replying back via reply email on or before Aug 28, 2026.",
    "",
    "We look forward to giving your students a national platform to demonstrate not only what they know, but how well they can think, apply and grow.",
    "",
    signature.closing,
    signature.name,
    signature.organization,
    signature.email,
  ].join("\n");

  return {
    ...PREDEFINED_EMAIL_TEMPLATE,
    university: personalization.university,
    challengeAreas: CHALLENGE_AREAS,
    levels: LEVELS,
    benefits: BENEFITS,
    keyDates: KEY_DATES,
    signature,
    text,
  };
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Heading as="h2" style={styles.sectionHeading}>
        {title}
      </Heading>
    </>
  );
}

export function PredefinedEmailTemplate({
  contactEmail,
  personalization,
}: PredefinedEmailTemplateInput) {
  const content = createPredefinedEmailContent(personalization);
  const replyHref = `mailto:${contactEmail}?subject=EduDeca%20-%20Interest%20to%20Participate`;

  return (
    <Html lang="en" dir="ltr">
      <Head>
        <style>{`
          @media only screen and (max-width: 620px) {
            .email-shell { width: 100% !important; }
            .email-pad { padding-left: 22px !important; padding-right: 22px !important; }
            .email-column { display: block !important; width: 100% !important; }
            .email-spacer { display: none !important; }
            .email-hero { font-size: 34px !important; line-height: 39px !important; }
          }
        `}</style>
      </Head>
      <Preview>{content.preview}</Preview>
      <Body style={styles.body}>
        <Container className="email-shell" style={styles.container}>
          <Section style={styles.brandBar}>
            <Row>
              <Column>
                <Text style={styles.wordmark}>
                  Edu<span style={styles.wordmarkAccent}>Deca</span>
                </Text>
                <Text style={styles.tagline}>
                  INDIA&apos;S WHIZ360 KNOWLEDGE CHALLENGE
                </Text>
              </Column>
              <Column align="right" style={styles.audienceColumn}>
                <Text style={styles.audiencePill}>CLASS XI &amp; XII</Text>
              </Column>
            </Row>
          </Section>

          <Section className="email-pad" style={styles.hero}>
            <Text style={styles.heroEyebrow}>
              INDIA HAS TALENT HUNTS FOR MUSIC AND DANCE.
            </Text>
            <Heading className="email-hero" as="h1" style={styles.heroHeading}>
              Where is the national stage for India&apos;s{" "}
              <span style={styles.heroAccent}>Whizkids?</span>
            </Heading>
            <Text style={styles.heroText}>
              EduDeca is an All-India academic decathlon designed to discover
              students who can{" "}
              <strong style={styles.whiteText}>
                think, reason, solve, connect ideas and lead
              </strong>{" "}
              — not merely reproduce what they have memorised.
            </Text>
          </Section>

          <Section className="email-pad" style={styles.introduction}>
            <Text style={styles.salutation}>
              Dear Principal / Head of Institution,
            </Text>
            <Text style={styles.paragraph}>
              We invite <strong>{content.university}</strong> to express interest
              in participating in <strong>EduDeca – Whiz360</strong>, a 360°
              Knowledge Challenge for Class XI and XII students across India.
            </Text>
            <Text style={styles.paragraphLast}>
              The objective is to create a prestigious, scalable platform that
              rewards academic depth while also testing aptitude, analytical
              ability, entrepreneurship, financial literacy, general knowledge
              and consistency. It encourages students to look{" "}
              <strong>beyond bookish knowledge and rote learning</strong>.
            </Text>
          </Section>

          <Section className="email-pad" style={styles.contentSection}>
            <SectionHeading eyebrow="01 · THE CHALLENGE" title="What does Whiz360 test?" />
            <Row>
              {content.challengeAreas.map((area, index) => (
                <Column
                  key={area.title}
                  className="email-column"
                  style={{
                    ...styles.featureCard,
                    backgroundColor: area.background,
                    borderTopColor: area.accent,
                    width: index === 0 ? "49%" : "49%",
                  }}
                  valign="top"
                >
                  <Text style={{ ...styles.cardTitle, color: area.accent }}>
                    {area.title}
                  </Text>
                  {area.details.map((detail) => (
                    <Text key={detail.value} style={styles.cardText}>
                      {"label" in detail ? <strong>{detail.label} </strong> : null}
                      {detail.value}
                    </Text>
                  ))}
                </Column>
              ))}
            </Row>
          </Section>

          <Section className="email-pad" style={styles.contentSection}>
            <SectionHeading eyebrow="02 · THE PATH" title="The 10-level journey" />
            <Text style={styles.sectionIntro}>
              Low-friction entry → progressive challenge → proctored merit →
              national recognition.
            </Text>
            <Section style={styles.journeyFrame}>
              {content.levels.map((level, index) => (
                <Row
                  key={level.level}
                  style={index === content.levels.length - 1 ? undefined : styles.journeyRow}
                >
                  <Column style={styles.levelColumn} valign="top">
                    <Text style={styles.levelNumber}>{level.level}</Text>
                    <Text style={styles.levelLabel}>LEVELS</Text>
                  </Column>
                  <Column style={styles.levelDetails} valign="top">
                    <Text style={styles.levelFormat}>{level.format}</Text>
                    <Text style={styles.levelAccess}>{level.access}</Text>
                  </Column>
                </Row>
              ))}
            </Section>
          </Section>

          <Section className="email-pad" style={styles.contentSection}>
            <SectionHeading
              eyebrow="03 · THE VALUE"
              title="Why should your institution participate?"
            />
            <Row>
              {content.benefits.map((benefit) => (
                <Column
                  key={benefit.title}
                  className="email-column"
                  style={{
                    ...styles.benefitCard,
                    borderTopColor: benefit.accent,
                  }}
                  valign="top"
                >
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  {benefit.items.map((item) => (
                    <Text key={item} style={styles.benefitItem}>
                      <span style={{ color: benefit.accent }}>●</span> {item}
                    </Text>
                  ))}
                </Column>
              ))}
            </Row>
          </Section>

          <Section className="email-pad" style={styles.contentSection}>
            <Section style={styles.recognition}>
              <Text style={styles.recognitionEyebrow}>NATIONAL RECOGNITION</Text>
              <Heading as="h2" style={styles.recognitionHeading}>
                Prizes, rankings and recognition that make achievement visible
              </Heading>
              <Text style={styles.recognitionText}>
                Current structure includes a{" "}
                <strong style={styles.whiteText}>
                  ₹10 lakh first prize for the winning college
                </strong>
                , along with national rankings, badges, certificates and
                trophies. Runner-up prize / recognition structures including ₹5
                lakh and ₹3 lakh are subject to final competition rules and
                sponsorship availability.
              </Text>
            </Section>
          </Section>

          <Section className="email-pad" style={styles.contentSection}>
            <SectionHeading eyebrow="04 · THE TIMELINE" title="Key dates" />
            <Row>
              {content.keyDates.map((date) => (
                <Column
                  key={date.label}
                  className="email-column"
                  style={{ ...styles.dateCard, backgroundColor: date.color }}
                  valign="top"
                >
                  <Text style={styles.dateLabel}>{date.label}</Text>
                  <Text style={styles.dateValue}>{date.value}</Text>
                </Column>
              ))}
            </Row>
          </Section>

          <Section className="email-pad" style={styles.ctaWrapper}>
            <Section style={styles.ctaSection}>
              <Text style={styles.ctaEyebrow}>05 · NEXT STEP</Text>
              <Heading as="h2" style={styles.ctaHeading}>
                A simple first step
              </Heading>
              <Text style={styles.ctaText}>
                If your institution would like to explore participation, simply{" "}
                <strong>
                  reply to this email with “Interested in EduDeca” on or before
                  28 August 2026
                </strong>
                .
              </Text>
              <Button href={replyHref} style={styles.ctaButton}>
                Reply: We are interested
              </Button>
              <Text style={styles.ctaNote}>
                <strong>
                  We will let you know by end-August with further details once
                  the college indicates interest by replying back via reply
                  email on or before Aug 28, 2026.
                </strong>
              </Text>
            </Section>
          </Section>

          <Section className="email-pad" style={styles.closingSection}>
            <Text style={styles.closingText}>
              We look forward to giving your students a national platform to
              demonstrate not only what they know, but how well they can{" "}
              <strong>think, apply and grow</strong>.
            </Text>
            <Hr style={styles.signatureDivider} />
            <Section style={styles.signatureCard}>
              <Text style={styles.signatureClosing}>
                {content.signature.closing}
              </Text>
              <Text style={styles.signatureName}>{content.signature.name}</Text>
              <Text style={styles.signatureOrganization}>
                {content.signature.organization}
              </Text>
              <Text style={styles.signatureContact}>
                {content.signature.email}
              </Text>
            </Section>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerBrand}>
              Edu<span style={styles.wordmarkAccent}>Deca</span>{" "}
              <span style={styles.footerDivider}>/</span> Whiz360
            </Text>
            <Text style={styles.footerText}>
              Discovering India&apos;s next generation of all-round thinkers.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: BRAND.paper,
    color: BRAND.text,
    fontFamily: "Arial, Helvetica, sans-serif",
    margin: "0",
    padding: "28px 10px",
  },
  container: {
    backgroundColor: BRAND.white,
    border: `1px solid ${BRAND.line}`,
    borderRadius: "18px",
    margin: "0 auto",
    maxWidth: "680px",
    overflow: "hidden",
  },
  brandBar: {
    backgroundColor: BRAND.ink,
    padding: "24px 38px 18px",
  },
  wordmark: {
    color: BRAND.white,
    fontSize: "30px",
    fontWeight: "800",
    letterSpacing: "-1.2px",
    lineHeight: "32px",
    margin: "0",
  },
  wordmarkAccent: { color: BRAND.orange },
  tagline: {
    color: "#BDCAD8",
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "1.6px",
    lineHeight: "16px",
    margin: "4px 0 0",
  },
  audienceColumn: { width: "125px" },
  audiencePill: {
    backgroundColor: BRAND.inkSoft,
    border: "1px solid #315171",
    borderRadius: "999px",
    color: BRAND.white,
    display: "inline-block",
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "0.8px",
    margin: "0",
    padding: "8px 12px",
  },
  hero: {
    backgroundColor: BRAND.ink,
    padding: "26px 38px 40px",
  },
  heroEyebrow: {
    color: BRAND.orange,
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "1.25px",
    lineHeight: "18px",
    margin: "0 0 12px",
  },
  heroHeading: {
    color: BRAND.white,
    fontSize: "43px",
    fontWeight: "700",
    letterSpacing: "-1.8px",
    lineHeight: "47px",
    margin: "0 0 18px",
    maxWidth: "560px",
  },
  heroAccent: { color: BRAND.orange },
  heroText: {
    color: "#CFDAE6",
    fontSize: "16px",
    lineHeight: "26px",
    margin: "0",
    maxWidth: "575px",
  },
  whiteText: { color: BRAND.white },
  introduction: { padding: "36px 38px 6px" },
  salutation: {
    color: BRAND.ink,
    fontSize: "16px",
    fontWeight: "700",
    lineHeight: "25px",
    margin: "0 0 14px",
  },
  paragraph: {
    color: BRAND.text,
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 15px",
  },
  paragraphLast: {
    color: BRAND.text,
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0",
  },
  contentSection: { padding: "34px 38px 0" },
  sectionEyebrow: {
    color: BRAND.orange,
    fontSize: "10px",
    fontWeight: "800",
    letterSpacing: "1.5px",
    lineHeight: "16px",
    margin: "0 0 7px",
  },
  sectionHeading: {
    color: BRAND.ink,
    fontSize: "25px",
    fontWeight: "700",
    letterSpacing: "-0.5px",
    lineHeight: "31px",
    margin: "0 0 16px",
  },
  sectionIntro: {
    color: BRAND.muted,
    fontSize: "14px",
    lineHeight: "22px",
    margin: "-7px 0 17px",
  },
  featureCard: {
    borderRadius: "10px",
    borderTop: "4px solid",
    padding: "18px",
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: "700",
    lineHeight: "22px",
    margin: "0 0 9px",
  },
  cardText: {
    color: BRAND.text,
    fontSize: "13px",
    lineHeight: "20px",
    margin: "5px 0 0",
  },
  journeyFrame: {
    border: `1px solid ${BRAND.line}`,
    borderRadius: "12px",
    padding: "0 18px",
  },
  journeyRow: { borderBottom: `1px solid ${BRAND.line}` },
  levelColumn: { padding: "17px 14px 17px 0", width: "74px" },
  levelNumber: {
    color: BRAND.orange,
    fontSize: "20px",
    fontWeight: "800",
    lineHeight: "22px",
    margin: "0",
  },
  levelLabel: {
    color: BRAND.muted,
    fontSize: "9px",
    fontWeight: "700",
    letterSpacing: "1px",
    lineHeight: "13px",
    margin: "3px 0 0",
  },
  levelDetails: { padding: "16px 0" },
  levelFormat: {
    color: BRAND.ink,
    fontSize: "13px",
    fontWeight: "600",
    lineHeight: "20px",
    margin: "0 0 4px",
  },
  levelAccess: {
    color: BRAND.muted,
    fontSize: "12px",
    lineHeight: "19px",
    margin: "0",
  },
  benefitCard: {
    border: `1px solid ${BRAND.line}`,
    borderRadius: "10px",
    borderTop: "4px solid",
    padding: "18px",
    width: "49%",
  },
  benefitTitle: {
    color: BRAND.ink,
    fontSize: "16px",
    fontWeight: "700",
    lineHeight: "22px",
    margin: "0 0 10px",
  },
  benefitItem: {
    color: BRAND.text,
    fontSize: "12px",
    lineHeight: "19px",
    margin: "5px 0",
  },
  recognition: {
    backgroundColor: BRAND.ink,
    borderRadius: "14px",
    padding: "27px",
  },
  recognitionEyebrow: {
    color: BRAND.orange,
    fontSize: "10px",
    fontWeight: "800",
    letterSpacing: "1.4px",
    lineHeight: "16px",
    margin: "0 0 7px",
  },
  recognitionHeading: {
    color: BRAND.white,
    fontSize: "24px",
    fontWeight: "700",
    letterSpacing: "-0.5px",
    lineHeight: "31px",
    margin: "0 0 11px",
  },
  recognitionText: {
    color: "#CFDAE6",
    fontSize: "13px",
    lineHeight: "21px",
    margin: "0",
  },
  dateCard: {
    borderRadius: "9px",
    padding: "16px 12px",
    width: "32%",
  },
  dateLabel: {
    color: BRAND.muted,
    fontSize: "9px",
    fontWeight: "800",
    letterSpacing: "0.8px",
    lineHeight: "14px",
    margin: "0 0 5px",
    textTransform: "uppercase" as const,
  },
  dateValue: {
    color: BRAND.ink,
    fontSize: "17px",
    fontWeight: "700",
    lineHeight: "22px",
    margin: "0",
  },
  ctaWrapper: { padding: "36px 38px 0" },
  ctaSection: {
    backgroundColor: "#F8F4EE",
    borderLeft: `5px solid ${BRAND.orange}`,
    padding: "26px 27px",
  },
  ctaEyebrow: {
    color: BRAND.orange,
    fontSize: "10px",
    fontWeight: "800",
    letterSpacing: "1.4px",
    lineHeight: "16px",
    margin: "0 0 7px",
  },
  ctaHeading: {
    color: BRAND.ink,
    fontSize: "23px",
    fontWeight: "700",
    letterSpacing: "-0.4px",
    lineHeight: "29px",
    margin: "0 0 10px",
  },
  ctaText: {
    color: BRAND.text,
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0 0 18px",
  },
  ctaButton: {
    backgroundColor: BRAND.orange,
    borderRadius: "7px",
    color: BRAND.ink,
    fontSize: "13px",
    fontWeight: "800",
    padding: "13px 20px",
    textDecoration: "none",
  },
  ctaNote: {
    color: BRAND.muted,
    fontSize: "12px",
    lineHeight: "19px",
    margin: "18px 0 0",
  },
  closingSection: { padding: "34px 38px 32px" },
  closingText: {
    color: BRAND.text,
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0",
  },
  signatureDivider: {
    borderColor: BRAND.line,
    margin: "25px 0 21px",
  },
  signatureCard: {
    backgroundColor: "#F8FAFC",
    border: `1px solid ${BRAND.line}`,
    borderLeft: `4px solid ${BRAND.orange}`,
    borderRadius: "12px",
    padding: "20px",
  },
  signatureClosing: {
    color: BRAND.muted,
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "1px",
    lineHeight: "15px",
    margin: "0 0 4px",
    textTransform: "uppercase" as const,
  },
  signatureName: {
    color: BRAND.ink,
    fontSize: "20px",
    fontWeight: "800",
    lineHeight: "25px",
    margin: "0",
  },
  signatureOrganization: {
    color: BRAND.orange,
    fontSize: "13px",
    fontWeight: "700",
    lineHeight: "19px",
    margin: "1px 0 0",
  },
  signatureContact: {
    color: BRAND.muted,
    fontSize: "11px",
    lineHeight: "17px",
    margin: "1px 0 0",
  },
  footer: {
    backgroundColor: BRAND.ink,
    padding: "20px 38px",
    textAlign: "center" as const,
  },
  footerBrand: {
    color: BRAND.white,
    fontSize: "16px",
    fontWeight: "800",
    lineHeight: "21px",
    margin: "0",
  },
  footerDivider: { color: "#708297" },
  footerText: {
    color: "#BDCAD8",
    fontSize: "10px",
    lineHeight: "16px",
    margin: "4px 0 0",
  },
};
