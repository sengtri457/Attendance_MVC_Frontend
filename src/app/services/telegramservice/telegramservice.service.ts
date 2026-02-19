import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../env/enviroment';

@Injectable({
  providedIn: 'root',
})
export class TelegramserviceService {
  /**
   * The Telegram bot token and chatId are now stored in the backend .env file.
   * The frontend only knows about our own secure API endpoint.
   */
  private apiUrl = `${environment.apiUrl}/telegram/send`;

  constructor(private http: HttpClient) {}

  /**
   * Sends a Telegram message by calling the backend proxy endpoint.
   * The backend holds the bot credentials securely.
   *
   * @param text - Message text (Markdown supported)
   */
  sendMessage(text: string): Observable<any> {
    const body = {
      text,
      parse_mode: 'Markdown',
    };
    return this.http.post(this.apiUrl, body);
  }
}
