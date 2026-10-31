import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestHttp, provideTestRouter } from '../../../../../testing/providers';

import { TabMenu } from './tab-menu';

describe('TabMenu', () => {
  let component: TabMenu;
  let fixture: ComponentFixture<TabMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabMenu],
      providers: [...provideTestHttp(), ...provideTestRouter()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(TabMenu);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
