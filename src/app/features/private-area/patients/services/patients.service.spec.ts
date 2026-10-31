import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { PatientsService } from './patients.service';
import { CreatePatient, Patient } from '../models/patients.model';
import { environment } from '../../../../../environments/environment';
import { provideTestHttp } from '../../../../../testing/providers';
import { aPatient } from '../../../../../testing/fixtures';

describe('PatientsService', () => {
  const apiUrl = `${environment.baseUrl}/patients`;
  let service: PatientsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestHttp()] });
    service = TestBed.inject(PatientsService);
    http = TestBed.inject(HttpTestingController);
  });

  // Falla si algún test deja una petición sin responder o hace una que no esperaba.
  afterEach(() => http.verify());

  it('getAllPatients hace GET /patients y devuelve la lista', () => {
    const patients = [aPatient(), aPatient({ id: 'p-2', name: 'Mario' })];
    let result: Patient[] | undefined;

    service.getAllPatients().subscribe((value) => (result = value));

    const req = http.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(patients);

    expect(result).toEqual(patients);
  });

  it('getPatientById pide el paciente por su id', () => {
    service.getPatientById('p-1').subscribe();

    const req = http.expectOne(`${apiUrl}/p-1`);
    expect(req.request.method).toBe('GET');
    req.flush(aPatient());
  });

  it('createPatient hace POST con el cuerpo del formulario', () => {
    const body: CreatePatient = {
      name: 'Lucía',
      surname: 'García',
      phone: '600111222',
      email: 'lucia@example.com',
      identifier: '12345678A',
      birthdate: '1990-05-10',
      gender: 'female',
    };
    let created: Patient | undefined;

    service.createPatient(body).subscribe((value) => (created = value));

    const req = http.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(aPatient(), { status: 201, statusText: 'Created' });

    expect(created?.id).toBe('p-1');
  });

  it('updatePatient hace PATCH solo con los campos que cambian', () => {
    service.updatePatient('p-1', { phone: '699000000' }).subscribe();

    const req = http.expectOne(`${apiUrl}/p-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ phone: '699000000' });
    req.flush(aPatient({ phone: '699000000' }));
  });

  it('deletePatient hace DELETE y termina sin valor', () => {
    let completed = false;

    service.deletePatient('p-1').subscribe({ complete: () => (completed = true) });

    const req = http.expectOne(`${apiUrl}/p-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(completed).toBeTrue();
  });

  it('propaga el error HTTP al que se suscribe', () => {
    let status: number | undefined;

    service.getAllPatients().subscribe({ error: (error) => (status = error.status) });

    http.expectOne(apiUrl).flush({}, { status: 500, statusText: 'Server Error' });

    expect(status).toBe(500);
  });
});
