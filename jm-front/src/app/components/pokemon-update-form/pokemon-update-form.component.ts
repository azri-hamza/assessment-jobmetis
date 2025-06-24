import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pokemon, PokemonService } from '../../services/pokemon.service';
import { PokemonType, PokemonTypeService } from '../../services/pokemon-type.service';

@Component({
  selector: 'app-pokemon-update-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pokemon-update-form.component.html',
  styleUrls: ['./pokemon-update-form.component.scss']
})
export class PokemonUpdateFormComponent implements OnInit, OnChanges {
  @Input() pokemon: Pokemon | null = null;
  @Input() showModal: boolean = false;
  @Output() modalClosed = new EventEmitter<void>();
  @Output() pokemonUpdated = new EventEmitter<Pokemon>();

  formData: Partial<Pokemon> = {};
  isSubmitting = false;
  validationErrors: { [key: string]: string } = {};
  
  // Pokemon types for dropdown
  pokemonTypes = signal<PokemonType[]>([]);
  loadingTypes = signal<boolean>(false);

  constructor(
    private pokemonService: PokemonService,
    private pokemonTypeService: PokemonTypeService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadPokemonTypes();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pokemon'] && this.pokemon) {
      this.formData = { ...this.pokemon };
      this.validationErrors = {};
    }
    if (changes['showModal'] && this.showModal && this.pokemon) {
      // Ensure form data is set when modal opens
      this.formData = { ...this.pokemon };
    }
  }

  async loadPokemonTypes(): Promise<void> {
    try {
      this.loadingTypes.set(true);
      const types = await this.pokemonTypeService.getAllPokemonTypes();
      this.pokemonTypes.set(types);
    } catch (error) {
      console.error('Error loading Pokemon types:', error);
      // Set a fallback list of types if the service fails
      this.pokemonTypes.set([
        { id: 1, name: 'Fire' },
        { id: 2, name: 'Water' },
        { id: 3, name: 'Grass' },
        { id: 4, name: 'Electric' },
        { id: 5, name: 'Psychic' },
        { id: 6, name: 'Ice' },
        { id: 7, name: 'Dragon' },
        { id: 8, name: 'Dark' },
        { id: 9, name: 'Fighting' },
        { id: 10, name: 'Poison' },
        { id: 11, name: 'Ground' },
        { id: 12, name: 'Flying' },
        { id: 13, name: 'Bug' },
        { id: 14, name: 'Rock' },
        { id: 15, name: 'Ghost' },
        { id: 16, name: 'Steel' },
        { id: 17, name: 'Normal' }
      ]);
    } finally {
      this.loadingTypes.set(false);
    }
  }

  validateForm(): boolean {
    this.validationErrors = {};
    let isValid = true;

    // Name validation
    if (!this.formData.name || this.formData.name.trim().length === 0) {
      this.validationErrors['name'] = 'Name is required';
      isValid = false;
    }

    // Type validation
    if (!this.formData.type || this.formData.type.trim().length === 0) {
      this.validationErrors['type'] = 'Type is required';
      isValid = false;
    }

    // Power validation
    if (!this.formData.power) {
      this.validationErrors['power'] = 'Power is required';
      isValid = false;
    } else if (this.formData.power < 10 || this.formData.power > 100) {
      this.validationErrors['power'] = 'Power must be between 10 and 100';
      isValid = false;
    }

    // Life validation
    if (!this.formData.life) {
      this.validationErrors['life'] = 'Life is required';
      isValid = false;
    } else if (this.formData.life < 1) {
      this.validationErrors['life'] = 'Life must be greater than 0';
      isValid = false;
    }

    // Image validation
    if (!this.formData.image || this.formData.image.trim().length === 0) {
      this.validationErrors['image'] = 'Image URL is required';
      isValid = false;
    }

    return isValid;
  }

  async onSubmit(): Promise<void> {
    if (!this.validateForm() || !this.pokemon) {
      return;
    }

    this.isSubmitting = true;
    try {
      const updatedPokemon = await this.pokemonService.updatePokemon(
        this.pokemon.id,
        this.formData as Pokemon
      );
      this.pokemonUpdated.emit(updatedPokemon);
      this.closeModal();
    } catch (error) {
      console.error('Error updating Pokemon:', error);
      this.validationErrors['general'] = 'Failed to update Pokemon. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }

  closeModal(): void {
    this.modalClosed.emit();
    this.validationErrors = {};
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }
} 