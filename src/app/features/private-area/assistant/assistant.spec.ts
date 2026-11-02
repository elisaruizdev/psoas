import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { AssistantService } from './services/assistant.service';
import { AssistantReply } from './models/assistant.model';

import { Assistant } from './assistant';

describe('Assistant', () => {
  let component: Assistant;
  let fixture: ComponentFixture<Assistant>;
  let service: jasmine.SpyObj<AssistantService>;
  let element: HTMLElement;

  const respuesta = (cambios: Partial<AssistantReply> = {}): AssistantReply => ({
    respuesta: 'Ha mejorado: EVA 4/10 [2].',
    ruta: 'clinico',
    aprobado: true,
    intentos: 1,
    traza: ['enrutador: clinico', 'clinico: 3 fragmentos, citas [2]', 'revisor: aprobado'],
    tokens: 950,
    ...cambios,
  });

  beforeEach(async () => {
    service = jasmine.createSpyObj<AssistantService>('AssistantService', ['health', 'ask']);
    service.health.and.returnValue(of({ estado: 'ok', proveedor: 'gemini', origen_datos: 'api' }));

    await TestBed.configureTestingModule({
      imports: [Assistant],
      providers: [{ provide: AssistantService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(Assistant);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  async function pintar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const texto = (selector: string) => element.querySelector(selector)?.textContent?.trim() ?? '';

  it('muestra qué modelo responde y sugerencias para empezar', () => {
    expect(texto('.assistant__provider')).toBe('Modelo: gemini');
    expect(element.querySelectorAll('.assistant__suggestion').length).toBe(4);
  });

  it('en modo demo lo dice claramente', async () => {
    component.health.set({ estado: 'ok', proveedor: 'fake', origen_datos: 'json' });
    await pintar();
    expect(texto('.assistant__provider')).toBe('Modo demo, sin modelo de IA');
  });

  it('envía la pregunta, la muestra y pinta la respuesta con su ruta, revisión y traza', async () => {
    service.ask.and.returnValue(of(respuesta()));
    component.question.setValue('  ¿Cómo va Ana López?  ');
    component.send();
    await pintar();

    expect(service.ask).toHaveBeenCalledWith('¿Cómo va Ana López?');
    const mensajes = element.querySelectorAll('.assistant__message');
    expect(mensajes.length).toBe(2);
    expect(mensajes[0].textContent).toContain('¿Cómo va Ana López?');
    expect(mensajes[1].textContent).toContain('Ha mejorado: EVA 4/10 [2].');
    expect(texto('.assistant__badges')).toContain('Historia clínica');
    expect(texto('.assistant__badge--ok')).toBe('Revisada');
    expect(element.querySelectorAll('.assistant__trace li').length).toBe(3);
    expect(texto('.assistant__tokens')).toBe('950 tokens · 1 intento');
    expect(component.question.value).toBe('');
  });

  it('si el revisor no la aprueba, la marca como sin verificar', async () => {
    service.ask.and.returnValue(of(respuesta({ aprobado: false, intentos: 2 })));
    component.useSuggestion(component.suggestions[0]);
    await pintar();

    expect(texto('.assistant__badge--warning')).toBe('Sin verificar');
    expect(texto('.assistant__tokens')).toContain('2 intentos');
  });

  it('fuera de ámbito no enseña la etiqueta de revisión', async () => {
    service.ask.and.returnValue(of(respuesta({ ruta: 'fuera_de_ambito', intentos: 0 })));
    component.useSuggestion('¿Me recomiendas ibuprofeno?');
    await pintar();

    expect(texto('.assistant__badges')).toBe('Fuera de ámbito');
  });

  it('mientras espera, avisa y no deja enviar otra pregunta', async () => {
    const pendiente = new Subject<AssistantReply>();
    service.ask.and.returnValue(pendiente);
    component.question.setValue('¿Cómo va Ana?');
    component.send();
    await pintar();

    expect(texto('.assistant__pending')).toContain('consultando');
    component.question.setValue('Otra pregunta');
    component.send();
    expect(service.ask).toHaveBeenCalledTimes(1);

    pendiente.next(respuesta());
    await pintar();
    expect(element.querySelector('.assistant__pending')).toBeNull();
  });

  it('el botón Preguntar envía sin recargar la página', async () => {
    service.ask.and.returnValue(of(respuesta()));
    const input = element.querySelector<HTMLTextAreaElement>('#assistant-question')!;
    input.value = '¿Cómo va Ana?';
    input.dispatchEvent(new Event('input'));
    await pintar();

    const form = element.querySelector('form')!;
    const envio = new SubmitEvent('submit', { cancelable: true });
    form.dispatchEvent(envio);

    expect(envio.defaultPrevented).toBeTrue(); // sin esto, el navegador recargaría la página
    expect(service.ask).toHaveBeenCalledWith('¿Cómo va Ana?');
  });

  it('no envía preguntas vacías o demasiado cortas', () => {
    component.question.setValue('  ');
    component.send();
    component.question.setValue('ok');
    component.send();
    expect(service.ask).not.toHaveBeenCalled();
  });

  it('Enter envía y Mayús+Enter no', () => {
    service.ask.and.returnValue(of(respuesta()));
    const enter = new KeyboardEvent('keydown', { key: 'Enter' });
    spyOn(enter, 'preventDefault');

    component.question.setValue('¿Cómo va Ana?');
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));
    expect(service.ask).not.toHaveBeenCalled();

    component.onKeydown(enter);
    expect(enter.preventDefault).toHaveBeenCalled();
    expect(service.ask).toHaveBeenCalledTimes(1);
  });

  const errores: [number, string][] = [
    [0, 'No se puede conectar con el asistente'],
    [503, 'no está disponible ahora mismo'],
    [502, 'no ha podido leer los datos'],
    [500, 'Inténtalo de nuevo'],
  ];
  errores.forEach(([status, mensaje]) => {
    it(`error ${status}: lo explica en un role="alert" y conserva la pregunta`, async () => {
      service.ask.and.returnValue(throwError(() => new HttpErrorResponse({ status })));
      component.question.setValue('¿Cómo va Ana?');
      component.send();
      await pintar();

      expect(texto('[role="alert"]')).toContain(mensaje);
      expect(component.question.value).toBe('¿Cómo va Ana?');
      expect(component.pending()).toBeFalse();
    });
  });

  it('si el asistente no está arrancado, lo avisa al entrar', async () => {
    service.health.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    component.checkHealth();
    await pintar();
    expect(texto('[role="alert"]')).toContain('¿Está arrancado?');
  });

  it('la conversación es una región viva para lectores de pantalla y el campo tiene etiqueta', () => {
    const chat = element.querySelector('[role="log"]');
    expect(chat?.getAttribute('aria-live')).toBe('polite');
    expect(element.querySelector('label[for="assistant-question"]')).not.toBeNull();
    expect(element.querySelector('#assistant-question')?.getAttribute('aria-describedby')).toBe(
      'assistant-hint',
    );
  });
});
