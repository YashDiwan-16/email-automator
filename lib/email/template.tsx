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

/** Update the version whenever the approved subject or body changes. */
export const PREDEFINED_EMAIL_TEMPLATE = {
  version: "2026-08-18.2",
  subject: "A message from RDM University",
} as const;

export function createPredefinedEmailContent(university: string) {
  return {
    subject: `${PREDEFINED_EMAIL_TEMPLATE.subject} for ${university}`,
    text: [
      `Dear ${university},`,
      "",
      "We have something new to share with you.",
      "",
      "Thank you for staying connected.",
      "",
      "Regards,",
      "Sankar",
      "Principal",
      "RDM University",
    ].join("\n"),
  };
}

interface PredefinedEmailTemplateProps {
  university: string;
}

export function PredefinedEmailTemplate({
  university,
}: PredefinedEmailTemplateProps) {
  const content = createPredefinedEmailContent(university);

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{content.subject}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.eyebrow}>RDM UNIVERSITY</Text>
          <Heading as="h1" style={styles.heading}>
            Dear {university},
          </Heading>
          <Hr style={styles.divider} />
          <Text style={styles.message}>
            We have something new to share with you.
          </Text>
          <Text style={styles.followUp}>Thank you for staying connected.</Text>
          <Text style={styles.signOff}>
            Regards,
            <br />
            <strong>Sankar</strong>
            <br />
            Principal
            <br />
            RDM University
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
