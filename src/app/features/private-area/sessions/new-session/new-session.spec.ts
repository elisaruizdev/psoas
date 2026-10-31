import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestHttp, provideTestRouter, provideTestDialog } from '../../../../../testing/providers';

import { NewSession } from './new-session';

describe('NewSession', () => {
  let component: NewSession;
  let fixture: ComponentFixture<NewSession>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewSession],
      providers: [...provideTestDialog().providers, ...provideTestHttp(), ...provideTestRouter()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewSession);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
