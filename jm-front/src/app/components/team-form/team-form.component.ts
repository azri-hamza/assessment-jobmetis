import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pokemon, PokemonService } from '../../services/pokemon.service';
import { TeamService } from '../../services/team.service';
import { PokemonTypeService } from '../../services/pokemon-type.service';

interface PokemonWithTypeName extends Omit<Pokemon, 'type'> {
  type: string;
  typeId: string;
}

@Component({
  selector: 'app-team-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './team-form.component.html',
  styleUrls: ['./team-form.component.scss']
})
export class TeamFormComponent implements OnInit {
  @Input() showModal: boolean = false;
  @Output() modalClosed = new EventEmitter<void>();
  @Output() teamCreated = new EventEmitter<any>();

  // Form data
  teamName: string = '';
  pokemonSearchTerm: string = '';
  selectedPokemon: PokemonWithTypeName[] = [];
  
  // Autocomplete data
  searchResults = signal<PokemonWithTypeName[]>([]);
  isSearching = signal<boolean>(false);
  showAutocomplete = signal<boolean>(false);
  
  // Form state
  isSubmitting = signal<boolean>(false);
  validationErrors: { [key: string]: string } = {};
  
  // Debounce timer
  private searchTimeout: any;

  constructor(
    private pokemonService: PokemonService,
    private teamService: TeamService,
    private pokemonTypeService: PokemonTypeService
  ) {}

  ngOnInit(): void {}

  async onSearchPokemon(): Promise<void> {
    if (!this.pokemonSearchTerm || this.pokemonSearchTerm.trim().length < 2) {
      this.searchResults.set([]);
      this.showAutocomplete.set(false);
      return;
    }

    try {
      this.isSearching.set(true);
      const results = await this.pokemonService.searchPokemonByName(this.pokemonSearchTerm);
      
      // Transform results to include type names
      const resultsWithTypeNames: PokemonWithTypeName[] = await Promise.all(
        results.map(async (pokemon) => {
          const typeName = await this.pokemonTypeService.getTypeNameById(pokemon.type);
          return {
            ...pokemon,
            type: typeName,
            typeId: pokemon.type
          };
        })
      );
      
      this.searchResults.set(resultsWithTypeNames);
      this.showAutocomplete.set(resultsWithTypeNames.length > 0);
    } catch (error) {
      console.error('Error searching Pokemon:', error);
      this.searchResults.set([]);
      this.showAutocomplete.set(false);
    } finally {
      this.isSearching.set(false);
    }
  }

  selectPokemon(pokemon: PokemonWithTypeName): void {
    if (this.selectedPokemon.length >= 6) {
      return; // Maximum 6 Pokemon per team
    }
    
    this.selectedPokemon.push(pokemon);
    this.pokemonSearchTerm = '';
    this.searchResults.set([]);
    this.showAutocomplete.set(false);
  }

  selectFirstPokemon(): void {
    const results = this.searchResults();
    if (results.length > 0) {
      this.selectPokemon(results[0]);
    }
  }

  removePokemon(index: number): void {
    this.selectedPokemon.splice(index, 1);
  }

  onSearchKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.selectFirstPokemon();
    } else if (event.key === 'Escape') {
      this.showAutocomplete.set(false);
    }
  }

  onSearchInput(): void {
    // Clear existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Set new timeout for debouncing
    this.searchTimeout = setTimeout(() => {
      this.onSearchPokemon();
    }, 300);
  }

  validateForm(): boolean {
    this.validationErrors = {};
    let isValid = true;

    // Team name validation
    if (!this.teamName || this.teamName.trim().length === 0) {
      this.validationErrors['teamName'] = 'Team name is required';
      isValid = false;
    } else if (this.teamName.trim().length < 3) {
      this.validationErrors['teamName'] = 'Team name must be at least 3 characters long';
      isValid = false;
    }

    // Pokemon validation
    if (this.selectedPokemon.length !== 6) {
      this.validationErrors['pokemon'] = 'You must select exactly 6 Pokémon for your team';
      isValid = false;
    }

    return isValid;
  }

  get canCreate(): boolean {
    return this.teamName.trim().length >= 3 && this.selectedPokemon.length === 6;
  }

  async onSubmit(): Promise<void> {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting.set(true);
    try {
      const pokemonIds = this.selectedPokemon.map(p => p.id);
      const newTeam = await this.teamService.createTeam(this.teamName.trim(), pokemonIds);
      
      this.teamCreated.emit(newTeam);
      this.closeModal();
      this.resetForm();
    } catch (error) {
      console.error('Error creating team:', error);
      this.validationErrors['general'] = 'Failed to create team. Please try again.';
    } finally {
      this.isSubmitting.set(false);
    }
  }

  closeModal(): void {
    this.modalClosed.emit();
    this.showAutocomplete.set(false);
  }

  resetForm(): void {
    this.teamName = '';
    this.pokemonSearchTerm = '';
    this.selectedPokemon = [];
    this.searchResults.set([]);
    this.showAutocomplete.set(false);
    this.validationErrors = {};
    
    // Clear any pending search timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }
}
