import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { WebsocketService } from '../../core/websocket.service';

@Component({
  selector: 'app-transaction-monitor',
  templateUrl: './transaction-monitor.component.html',
  styleUrls: ['./transaction-monitor.component.css']
})
export class TransactionMonitorComponent implements OnInit, OnDestroy {
  transactions: any[] = [];
  private socketSubscription: Subscription | undefined = undefined;

  constructor(private websocketService: WebsocketService) {}

  ngOnInit(): void {
    this.socketSubscription = this.websocketService.messages$.subscribe(msg => {
      this.transactions.unshift(msg);
      // keep list bounded
      if (this.transactions.length > 200) this.transactions.pop();
    });
  }

  ngOnDestroy(): void {
    this.socketSubscription?.unsubscribe();
    this.socketSubscription = undefined;
  }
}