import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "react-email";

interface EmailMessageTemplateProps {
  fromName: string;
  message: string;
  subject: string;
}

export function EmailMessageTemplate({
  fromName,
  message,
  subject,
}: EmailMessageTemplateProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{subject}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.eyebrow}>MESSAGE FROM</Text>
            <Heading as="h1" style={styles.heading}>
              {fromName}
            </Heading>
          </Section>
          <Hr style={styles.divider} />
          <Section style={styles.content}>
            <Text style={styles.message}>{message}</Text>
          </Section>
          <Hr style={styles.divider} />
          <Text style={styles.footer}>
            This message was sent directly to you. Reply to contact the sender.
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
  header: {
    padding: "0",
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
  content: {
    padding: "0",
  },
  message: {
    color: "#343630",
    fontSize: "16px",
    lineHeight: "1.7",
    margin: "0",
    whiteSpace: "pre-wrap" as const,
  },
  footer: {
    color: "#85877f",
    fontSize: "12px",
    lineHeight: "1.5",
    margin: "0",
  },
};
