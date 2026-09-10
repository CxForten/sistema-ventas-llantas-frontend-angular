import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth-guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./features/login/login').then((m) => m.Login)
    },

    {
        path: '',
        loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
        canActivate: [authGuard],
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
            { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard)},
            { path: 'pos', loadComponent: () => import('./features/pos/pos').then((m) => m.Pos)},
            { path: 'productos', loadComponent: () => import('./features/products/products').then((m) => m.Products)},
            { path: 'ventas', loadComponent: () => import('./features/sales/sales').then((m) => m.Sales)},
            { path: 'caja', loadComponent: () => import('./features/cash/cash').then((m) => m.Cash)},
            { path: 'configuracion', loadComponent: () => import('./features/settings/settings').then((m) => m.Settings)},
        ],
    },

    { path: '**', redirectTo: ''},
];
