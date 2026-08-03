declare module 'pdfkit' {
  class PDFDocument {
    constructor(options?: Record<string, unknown>);
    on(event: string, listener: (...args: any[]) => void): this;
    fontSize(size: number): this;
    fillColor(color: string): this;
    text(text: string, options?: Record<string, unknown>): this;
    text(text: string, x: number, y: number, options?: Record<string, unknown>): this;
    moveDown(lines?: number): this;
    rect(x: number, y: number, width: number, height: number): this;
    fill(color?: string): this;
    addPage(): this;
    end(): void;
    readonly page: { width: number; height: number };
    x: number;
    y: number;
  }

  export = PDFDocument;
}

declare module 'nodemailer' {
  export interface Transporter {
    sendMail(options: {
      from?: string;
      to: string;
      subject: string;
      text: string;
    }): Promise<unknown>;
  }

  export interface TransportOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: {
      user?: string;
      pass?: string;
    };
  }

  export function createTransport(options: TransportOptions): Transporter;

  const nodemailer: {
    createTransport: typeof createTransport;
  };

  export default nodemailer;
}
