import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(
      this.configService.get<string>('RESEND_API_KEY'),
    );
  }

  async sendContactEmail(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) {
    return await this.resend.emails.send({
      from: 'AgroSense <onboarding@resend.dev>',
      to: ['divyanshukumawat9170@gmail.com'],
      subject: `📩 New Contact Form - ${data.subject}`,
      html: `
        <h2>New Contact Form Submission</h2>

        <p><strong>Name:</strong> ${data.name}</p>

        <p><strong>Email:</strong> ${data.email}</p>

        <p><strong>Subject:</strong> ${data.subject}</p>

        <p><strong>Message:</strong></p>

        <p>${data.message}</p>
      `,
    });
  }
}