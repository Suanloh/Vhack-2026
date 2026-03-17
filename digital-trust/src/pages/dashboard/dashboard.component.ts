
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { WebsocketService } from '../../core/websocket.service';
import { LiveTransaction } from '../../shared/models/live-transaction.model';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  latestRiskScore: number = 0;
  latestExplanation: string[] = [];
  latestDecision: string = 'APPROVE';
  latestTrustScore: number = 0;

  private socketSubscription: Subscription | undefined = undefined;
  constructor(private websocketService: WebsocketService, private apiService: ApiService) { }

  ngOnInit(): void {
    this.socketSubscription = this.websocketService.getLiveTransactions().subscribe(
      (newTransaction: LiveTransaction) => {
        this.latestRiskScore = newTransaction.risk_analysis.risk_score;
        this.latestExplanation = newTransaction.risk_analysis.explanation;
        this.latestDecision = newTransaction.risk_analysis.decision;
        
        // Fetch updated trust score for the user in the transaction
        this.apiService.getUserProfile(newTransaction.transaction.user_id).subscribe(profile => {
          this.latestTrustScore = profile.trust_score;
        });
      }
    );
  }

  ngOnDestroy(): void {
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }
  }
}
