export interface NetgsmConfig {
  username: string;
  password: string;
  title: string;
}

export class NetgsmService {
  private config: NetgsmConfig;

  constructor() {
    this.config = {
      username: process.env.NETGSM_USERNAME || '',
      password: process.env.NETGSM_PASSWORD || '',
      title: process.env.NETGSM_TITLE || 'PTS',
    };
  }

  async sendSMS(phone: string, message: string): Promise<boolean> {
    try {
      const url = 'https://api.netgsm.com.tr/sms/send/get';
      const params = new URLSearchParams({
        usercode: this.config.username,
        password: this.config.password,
        gsmno: phone.replace(/\D/g, ''), // Remove non-digits
        message: message,
        msgheader: this.config.title,
      });

      const response = await fetch(`${url}?${params}`);
      const result = await response.text();
      
      // Netgsm returns response codes: 
      // "00" or "01" means success
      // Other codes mean error
      return result.startsWith('00') || result.startsWith('01');
    } catch (error) {
      console.error('Netgsm SMS gönderme hatası:', error);
      return false;
    }
  }

  async send2FA(phone: string, code: string): Promise<boolean> {
    const message = `PTS giriş doğrulama kodunuz: ${code}. Bu kodu kimseyle paylaşmayın.`;
    return this.sendSMS(phone, message);
  }
}

export const netgsmService = new NetgsmService();
