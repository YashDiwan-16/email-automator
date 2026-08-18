import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from "react-email";

import type { EmailPersonalization } from "./schema";

const EMAIL_BODY = [
  "We have something new to share with you.",
  "Thank you for staying connected.",
] as const;

const EMAIL_SIGNATURE = {
  closing: "Regards,",
  name: "Sankar",
  title: "Principal",
  organization: "RDM University",
} as const;

/** Update the version whenever the approved subject or body changes. */
export const PREDEFINED_EMAIL_TEMPLATE = {
  version: "2026-08-18.2",
  subject: `A message from ${EMAIL_SIGNATURE.organization}`,
} as const;

export function createPredefinedEmailContent(
  personalization: EmailPersonalization,
) {
  const greeting = `Dear ${personalization.university},`;
  return {
    subject: `${PREDEFINED_EMAIL_TEMPLATE.subject} for ${personalization.university}`,
    greeting,
    body: EMAIL_BODY,
    signature: EMAIL_SIGNATURE,
    text: [
      greeting,
      "",
      ...EMAIL_BODY.flatMap((paragraph) => [paragraph, ""]),
      EMAIL_SIGNATURE.closing,
      EMAIL_SIGNATURE.name,
      EMAIL_SIGNATURE.title,
      EMAIL_SIGNATURE.organization,
    ].join("\n"),
  };
}

export function PredefinedEmailTemplate(
  personalization: EmailPersonalization,
) {
  const content = createPredefinedEmailContent(personalization);

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{content.subject}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.eyebrow}>
            {content.signature.organization.toLocaleUpperCase("en-US")}
          </Text>
          <Heading as="h1" style={styles.heading}>
            {content.greeting}
          </Heading>
          <Hr style={styles.divider} />
          {content.body.map((paragraph, index) => (
            <Text
              key={paragraph}
              style={index === 0 ? styles.message : styles.followUp}
            >
              {paragraph}
            </Text>
          ))}
          <Text style={styles.signOff}>
            {content.signature.closing}
            <br />
            <strong>{content.signature.name}</strong>
            <br />
            {content.signature.title}
            <br />
            {content.signature.organization}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#f4f4f0",
    color: "#20211e",
    fontFamily: "Arial, Helvetica, sans-serif",
    margin: "0",
    padding: "32px 12px",
  },
  container: {
    backgroundColor: "#ffffff",
    border: "1px solid #deded7",
    borderRadius: "16px",
    margin: "0 auto",
    maxWidth: "600px",
    padding: "36px",
  },
  eyebrow: {
    color: "#74766f",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "1.6px",
    margin: "0 0 10px",
  },
  heading: {
    color: "#20211e",
    fontSize: "24px",
    fontWeight: "600",
    lineHeight: "1.3",
    margin: "0",
  },
  divider: {
    borderColor: "#e8e8e2",
    margin: "28px 0",
  },
  message: {
    color: "#343630",
    fontSize: "16px",
    lineHeight: "1.7",
    margin: "0",
  },
  followUp: {
    color: "#343630",
    fontSize: "16px",
    lineHeight: "1.7",
    margin: "18px 0 0",
  },
  signOff: {
    color: "#343630",
    fontSize: "16px",
    lineHeight: "1.6",
    margin: "28px 0 0",
  },
};
