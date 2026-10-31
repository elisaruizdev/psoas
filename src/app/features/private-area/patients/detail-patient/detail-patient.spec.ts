import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestHttp, provideTestRouter, provideTestDialog } from '../../../../../testing/providers';

import { DetailPatient } from './detail-patient';

describe('DetailPatient', () => {
  let component: DetailPatient;
  let fixture: ComponentFixture<DetailPatient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailPatient],
      providers: [...provideTestDialog({ id: 'p-1' }).providers, ...provideTestHttp(), ...provideTestRouter()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetailPatient);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
