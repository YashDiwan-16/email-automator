import { Fragment } from "react";

import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";

import type { EmailPersonalization } from "./schema";

const BRAND = {
  ink: "#01262E",
  inkSoft: "#173552",
  blue: "#378ADD",
  blueDark: "#1B4D89",
  blueSoft: "#EEF4FA",
  goldSoft: "#FFF5E7",
  teal: "#2EC4B6",
  tealSoft: "#EDF9F7",
  paper: "#EEF3F8",
  white: "#FFFFFF",
  text: "#16202D",
  muted: "#607080",
  line: "#DDE7F0",
} as const;

const CHALLENGE_AREAS = [
  {
    title: "Core Science",
    accent: BRAND.blueDark,
    background: "#F7FAFC",
    details: [
      { label: "Mathematics stream:", value: "PCM + Applied Mathematics" },
      { label: "Biology stream:", value: "PCB + Biotechnology" },
    ],
  },
  {
    title: "Core Skills",
    accent: BRAND.blueDark,
    background: "#F7FAFC",
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
    format: "10 questions • 10 minutes",
    formatNote: "1 question from each of 10 disciplines; up to 10 attempts.",
    access: "FREE • Digital / open",
    accessNote: null,
  },
  {
    level: "3",
    format: "30 questions • 30 minutes",
    formatNote: "3 questions from each discipline; up to 5 attempts to qualify.",
    access: "FREE • Digital / open",
    accessNote: null,
  },
  {
    level: "4–6",
    format: "Approx. 30–60 questions • 30–90 minutes",
    formatNote: "Online tests conducted at the participating institution.",
    access: "₹999 for Levels 4–6",
    accessNote:
      "Strict physical proctoring • attendance verified • no AI, mobiles, reference material or external aid.",
  },
  {
    level: "7–10",
    format:
      "Advanced Super League pathway • 90–180 minute assessments at designated centres",
    formatNote: null,
    access:
      "Proctored national pathway • higher-level participation may be supported by colleges / sponsors / donors",
    accessNote: null,
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
    accent: BRAND.blue,
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
  { label: "Interest Reply", value: "28 Aug 2026", color: BRAND.goldSoft },
  { label: "Detailed Pack", value: "By end-August", color: BRAND.tealSoft },
  { label: "Final Confirmation", value: "15 Sep 2026", color: BRAND.blueSoft },
] as const;

const EMAIL_SIGNATURE = {
  closing: "Warm Regards",
  name: "Sankar Lakshmanan",
  organization: "EduDeca – Whiz360",
  designation: "Founder",
  email: "alexis36sg@gmail.com",
} as const;

/** Update the version whenever the approved subject or body changes. */
export const PREDEFINED_EMAIL_TEMPLATE = {
  version: "2026-08-19.1",
  subject: "EduDeca – Invitation to Participate",
  preview:
    "Invitation for Class XI & XII Science students: EduDeca – India's Whiz360 Knowledge Challenge.",
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
    `We invite ${personalization.university} to express interest in participating in EduDeca – Whiz360, a 360° Knowledge Challenge for Class XI and XII Science students across India.`,
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
      ...(level.formatNote ? [level.formatNote] : []),
      level.access,
      ...(level.accessNote ? [level.accessNote] : []),
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
    `${signature.designation} | ${signature.email}`,
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

function SectionHeading({ title }: { title: string }) {
  return (
    <Heading as="h2" style={styles.sectionHeading}>
      {title}
    </Heading>
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
                <Img
                  alt="EduDeca"
                  height="70"
                  src="cid:edudeca-logo"
                  style={styles.headerLogo}
                  width="200"
                />
                <Text style={styles.tagline}>
                  INDIA&apos;S WHIZ360 KNOWLEDGE CHALLENGE
                </Text>
              </Column>
              <Column align="right" style={styles.audienceColumn}>
                <Text style={styles.audiencePill}>CLASS XI &amp; XII SCIENCE</Text>
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
              Knowledge Challenge for Class XI and XII Science students across
              India.
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
            <SectionHeading title="What does Whiz360 test?" />
            <Row>
              {content.challengeAreas.map((area, index) => (
                <Fragment key={area.title}>
                  {index > 0 ? (
                    <Column className="email-spacer" style={styles.columnSpacer} />
                  ) : null}
                  <Column
                    className="email-column"
                    style={{
                      ...styles.featureCard,
                      backgroundColor: area.background,
                      width: "49%",
                    }}
                    valign="top"
                  >
                    <Text style={{ ...styles.cardTitle, color: area.accent }}>
                      {area.title}
                    </Text>
                    {area.details.map((detail) => (
                      <Text key={detail.value} style={styles.cardText}>
                        {"label" in detail ? (
                          <strong>{detail.label} </strong>
                        ) : null}
                        {detail.value}
                      </Text>
                    ))}
                  </Column>
                </Fragment>
              ))}
            </Row>
          </Section>

          <Section className="email-pad" style={styles.contentSection}>
            <SectionHeading title="The 10-level journey" />
            <Text style={styles.sectionIntro}>
              Low-friction entry → progressive challenge → proctored merit →
              national recognition.
            </Text>
            <Section style={styles.journeyFrame}>
              <Row style={styles.journeyHeader}>
                <Column style={styles.journeyHeaderLevel}>LEVELS</Column>
                <Column style={styles.journeyHeaderFormat}>FORMAT</Column>
                <Column style={styles.journeyHeaderAccess}>
                  ACCESS / INTEGRITY
                </Column>
              </Row>
              {content.levels.map((level, index) => (
                <Row
                  key={level.level}
                  style={{
                    ...styles.journeyRow,
                    ...(index % 2 === 1 ? styles.journeyRowAlternate : {}),
                  }}
                >
                  <Column style={styles.levelColumn} valign="top">
                    <Text style={styles.levelNumber}>{level.level}</Text>
                  </Column>
                  <Column style={styles.levelFormatColumn} valign="top">
                    <Text style={styles.levelFormat}>{level.format}</Text>
                    {level.formatNote ? (
                      <Text style={styles.levelNote}>{level.formatNote}</Text>
                    ) : null}
                  </Column>
                  <Column style={styles.levelAccessColumn} valign="top">
                    <Text style={styles.levelAccess}>{level.access}</Text>
                    {level.accessNote ? (
                      <Text style={styles.levelNote}>{level.accessNote}</Text>
                    ) : null}
                  </Column>
                </Row>
              ))}
            </Section>
          </Section>

          <Section className="email-pad" style={styles.contentSection}>
            <SectionHeading title="Why should your institution participate?" />
            <Row>
              {content.benefits.map((benefit, index) => (
                <Fragment key={benefit.title}>
                  {index > 0 ? (
                    <Column className="email-spacer" style={styles.columnSpacer} />
                  ) : null}
                  <Column
                    className="email-column"
                    style={{
                      ...styles.benefitCard,
                      borderLeftColor: benefit.accent,
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
                </Fragment>
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
            <SectionHeading title="Key dates" />
            <Row>
              {content.keyDates.map((date, index) => (
                <Fragment key={date.label}>
                  {index > 0 ? (
                    <Column className="email-spacer" style={styles.columnSpacer} />
                  ) : null}
                  <Column
                    className="email-column"
                    style={{ ...styles.dateCard, backgroundColor: date.color }}
                    valign="top"
                  >
                    <Text style={styles.dateLabel}>{date.label}</Text>
                    <Text style={styles.dateValue}>{date.value}</Text>
                  </Column>
                </Fragment>
              ))}
            </Row>
          </Section>

          <Section className="email-pad" style={styles.ctaWrapper}>
            <Section style={styles.ctaSection}>
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
                Reply: We are interested →
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
            <Section style={styles.signatureBlock}>
              <Text style={styles.signatureClosing}>
                {content.signature.closing}
              </Text>
              <Text style={styles.signatureName}>{content.signature.name}</Text>
              <Text style={styles.signatureOrganization}>
                {content.signature.organization}
              </Text>
              <Text style={styles.signatureContact}>
                {content.signature.designation} | {content.signature.email}
              </Text>
            </Section>
          </Section>

          <Section style={styles.footer}>
            <Img
              alt="EduDeca"
              height="46"
              src="cid:edudeca-logo"
              style={styles.footerLogo}
              width="130"
            />
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
    padding: "28px 0",
  },
  container: {
    backgroundColor: BRAND.white,
    borderRadius: "18px",
    boxShadow: "0 8px 28px rgba(13, 27, 42, 0.1)",
    margin: "0 auto",
    maxWidth: "720px",
    overflow: "hidden",
  },
  brandBar: {
    backgroundColor: BRAND.ink,
    padding: "24px 38px 18px",
  },
  headerLogo: { display: "block", height: "auto", maxWidth: "200px" },
  tagline: {
    color: "#BDCAD8",
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "1.6px",
    lineHeight: "16px",
    margin: "12px 0 0",
  },
  audienceColumn: { width: "165px" },
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
    padding: "18px 38px 38px",
  },
  heroEyebrow: {
    color: BRAND.blue,
    fontSize: "15px",
    fontWeight: "800",
    lineHeight: "22px",
    margin: "0 0 10px",
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
  heroAccent: { color: BRAND.blue },
  heroText: {
    color: "#CFDAE6",
    fontSize: "16px",
    lineHeight: "26px",
    margin: "0",
    maxWidth: "575px",
  },
  whiteText: { color: BRAND.white },
  introduction: { padding: "34px 38px 8px" },
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
  contentSection: { padding: "32px 38px 0" },
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
    border: `1px solid ${BRAND.line}`,
    borderRadius: "12px",
    padding: "18px",
  },
  columnSpacer: { width: "2%" },
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
    padding: "0",
  },
  journeyHeader: {
    backgroundColor: BRAND.ink,
    color: BRAND.white,
    fontSize: "11px",
    fontWeight: "700",
  },
  journeyHeaderLevel: { padding: "11px 12px", width: "15%" },
  journeyHeaderFormat: { padding: "11px 12px", width: "43%" },
  journeyHeaderAccess: { padding: "11px 12px", width: "42%" },
  journeyRow: { borderTop: `1px solid ${BRAND.line}` },
  journeyRowAlternate: { backgroundColor: "#FBFCFE" },
  levelColumn: { padding: "14px 12px", width: "15%" },
  levelNumber: {
    color: BRAND.blue,
    fontSize: "14px",
    fontWeight: "800",
    lineHeight: "21px",
    margin: "0",
  },
  levelFormatColumn: { padding: "14px 12px", width: "43%" },
  levelAccessColumn: { padding: "14px 12px", width: "42%" },
  levelFormat: {
    color: BRAND.ink,
    fontSize: "14px",
    lineHeight: "21px",
    margin: "0",
  },
  levelAccess: {
    color: BRAND.text,
    fontSize: "14px",
    fontWeight: "700",
    lineHeight: "21px",
    margin: "0",
  },
  levelNote: {
    color: BRAND.muted,
    fontSize: "12px",
    lineHeight: "18px",
    margin: "3px 0 0",
  },
  benefitCard: {
    backgroundColor: "#F7FAFC",
    borderLeft: "5px solid",
    padding: "17px 18px",
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
    color: BRAND.blue,
    fontSize: "13px",
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
  ctaWrapper: { padding: "34px 38px 0" },
  ctaSection: {
    backgroundColor: "#F7FAFC",
    border: `1px solid ${BRAND.line}`,
    borderRadius: "14px",
    padding: "24px",
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
    backgroundColor: BRAND.blue,
    borderRadius: "8px",
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
  closingSection: { padding: "34px 38px 28px" },
  closingText: {
    color: BRAND.text,
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0",
  },
  signatureBlock: { padding: "18px 0 0" },
  signatureClosing: {
    color: BRAND.text,
    fontSize: "15px",
    lineHeight: "23px",
    margin: "0",
  },
  signatureName: {
    color: BRAND.ink,
    fontSize: "15px",
    fontWeight: "800",
    lineHeight: "23px",
    margin: "0",
  },
  signatureOrganization: {
    color: BRAND.text,
    fontSize: "15px",
    lineHeight: "23px",
    margin: "0",
  },
  signatureContact: {
    color: BRAND.muted,
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0",
  },
  footer: {
    backgroundColor: BRAND.ink,
    padding: "22px 38px",
    textAlign: "center" as const,
  },
  footerLogo: {
    display: "block",
    height: "auto",
    margin: "0 auto",
    maxWidth: "130px",
  },
  footerText: {
    color: "#BDCAD8",
    fontSize: "10px",
    lineHeight: "16px",
    margin: "4px 0 0",
  },
};
