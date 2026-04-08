import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeagueSeasonsComponent } from './league-seasons.component';

describe('LeagueSeasonsComponent', () => {
  let component: LeagueSeasonsComponent;
  let fixture: ComponentFixture<LeagueSeasonsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeagueSeasonsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeagueSeasonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
