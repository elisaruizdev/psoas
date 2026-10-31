import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestHttp, provideTestRouter } from '../../../../../../testing/providers';

import { SessionsHistory } from './sessions-history';

describe('SessionsHistory', () => {
  let component: SessionsHistory;
  let fixture: ComponentFixture<SessionsHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionsHistory],
      providers: [...provideTestHttp(), ...provideTestRouter()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SessionsHistory);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('patientId', 'p-1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
