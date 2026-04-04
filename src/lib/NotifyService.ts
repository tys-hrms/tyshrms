import { User, LeaveLog, LeaveAutomationSettings } from '../types';

export class NotifyService {
  static generateMessage(
    template: string,
    worker: User,
    leave: LeaveLog,
    reviewer: User,
    status: 'approved' | 'rejected'
  ): string {
    return template
      .replace(/{worker_name}/g, worker.name)
      .replace(/{start_date}/g, leave.date)
      .replace(/{end_date}/g, leave.end_date || leave.date)
      .replace(/{status}/g, status.toUpperCase())
      .replace(/{reviewer_name}/g, reviewer.name)
      .replace(/{reason}/g, leave.reason || 'None provided');
  }

  static sendWhatsApp(phone: string, message: string) {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  static sendEmail(email: string, subject: string, body: string) {
    if (!email) return;
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  }

  static async notifyLeaveResponse(
    settings: LeaveAutomationSettings,
    worker: User,
    leave: LeaveLog,
    reviewer: User,
    status: 'approved' | 'rejected'
  ) {
    if (!settings.enabled) return;

    if (settings.whatsapp_enabled && worker.phone) {
      const msg = this.generateMessage(settings.whatsapp_template, worker, leave, reviewer, status);
      this.sendWhatsApp(worker.phone || '', msg);
    }

    if (settings.email_enabled && worker.email) {
      const msg = this.generateMessage(settings.email_template, worker, leave, reviewer, status);
      this.sendEmail(worker.email, `Leave Request ${status.toUpperCase()}`, msg);
    }
  }
}
