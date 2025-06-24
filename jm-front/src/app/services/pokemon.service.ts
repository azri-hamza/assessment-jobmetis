// src/app/services/pokemon.service.ts
import { Injectable } from '@angular/core';
import { supabase } from '../supabase.client';

export interface Pokemon {
  id: number;
  name: string;
  image: string;
  power: number;
  life: number;
  type: string;
}

@Injectable({
  providedIn: 'root'
})
export class PokemonService {
  async getAllPokemon(): Promise<Pokemon[]> {
    try {
      
      const { data, error } = await supabase
        .from('pokemon')
        .select('id, name, image, power, life, type')
        .order('id');

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Failed to fetch Pokémon: ${error.message}`);
      }

      console.log('Supabase response:', data);
      return data as Pokemon[];
      
    } catch (error) {
      console.error('Service error:', error);
      throw error;
    }
  }

  async updatePokemon(id: number, pokemonData: Partial<Pokemon>): Promise<Pokemon> {
    try {
      const { data, error } = await supabase
        .from('pokemon')
        .update({
          name: pokemonData.name,
          image: pokemonData.image,
          power: pokemonData.power,
          life: pokemonData.life,
          type: pokemonData.type
        })
        .eq('id', id)
        .select('id, name, image, power, life, type')
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        throw new Error(`Failed to update Pokémon: ${error.message}`);
      }

      console.log('Pokemon updated successfully:', data);
      return data as Pokemon;
      
    } catch (error) {
      console.error('Service update error:', error);
      throw error;
    }
  }
}
