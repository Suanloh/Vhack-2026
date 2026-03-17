
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Transaction } from '../../shared/models/live-transaction.model';

@Component({
  selector: 'app-protection-warning',
  templateUrl: './protection-warning.component.html',
  styleUrls: ['./protection-warning.component.css']
})
export class ProtectionWarningComponent {
  @Input() showWarning: boolean = false;
  @Input() transaction: Transaction | null = null;
  @Input() explanation: string[] = [];

  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  confirm(): void {
    this.onConfirm.emit();
    this.showWarning = false;
  }

  cancel(): void {
    this.onCancel.emit();
    this.showWarning = false;
  }
}
