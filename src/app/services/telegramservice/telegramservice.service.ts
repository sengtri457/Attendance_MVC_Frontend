import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment, environmentTelegram } from '../../../env/enviroment';

@Injectable({
  providedIn: 'root',
})
export class TelegramserviceService {
  
  private botToken = environmentTelegram.botToken;
  private chatId = environmentTelegram.chatId;
  private apiUrl = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

  constructor(private http: HttpClient) {}

  sendMessage(text: string): Observable<any> {
    const body = {
      chat_id: this.chatId,
      text: text,
      parse_mode: 'Markdown'
    };
    return this.http.post(this.apiUrl, body);
  }
}
