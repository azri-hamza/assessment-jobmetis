import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PokemonUpdateFormComponent } from './pokemon-update-form.component';

describe('PokemonUpdateFormComponent', () => {
  let component: PokemonUpdateFormComponent;
  let fixture: ComponentFixture<PokemonUpdateFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PokemonUpdateFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PokemonUpdateFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
}); 