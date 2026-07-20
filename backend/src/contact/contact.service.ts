import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Contact } from './contact.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,

    private readonly emailService: EmailService,
  ) {}

  async create(contactData: Partial<Contact>) {
    const contact = this.contactRepository.create(contactData);
    const savedContact = await this.contactRepository.save(contact);

    await this.emailService.sendContactEmail({
      name: savedContact.name,
      email: savedContact.email,
      subject: savedContact.subject,
      message: savedContact.message,
    });

    return {
      success: true,
      message: 'Contact message sent successfully.',
      data: savedContact,
    };
  }

  async findAll() {
    return await this.contactRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }
}