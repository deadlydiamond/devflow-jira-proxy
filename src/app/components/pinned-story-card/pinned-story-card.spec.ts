import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PinnedStoryCard } from './pinned-story-card';

describe('PinnedStoryCard', () => {
  let component: PinnedStoryCard;
  let fixture: ComponentFixture<PinnedStoryCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PinnedStoryCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PinnedStoryCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
