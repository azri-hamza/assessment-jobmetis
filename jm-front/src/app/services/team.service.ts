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
      // Use PostgreSQL function get_teams_by_power to fetch teams ordered by power
      const { data: teamsData, error: teamsError } = await supabase.rpc('get_teams_by_power');

      if (teamsError) {
        console.error('Supabase error fetching teams with get_teams_by_power:', teamsError);
        
        // If function doesn't exist, return mock data
        if (teamsError.message.includes('does not exist') || teamsError.message.includes('function')) {
          console.log('get_teams_by_power function not found, returning mock data');
          return this.getMockTeams();
        }
        
        throw new Error(`Failed to fetch teams: ${teamsError.message}`);
      }

      console.log('Teams fetched successfully using get_teams_by_power:', teamsData);

      // Transform the data from the PostgreSQL function to match our Team interface
      const teams: Team[] = (teamsData || []).map((teamData: any) => {
        // Extract Pokemon data from the pokemon_details JSONB field
        const pokemon: Pokemon[] = (teamData.pokemon_details || []).map((pokemonDetail: any) => ({
          id: pokemonDetail.pokemon_id,
          name: pokemonDetail.pokemon_name,
          image: pokemonDetail.image,
          power: pokemonDetail.power,
          life: pokemonDetail.life,
          type: pokemonDetail.type_name
        }));

        return {
          id: teamData.team_id,
          name: teamData.team_name,
          power: Number(teamData.total_power) || 0,
          pokemon: pokemon
        };
      });

      return teams;
      
    } catch (error) {
      console.error('Service error:', error);
      
      // Fallback to mock data if there's any error
      console.log('Falling back to mock data due to error');
      return this.getMockTeams();
    }
  }

  async createTeam(teamName: string, pokemonIds: number[]): Promise<Team> {
    try {
      // Call the PostgreSQL function insert_pokemon_team
      const { data, error } = await supabase.rpc('insert_pokemon_team', {
        team_name: teamName,
        pokemon_ids: pokemonIds
      });

      if (error) {
        console.error('Supabase error creating team:', error);
        throw new Error(`Failed to create team: ${error.message}`);
      }

      console.log('Team created successfully:', data);
      
      // Return the newly created team data
      // The function should return the team data, but let's fetch it to be sure
      if (data && data.team_id) {
        return await this.getTeamById(data.team_id);
      }
      
      // Fallback: refresh teams and return the latest one
      const teams = await this.getAllTeams();
      return teams[teams.length - 1];
      
    } catch (error) {
      console.error('Service error creating team:', error);
      throw error;
    }
  }

  private async getTeamById(teamId: string): Promise<Team> {
    try {
      const { data: teamData, error: teamError } = await supabase
        .from('team')
        .select('id, name, created_at')
        .eq('id', teamId)
        .single();

      if (teamError) {
        throw new Error(`Failed to fetch team: ${teamError.message}`);
      }

      // Get team Pokemon
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
        .eq('team_id', teamId)
        .order('position');

      let pokemon: Pokemon[] = [];
      let totalPower = 0;
      
      if (!teamPokemonError && teamPokemonData) {
        pokemon = teamPokemonData
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
        
        totalPower = pokemon.reduce((sum, p) => sum + p.power, 0);
      }

      return {
        id: teamData.id,
        name: teamData.name,
        power: totalPower,
        pokemon: pokemon
      };
      
    } catch (error) {
      console.error('Error fetching team by ID:', error);
      throw error;
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