import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../../core/auth/auth';

interface NavLink { path: string; label: string; group: string; }

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
})
export class Shell {
  auth = inject(Auth);
  menuOpen = signal(false);

  readonly links: NavLink[] = [
    { path: '/dashboard',           label: 'Resumen',             group: 'Operación'},
    { path: '/pos',                 label: 'Vender',              group: 'Operación'},
    { path: '/caja',                label: 'Caja',                group: 'Operación'},
    { path: '/productos',           label: 'Inventario',          group: 'Catálogo'},
    { path: '/movimientos',           label: 'Movimientos',       group: 'Catálogo'},
    { path: '/ventas',              label: 'Ventas',              group: 'Administración'},
    { path: '/configuracion',       label: 'Configuracion',       group: 'Administración'},
  ];

  groups(): string[] {
    return [...new Set(this.links.map((l) => l.group))];
  }

  linksOf(group: string): NavLink[] {
    return this.links.filter((l) => l.group === group);
  }
}
