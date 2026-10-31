import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuDetailPatientComponent } from './menu-detail-patient';

describe('MenuDetailPatientComponent', () => {
  let component: MenuDetailPatientComponent;
  let fixture: ComponentFixture<MenuDetailPatientComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuDetailPatientComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuDetailPatientComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
