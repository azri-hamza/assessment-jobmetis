// src/app/components/pokemon-list.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PokemonService, Pokemon } from '../../services/pokemon.service';

@Component({
  selector: 'app-pokemon-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pokemon-list.component.html',
  styleUrls: ['./pokemon-list.component.scss']
})
export class PokemonListComponent implements OnInit {
  pokemons = signal<Pokemon[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  constructor(private readonly pokemonService: PokemonService) {}

  async ngOnInit(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);
      
      const data = await this.pokemonService.getAllPokemon();
      this.pokemons.set(data || []);
      
      console.log('Pokémon data loaded:', data); // Debug log
    } catch (err) {
      console.error('Error loading Pokémon:', err);
      this.error.set('Failed to load Pokémon data. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
