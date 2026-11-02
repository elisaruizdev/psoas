import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DashboardService } from './services/dashboard.service';
import { DashboardStats } from './models/dashboard.model';
import { Router } from '@angular/router';
import { provideTestRouter } from '../../../../testing/providers';
import { MicrofrontendLoader } from '../../../shared/microfrontends/microfrontend-loader.service';

import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let service: jasmine.SpyObj<DashboardService>;
  let mfe: jasmine.SpyObj<MicrofrontendLoader>;

  const stats: DashboardStats = {
    sessionsToday: { total: 5, completed: 2 },
    sessionsNextWeek: 18,
    activePatients: 42,
    todayAppointments: [
      {
        id: 'a-1',
        appointment_date: new Date(2026, 10, 2, 9, 5),
        duration: 45,
        session_number: 2,
        status: 'confirmed',
        notes: null,
        patient: { id: 'p-1', name: 'Lucía', surname: 'García', second_surname: 'López' },
        physio: { id_physio: 7, name: 'Ana', surname: 'Ruiz', second_surname: 'Gil' },
      },
      {
        id: 'a-2',
        appointment_date: new Date(2026, 10, 2, 17, 0),
        duration: 30,
        session_number: 1,
        status: 'en_sala',
        notes: null,
        patient: { id: 'p-2', name: 'Mario', surname: 'Sanz', second_surname: null },
        physio: { id_physio: 7, name: 'Ana', surname: 'Ruiz', second_surname: null },
      },
    ],
  };

  beforeEach(async () => {
    service = jasmine.createSpyObj<DashboardService>('DashboardService', ['getDashboardStats']);
    service.getDashboardStats.and.returnValue(of(stats));
    // Por defecto el microfrontend no está disponible (como en CI).
    mfe = jasmine.createSpyObj<MicrofrontendLoader>('MicrofrontendLoader', ['load']);
    mfe.load.and.resolveTo(false);

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        ...provideTestRouter(),
        { provide: DashboardService, useValue: service },
        { provide: MicrofrontendLoader, useValue: mfe },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
  });

  it('pinta las tarjetas con las cifras del día', () => {
    fixture.detectChanges();
    const valores = [...fixture.nativeElement.querySelectorAll('.dashboard__card-value')].map(
      (el: Element) => el.textContent?.trim(),
    );
    expect(valores).toEqual(['5', '18', '42']);
    expect(component.sesionesCompletadas()).toBe(2);
    expect(component.currentDate).toMatch(/^Hoy [A-ZÁÉÍÓÚ]/);
  });

  it('prepara las citas de hoy para la tabla', () => {
    fixture.detectChanges();
    const filas = component.sesionesHoyConfig().data;
    expect(filas[0]).toEqual(
      jasmine.objectContaining({
        hora: '09:05',
        paciente: 'Lucía García López',
        fisioterapeuta: 'Ana Ruiz Gil',
        tipo: '2ª sesión',
        estado: 'Confirmada',
      }),
    );
    // Un estado que no conoce se muestra tal cual en vez de romper.
    expect(filas[1]['estado']).toBe('en_sala');
    expect(filas[1]['paciente']).toBe('Mario Sanz');
  });

  it('sin datos, las cifras son 0', () => {
    expect(component.pacientesActivos()).toBe(0);
    expect(component.sesionesHoy()).toBe(0);
    expect(component.sesionesSemana()).toBe(0);
    expect(component.sesionesHoyConfig().data).toEqual([]);
  });

  it('si la API falla, muestra el error en un role="alert"', () => {
    service.getDashboardStats.and.returnValue(throwError(() => new Error('500')));
    fixture.detectChanges();

    expect(component.loading()).toBeFalse();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'No se han podido cargar las estadísticas.',
    );
  });

  describe('microfrontend <psoas-resumen-citas>', () => {
    it('si no carga, no pinta el widget y la página funciona igual', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      expect(mfe.load).toHaveBeenCalledWith(jasmine.any(String), 'psoas-resumen-citas');
      expect(fixture.nativeElement.querySelector('psoas-resumen-citas')).toBeNull();
    });

    it('si carga, le pasa las citas por propiedad (no por atributo)', async () => {
      mfe.load.and.resolveTo(true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const widget = fixture.nativeElement.querySelector('psoas-resumen-citas');
      expect(widget).not.toBeNull();
      expect(widget.getAttribute('titulo')).toBe('Próximas citas de hoy');
      expect(widget.citas).toEqual([
        { id: 'a-1', hora: '09:05', paciente: 'Lucía García López', estado: 'confirmed' },
        { id: 'a-2', hora: '17:00', paciente: 'Mario Sanz', estado: 'en_sala' },
      ]);
    });

    it('al recibir cita-seleccionada navega a la agenda con esa cita', async () => {
      mfe.load.and.resolveTo(true);
      const navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const widget: HTMLElement = fixture.nativeElement.querySelector('psoas-resumen-citas');
      widget.dispatchEvent(new CustomEvent('cita-seleccionada', { detail: { id: 'a-2' } }));

      expect(navegar).toHaveBeenCalledWith(['/sessions'], { queryParams: { cita: 'a-2' } });
    });

    it('ignora eventos sin id', () => {
      const navegar = spyOn(TestBed.inject(Router), 'navigate');
      component.onCitaSeleccionada(new CustomEvent('cita-seleccionada'));
      expect(navegar).not.toHaveBeenCalled();
    });
  });
});
