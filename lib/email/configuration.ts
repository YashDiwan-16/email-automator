export interface EmailSender {
  email: string;
  name: string;
}

export interface SmtpTransportConfiguration {
  service?: string;
  host?: string;
  port: number;
  secure: boolean;
  requireTls: boolean;
  user: string;
  password: string;
}
