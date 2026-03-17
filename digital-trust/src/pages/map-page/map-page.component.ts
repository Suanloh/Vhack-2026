
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { WebsocketService } from '../../core/websocket.service';
import { LiveTransaction } from '../../shared/models/live-transaction.model';

@Component({
  selector: 'app-map-page',
  templateUrl: './map-page.component.html',
  styleUrls: ['./map-page.component.css']
})
export class MapPageComponent implements OnInit, OnDestroy {
  transactions: LiveTransaction[] = [];
  private socketSubscription: Subscription;

  constructor(private websocketService: WebsocketService) { }

  ngOnInit(): void {
    this.socketSubscription = this.websocketService.getLiveTransactions().subscribe(
      (newTransaction: LiveTransaction) => {
        this.transactions.unshift(newTransaction);
        if (this.transactions.length > 100) {
          this.transactions.pop();
        }
      }
    );
  }

  ngOnDestroy(): void {
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }
  }
}
