// src/app/services/pokemon.service.ts
import { Injectable } from '@angular/core';
import { supabase } from '../supabase.client';

@Injectable({
  providedIn: 'root'
})
export class PokemonService {
  async getAllPokemon() {
    const { data, error } = await supabase
      .from('pokemon')
      .select(`id, name, image, power, life, type`);

    if (error) {
      console.error('Error fetching Pokémon:', error);
      throw error;
    }

    return data;
  }
}
