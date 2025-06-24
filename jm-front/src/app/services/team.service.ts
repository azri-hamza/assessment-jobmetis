import { Injectable } from '@angular/core';
import { supabase } from '../supabase.client';
import { Pokemon } from './pokemon.service';

export interface Team {
  id: string; // UUID
  name: string;
  power: number; // Calculated from Pokemon
  pokemon: Pokemon[];
}

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  async getAllTeams(): Promise<Team[]> {
    try {
      // Fetch teams from the team table (without power column)
      const { data: teamsData, error: teamsError } = await supabase
        .from('team')
        .select('id, name, created_at')
        .order('name');

      if (teamsError) {
        console.error('Supabase error fetching teams:', teamsError);
        
        // If table doesn't exist, return mock data
        if (teamsError.message.includes('does not exist')) {
          console.log('Teams table not found, returning mock data');
          return this.getMockTeams();
        }
        
        throw new Error(`Failed to fetch teams: ${teamsError.message}`);
      }

      console.log('Teams fetched successfully:', teamsData);

      // Now fetch Pokemon for each team
      const teams: Team[] = [];
      
      for (const team of teamsData || []) {
        // Get team Pokemon from team_pokemon junction table with correct foreign key names
        const { data: teamPokemonData, error: teamPokemonError } = await supabase
          .from('team_pokemon')
          .select(`
            pokemon_id,
            position,
            pokemon (
              id,
              name,
              image,
              power,
              life,
              type
            )
          `)
          .eq('team_id', team.id)
          .order('position');

        let pokemon: Pokemon[] = [];
        let totalPower = 0;
        
        if (teamPokemonError) {
          console.warn(`Could not fetch Pokemon for team ${team.id}:`, teamPokemonError);
        } else {
          pokemon = (teamPokemonData || [])
            .map((tp: any) => tp.pokemon)
            .filter((p: any) => p !== null)
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              image: p.image,
              power: p.power,
              life: p.life,
              type: p.type
            })) as Pokemon[];
          
          // Calculate total power from Pokemon
          totalPower = pokemon.reduce((sum, p) => sum + p.power, 0);
        }

        teams.push({
          id: team.id,
          name: team.name,
          power: totalPower,
          pokemon: pokemon
        });
      }

      return teams;
      
    } catch (error) {
      console.error('Service error:', error);
      
      // Fallback to mock data if there's any error
      console.log('Falling back to mock data due to error');
      return this.getMockTeams();
    }
  }

  private getMockTeams(): Team[] {
    return [
      {
        id: "1",
        name: "Fire Squad",
        power: 285,
        pokemon: [
          {
            id: 1,
            name: "Charizard",
            image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png",
            power: 95,
            life: 78,
            type: "1" // Fire
          },
          {
            id: 2,
            name: "Arcanine",
            image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/59.png",
            power: 90,
            life: 90,
            type: "1" // Fire
          },
          {
            id: 3,
            name: "Rapidash",
            image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/78.png",
            power: 100,
            life: 65,
            type: "1" // Fire
          }
        ]
      },
      {
        id: "2",
        name: "Water Warriors",
        power: 270,
        pokemon: [
          {
            id: 4,
            name: "Blastoise",
            image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png",
            power: 85,
            life: 79,
            type: "2" // Water
          },
          {
            id: 5,
            name: "Gyarados",
            image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/130.png",
            power: 125,
            life: 95,
            type: "2" // Water
          },
          {
            id: 6,
            name: "Lapras",
            image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/131.png",
            power: 60,
            life: 130,
            type: "2" // Water
          }
        ]
      },
      {
        id: "3",
        name: "Electric Storm",
        power: 240,
        pokemon: [
          {
            id: 7,
            name: "Pikachu",
            image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
            power: 55,
            life: 35,
            type: "4" // Electric
          },
          {
            id: 8,
            name: "Raichu",
            image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/26.png",
            power: 90,
            life: 60,
            type: "4" // Electric
          },
          {
            id: 9,
            name: "Zapdos",
            image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/145.png",
            power: 95,
            life: 90,
            type: "4" // Electric
          }
        ]
      }
    ];
  }
} 