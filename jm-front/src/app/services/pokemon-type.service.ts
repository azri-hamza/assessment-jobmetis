import { Injectable } from '@angular/core';
import { supabase } from '../supabase.client';

export interface PokemonType {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class PokemonTypeService {
  async getAllPokemonTypes(): Promise<PokemonType[]> {
    try {
      const { data, error } = await supabase
        .from('pokemon_type')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Supabase error fetching Pokemon types:', error);
        throw new Error(`Failed to fetch Pokémon types: ${error.message}`);
      }

      console.log('Pokemon types fetched successfully:', data);
      return data as PokemonType[];
      
    } catch (error) {
      console.error('Service error fetching Pokemon types:', error);
      throw error;
    }
  }

  async getTypeNameById(typeId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('pokemon_type')
        .select('name')
        .eq('id', typeId)
        .single();

      if (error) {
        console.error('Supabase error fetching type name:', error);
        return 'Unknown';
      }

      return data?.name || 'Unknown';
      
    } catch (error) {
      console.error('Service error fetching type name:', error);
      return 'Unknown';
    }
  }
} 