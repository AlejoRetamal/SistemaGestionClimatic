import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu.html',
  styleUrl: './menu.css'
})
export class MenuComponent implements OnInit {
  userName = '';
  userGroup = '';
  menuItems: any[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.userName = localStorage.getItem('userName') || '';
    this.userGroup = localStorage.getItem('userGroup') || '';
    this.loadMenuItems();
  }

  loadMenuItems() {
    const menus: { [key: string]: any[] } = {
      'Direccion': [
        { label: 'Alta Máquinas', route: '/maquinas/new' },
        { label: 'Alta Repuestos', route: '/repuestos/new' },
        { label: 'Alta Tareas', route: '/tareas/new' },
        { label: 'Alta Empleados', route: '/empleados/new' },
        { label: 'Registro de Tareas', route: '/registro_tareas/new' }
      ],
      'Mantenimiento': [
        { label: 'Alta Máquinas', route: '/maquinas/new' },
        { label: 'Registro de Tareas', route: '/registro_tareas/new' },
        { label: 'Consultar Órdenes', route: '/consultar_ordenes' }
      ],
      'Administracion': [
        { label: 'Alta Empleados', route: '/empleados/new' },
        { label: 'Alta Proveedores', route: '/proveedores/new' },
        { label: 'Alta Repuestos', route: '/repuestos/new' }
      ],
      'Produccion': [
        { label: 'Ver Órdenes', route: '/ordenes' }
      ]
    };

    this.menuItems = menus[this.userGroup] || [];
  }

  navigate(route: string) {
    this.router.navigate([route]);
  }

  logout() {
    localStorage.removeItem('userGroup');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    this.router.navigate(['/login']);
  }
}