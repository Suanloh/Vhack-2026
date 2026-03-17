
import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LiveTransaction } from '../shared/models/live-transaction.model';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket$: WebSocketSubject<LiveTransaction>;

  constructor() {
    this.socket$ = webSocket<LiveTransaction>(environment.wsUrl);
  }

  public getLiveTransactions(): Observable<LiveTransaction> {
    return this.socket$.asObservable();
  }

  public closeConnection(): void {
    this.socket$.complete();
  }
}
