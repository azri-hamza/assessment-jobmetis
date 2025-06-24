// src/app/components/pokemon-list.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PokemonService, Pokemon } from '../../services/pokemon.service';
import { PokemonTypeService } from '../../services/pokemon-type.service';
import { PokemonUpdateFormComponent } from '../pokemon-update-form/pokemon-update-form.component';

interface PokemonWithTypeName extends Omit<Pokemon, 'type'> {
  type: string;
  typeId: string;
}

@Component({
  selector: 'app-pokemon-list',
  standalone: true,
  imports: [CommonModule, PokemonUpdateFormComponent],
  templateUrl: './pokemon-list.component.html',
  styleUrls: ['./pokemon-list.component.scss']
})
export class PokemonListComponent implements OnInit {
  pokemons = signal<PokemonWithTypeName[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  
  // Modal state
  showUpdateModal = signal<boolean>(false);
  selectedPokemon = signal<Pokemon | null>(null);

  constructor(
    private readonly pokemonService: PokemonService,
    private readonly pokemonTypeService: PokemonTypeService
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);
      
      const data = await this.pokemonService.getAllPokemon();
      
      // Transform Pokemon data to include type names
      const pokemonsWithTypeNames: PokemonWithTypeName[] = await Promise.all(
        (data || []).map(async (pokemon) => {
          const typeName = await this.pokemonTypeService.getTypeNameById(pokemon.type);
          return {
            ...pokemon,
            type: typeName,
            typeId: pokemon.type
          };
        })
      );
      
      this.pokemons.set(pokemonsWithTypeNames);
      
      console.log('Pokémon data loaded:', pokemonsWithTypeNames); // Debug log
    } catch (err) {
      console.error('Error loading Pokémon:', err);
      this.error.set('Failed to load Pokémon data. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  openUpdateModal(pokemon: PokemonWithTypeName): void {
    // Convert back to Pokemon format with type ID for the form
    const pokemonForForm: Pokemon = {
      ...pokemon,
      type: pokemon.typeId
    };
    this.selectedPokemon.set(pokemonForForm);
    this.showUpdateModal.set(true);
  }

  closeUpdateModal(): void {
    this.showUpdateModal.set(false);
    this.selectedPokemon.set(null);
  }

  async onPokemonUpdated(updatedPokemon: Pokemon): Promise<void> {
    const typeName = await this.pokemonTypeService.getTypeNameById(updatedPokemon.type);
    const pokemonWithTypeName: PokemonWithTypeName = {
      ...updatedPokemon,
      type: typeName,
      typeId: updatedPokemon.type
    };
    
    const currentPokemons = this.pokemons();
    const updatedPokemons = currentPokemons.map(p => 
      p.id === updatedPokemon.id ? pokemonWithTypeName : p
    );
    this.pokemons.set(updatedPokemons);
  }
}
