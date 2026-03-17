import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-risk-meter',
  templateUrl: './risk-meter.component.html',
  styleUrls: ['./risk-meter.component.css']
})
export class RiskMeterComponent {
  @Input() riskScore: number = 0;

  getRotation(): number {
    // The gauge is a semi-circle, so it goes from -90 to 90 degrees.
    // We map the risk score (0 to 1) to this range.
    return (this.riskScore * 180) - 90;
  }
}
