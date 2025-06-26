import { Injectable } from '@angular/core';
import { supabase } from '../supabase.client';
import { Pokemon } from './pokemon.service';
import { Team } from './team.service';
import { PokemonTypeService } from './pokemon-type.service';

export interface BattlePokemon extends Pokemon {
  currentLife: number;
  isDefeated: boolean;
  originalLife: number;
  typeId: string;
}

export interface BattleRound {
  roundNumber: number;
  pokemon1: BattlePokemon;
  pokemon2: BattlePokemon;
  pokemon1Damage: number;
  pokemon2Damage: number;
  pokemon1LifeAfter: number;
  pokemon2LifeAfter: number;
  pokemon1TypeFactor: number;
  pokemon2TypeFactor: number;
  winner: 'pokemon1' | 'pokemon2' | 'draw';
}

export interface BattleResult {
  team1: Team;
  team2: Team;
  rounds: BattleRound[];
  winner: 'team1' | 'team2';
  winnerTeam: Team;
}

@Injectable({
  providedIn: 'root'
})
export class BattleService {
  
  constructor(private pokemonTypeService: PokemonTypeService) {}
  
  async getTypeEffectiveness(attackingTypeId: string, defendingTypeId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('weakness')
        .select('factor')
        .eq('type1', attackingTypeId)
        .eq('type2', defendingTypeId)
        .single();

      if (error) {
        console.warn(`No weakness data found for ${attackingTypeId} vs ${defendingTypeId}, using 1.0`);
        return 1.0;
      }

      return data?.factor || 1.0;
    } catch (error) {
      console.error('Error fetching type effectiveness:', error);
      return 1.0; // Default effectiveness
    }
  }

  private async createBattlePokemon(pokemon: Pokemon): Promise<BattlePokemon> {
    const typeId = await this.pokemonTypeService.getTypeIdByName(pokemon.type);
    return {
      ...pokemon,
      currentLife: pokemon.life,
      isDefeated: false,
      originalLife: pokemon.life,
      typeId: typeId
    };
  }

  async simulateBattle(team1: Team, team2: Team): Promise<BattleResult> {
    // Create battle copies of Pokemon with current life tracking
    const battleTeam1: BattlePokemon[] = await Promise.all(team1.pokemon.map(p => this.createBattlePokemon(p)));
    const battleTeam2: BattlePokemon[] = await Promise.all(team2.pokemon.map(p => this.createBattlePokemon(p)));

    const rounds: BattleRound[] = [];
    let roundNumber = 1;
    
    // Current active Pokemon indices
    let team1Index = 0;
    let team2Index = 0;

    while (team1Index < battleTeam1.length && team2Index < battleTeam2.length) {
      // Find next active Pokemon for team1
      while (team1Index < battleTeam1.length && battleTeam1[team1Index].isDefeated) {
        team1Index++;
      }
      
      // Find next active Pokemon for team2
      while (team2Index < battleTeam2.length && battleTeam2[team2Index].isDefeated) {
        team2Index++;
      }
      
      // Check if either team has no more active Pokemon
      if (team1Index >= battleTeam1.length || team2Index >= battleTeam2.length) {
        break;
      }

      const pokemon1 = battleTeam1[team1Index];
      const pokemon2 = battleTeam2[team2Index];

      // Get type effectiveness factors
      const pokemon1TypeFactor = await this.getTypeEffectiveness(pokemon1.typeId, pokemon2.typeId);
      const pokemon2TypeFactor = await this.getTypeEffectiveness(pokemon2.typeId, pokemon1.typeId);

      // Calculate damage
      const pokemon1Damage = pokemon2.power * pokemon2TypeFactor;
      const pokemon2Damage = pokemon1.power * pokemon1TypeFactor;

      // Calculate life after round
      const pokemon1LifeAfter = pokemon1.currentLife - pokemon1Damage;
      const pokemon2LifeAfter = pokemon2.currentLife - pokemon2Damage;

      // Create round result
      const round: BattleRound = {
        roundNumber,
        pokemon1: { ...pokemon1 },
        pokemon2: { ...pokemon2 },
        pokemon1Damage,
        pokemon2Damage,
        pokemon1LifeAfter,
        pokemon2LifeAfter,
        pokemon1TypeFactor,
        pokemon2TypeFactor,
        winner: pokemon1LifeAfter <= 0 && pokemon2LifeAfter <= 0 ? 'draw' :
                pokemon1LifeAfter <= 0 ? 'pokemon2' :
                pokemon2LifeAfter <= 0 ? 'pokemon1' : 'draw'
      };

      rounds.push(round);

      // Update Pokemon life and defeat status
      pokemon1.currentLife = Math.max(0, pokemon1LifeAfter);
      pokemon2.currentLife = Math.max(0, pokemon2LifeAfter);

      if (pokemon1.currentLife <= 0) {
        pokemon1.isDefeated = true;
        team1Index++;
      }
      if (pokemon2.currentLife <= 0) {
        pokemon2.isDefeated = true;
        team2Index++;
      }

      roundNumber++;

      // Safety check to prevent infinite loops
      if (roundNumber > 100) {
        console.warn('Battle exceeded 100 rounds, ending battle');
        break;
      }
    }

    // Determine winner based on which team has remaining Pokemon
    const team1RemainingPokemon = battleTeam1.filter(p => !p.isDefeated);
    const team2RemainingPokemon = battleTeam2.filter(p => !p.isDefeated);

    let winner: 'team1' | 'team2';
    let winnerTeam: Team;

    if (team1RemainingPokemon.length > 0 && team2RemainingPokemon.length === 0) {
      winner = 'team1';
      winnerTeam = team1;
    } else if (team2RemainingPokemon.length > 0 && team1RemainingPokemon.length === 0) {
      winner = 'team2';
      winnerTeam = team2;
    } else if (team1RemainingPokemon.length > team2RemainingPokemon.length) {
      winner = 'team1';
      winnerTeam = team1;
    } else if (team2RemainingPokemon.length > team1RemainingPokemon.length) {
      winner = 'team2';
      winnerTeam = team2;
    } else {
      // If equal number of remaining Pokemon, determine by total remaining life
      const team1RemainingLife = team1RemainingPokemon.reduce((sum, p) => sum + p.currentLife, 0);
      const team2RemainingLife = team2RemainingPokemon.reduce((sum, p) => sum + p.currentLife, 0);
      
      if (team1RemainingLife >= team2RemainingLife) {
        winner = 'team1';
        winnerTeam = team1;
      } else {
        winner = 'team2';
        winnerTeam = team2;
      }
    }

    return {
      team1,
      team2,
      rounds,
      winner,
      winnerTeam
    };
  }

  // Mock weakness data for fallback
  private getMockTypeEffectiveness(attackingType: string, defendingType: string): number {
    const weaknessChart: { [key: string]: { [key: string]: number } } = {
      '1': { // Fire
        '1': 1.0, // vs Fire
        '2': 0.5, // vs Water
        '3': 2.0  // vs Grass
      },
      '2': { // Water  
        '1': 2.0, // vs Fire
        '2': 1.0, // vs Water
        '3': 0.5  // vs Grass
      },
      '3': { // Grass
        '1': 0.5, // vs Fire
        '2': 2.0, // vs Water
        '3': 1.0  // vs Grass
      }
    };

    return weaknessChart[attackingType]?.[defendingType] || 1.0;
  }
} 