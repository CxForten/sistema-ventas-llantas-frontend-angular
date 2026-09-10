import { Component, inject } from '@angular/core';
import { Toast } from '../toast';

@Component({
  selector: 'app-toast-host',
  template: `
  <div class="toast-wrap">
    @for (msg of toast.messages(); track msg.id) {
      <div class="toast" [class.success]="msg.kind === 'success'"
           [class.error]="msg.kind === 'error'">
        {{msg.text}}
      </div>
    }
  </div>
 `,
})
export class ToastHost {
  toast = inject(Toast);
}
