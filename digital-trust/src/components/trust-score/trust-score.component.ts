import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-trust-score',
  templateUrl: './trust-score.component.html',
  styleUrls: ['./trust-score.component.css']
})
export class TrustScoreComponent {
  @Input() trustScore: number = 0;

  getRotation(): number {
    // The gauge is a semi-circle, so it goes from -90 to 90 degrees.
    // We map the trust score (0 to 100) to this range.
    return (this.trustScore / 100 * 180) - 90;
  }
}
