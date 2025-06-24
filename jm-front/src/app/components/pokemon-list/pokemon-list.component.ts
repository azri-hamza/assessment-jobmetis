// src/app/components/pokemon-list.component.ts
import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PokemonService } from '../../services/pokemon.service';

@Component({
  selector: 'app-pokemon-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pokemon-list.component.html',
  styleUrls: ['./pokemon-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PokemonListComponent implements OnInit {
  pokemons: any[] = [];

  constructor(private readonly pokemonService: PokemonService) {}

  async ngOnInit(): Promise<void> {
    this.pokemons = await this.pokemonService.getAllPokemon();
  }
}
