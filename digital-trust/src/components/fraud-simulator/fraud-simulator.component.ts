import { Component } from '@angular/core';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-fraud-simulator',
  templateUrl: './fraud-simulator.component.html',
  styleUrls: ['./fraud-simulator.component.css']
})
export class FraudSimulatorComponent {
  numTransactions: number = 5;
  simulationResult: string = '';

  constructor(private apiService: ApiService) {}

  runSimulation(): void {
    this.apiService.simulateAttack({ num_transactions: this.numTransactions }).subscribe({
      next: (res: any) => {
        this.simulationResult = res?.message ?? 'Simulation completed';
      },
      error: (err: any) => {
        this.simulationResult = `Error: ${err?.message ?? 'unknown'}`;
      }
    });
  }
}