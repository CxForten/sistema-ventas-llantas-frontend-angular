import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastHost } from './core/ui/toast-host/toast-host';

@Component({
  imports: [RouterOutlet, ToastHost],
  selector: 'app-root',
  template: `<router-outlet /><app-toast-host />`
})
export class App {}
