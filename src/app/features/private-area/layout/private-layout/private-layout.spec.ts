import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestHttp, provideTestRouter } from '../../../../../testing/providers';

import { PrivateLayout } from './private-layout';

describe('PrivateLayout', () => {
  let component: PrivateLayout;
  let fixture: ComponentFixture<PrivateLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivateLayout],
      providers: [...provideTestHttp(), ...provideTestRouter()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrivateLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
