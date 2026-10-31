import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestHttp, provideTestRouter, provideTestDialog } from '../../../../../testing/providers';
import { anAppointment } from '../../../../../testing/fixtures';

import { DetailSession } from './detail-session';

describe('DetailSession', () => {
  let component: DetailSession;
  let fixture: ComponentFixture<DetailSession>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailSession],
      providers: [...provideTestDialog(anAppointment()).providers, ...provideTestHttp(), ...provideTestRouter()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetailSession);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
