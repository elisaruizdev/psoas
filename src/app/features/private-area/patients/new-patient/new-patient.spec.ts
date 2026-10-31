import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestHttp, provideTestRouter, provideTestDialog } from '../../../../../testing/providers';

import { NewPatient } from './new-patient';

describe('NewPatient', () => {
  let component: NewPatient;
  let fixture: ComponentFixture<NewPatient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewPatient],
      providers: [...provideTestDialog().providers, ...provideTestHttp(), ...provideTestRouter()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewPatient);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
