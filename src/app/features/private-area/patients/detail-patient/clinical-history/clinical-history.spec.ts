import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestHttp, provideTestRouter } from '../../../../../../testing/providers';

import { ClinicalHistory } from './clinical-history';

describe('ClinicalHistory', () => {
  let component: ClinicalHistory;
  let fixture: ComponentFixture<ClinicalHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClinicalHistory],
      providers: [...provideTestHttp(), ...provideTestRouter()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClinicalHistory);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('patientId', 'p-1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
