import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Team, TeamService } from '../../services/team.service';
import { BattleService, BattleResult, BattleRound, BattlePokemon } from '../../services/battle.service';
import { PokemonTypeService } from '../../services/pokemon-type.service';

interface TeamWithTypeNames extends Omit<Team, 'pokemon'> {
  pokemon: Array<{
    id: number;
    name: string;
    image: string;
    power: number;
    life: number;
    type: string;
    typeId: string;
  }>;
}

@Component({
  selector: 'app-battle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './battle.component.html',
  styleUrls: ['./battle.component.scss']
})
export class BattleComponent implements OnInit {
  // Available teams
  availableTeams = signal<TeamWithTypeNames[]>([]);
  
  // Selected teams for battle
  selectedTeam1 = signal<TeamWithTypeNames | null>(null);
  selectedTeam2 = signal<TeamWithTypeNames | null>(null);
  
  // Battle state
  battleResult = signal<BattleResult | null>(null);
  currentRoundIndex = signal<number>(0);
  isBattling = signal<boolean>(false);
  battleCompleted = signal<boolean>(false);
  
  // UI state
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  constructor(
    private teamService: TeamService,
    private battleService: BattleService,
    private pokemonTypeService: PokemonTypeService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadTeams();
  }

  async loadTeams(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);
      
      const teams = await this.teamService.getAllTeams();
      
      // Transform team data to include Pokemon type names
      const teamsWithTypeNames: TeamWithTypeNames[] = await Promise.all(
        teams.map(async (team) => {
          const pokemonWithTypeNames = await Promise.all(
            team.pokemon.map(async (pokemon) => {
              const typeName = await this.pokemonTypeService.getTypeNameById(pokemon.type);
              return {
                ...pokemon,
                type: typeName,
                typeId: pokemon.type
              };
            })
          );
          
          return {
            ...team,
            pokemon: pokemonWithTypeNames
          };
        })
      );
      
      this.availableTeams.set(teamsWithTypeNames);
      
    } catch (err) {
      console.error('Error loading teams:', err);
      this.error.set('Failed to load teams. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  selectTeam1(team: TeamWithTypeNames): void {
    this.selectedTeam1.set(team);
    this.resetBattle();
  }

  selectTeam2(team: TeamWithTypeNames): void {
    this.selectedTeam2.set(team);
    this.resetBattle();
  }

  async startBattle(): Promise<void> {
    const team1 = this.selectedTeam1();
    const team2 = this.selectedTeam2();
    
    if (!team1 || !team2) {
      this.error.set('Please select both teams to start the battle.');
      return;
    }

    if (team1.id === team2.id) {
      this.error.set('Please select two different teams for the battle.');
      return;
    }

    try {
      this.isBattling.set(true);
      this.error.set(null);
      
      // Convert teams back to original format for battle service
      const battleTeam1: Team = {
        ...team1,
        pokemon: team1.pokemon.map(p => ({
          ...p,
          type: p.typeId
        }))
      };
      
      const battleTeam2: Team = {
        ...team2,
        pokemon: team2.pokemon.map(p => ({
          ...p,
          type: p.typeId
        }))
      };

      const result = await this.battleService.simulateBattle(battleTeam1, battleTeam2);
      this.battleResult.set(result);
      this.currentRoundIndex.set(0);
      // Check if battle should be completed immediately (single round battle)
      this.battleCompleted.set(result.rounds.length === 1);
      
    } catch (err) {
      console.error('Error during battle:', err);
      this.error.set('An error occurred during the battle. Please try again.');
    } finally {
      this.isBattling.set(false);
    }
  }

  nextRound(): void {
    const result = this.battleResult();
    if (!result) return;
    
    const currentIndex = this.currentRoundIndex();
    if (currentIndex < result.rounds.length - 1) {
      this.currentRoundIndex.set(currentIndex + 1);
    }
    
    // Always check if we're at the last round to show battle completion
    if (this.currentRoundIndex() === result.rounds.length - 1) {
      this.battleCompleted.set(true);
    }
  }

  previousRound(): void {
    const result = this.battleResult();
    if (!result) return;
    
    const currentIndex = this.currentRoundIndex();
    if (currentIndex > 0) {
      this.currentRoundIndex.set(currentIndex - 1);
    }
    
    // Update battle completion status based on current round
    this.battleCompleted.set(this.currentRoundIndex() === result.rounds.length - 1);
  }

  resetBattle(): void {
    this.battleResult.set(null);
    this.currentRoundIndex.set(0);
    this.battleCompleted.set(false);
    this.error.set(null);
  }

  newBattle(): void {
    this.selectedTeam1.set(null);
    this.selectedTeam2.set(null);
    this.resetBattle();
  }

  getCurrentRound(): BattleRound | null {
    const result = this.battleResult();
    if (!result) return null;
    
    const index = this.currentRoundIndex();
    return result.rounds[index] || null;
  }

  canGoNext(): boolean {
    const result = this.battleResult();
    if (!result) return false;
    
    return this.currentRoundIndex() < result.rounds.length - 1;
  }

  canGoPrevious(): boolean {
    return this.currentRoundIndex() > 0;
  }

  getLifePercentage(currentLife: number, maxLife: number): number {
    return Math.max(0, (currentLife / maxLife) * 100);
  }

  getLifeBarClass(percentage: number): string {
    if (percentage > 60) return 'bg-success';
    if (percentage > 30) return 'bg-warning';
    return 'bg-danger';
  }

  // Make Math available in template
  Math = Math;

  // Check if a Pokemon is currently active in the battle
  isPokemonActive(pokemon: any, teamSide: 'team1' | 'team2', pokemonIndex: number): boolean {
    const result = this.battleResult();
    const currentRound = this.getCurrentRound();
    if (!result || !currentRound) return false;

    // Get the currently active Pokemon position for this team
    const activePosition = this.getActivePokemonPosition(teamSide);
    return activePosition === pokemonIndex;
  }

  // Get the current active Pokemon position for a team
  private getActivePokemonPosition(teamSide: 'team1' | 'team2'): number {
    const result = this.battleResult();
    if (!result) return 0;

    const defeatedPositions = this.getDefeatedPokemonPositions(teamSide);
    const teamPokemon = teamSide === 'team1' ? result.team1.pokemon : result.team2.pokemon;
    
    // Find the first non-defeated Pokemon position
    for (let i = 0; i < teamPokemon.length; i++) {
      if (!defeatedPositions.includes(i)) {
        return i;
      }
    }
    
    return 0; // Fallback
  }

  // Check if a Pokemon is defeated based on current battle state
  isPokemonDefeated(pokemon: any, teamSide: 'team1' | 'team2', pokemonIndex: number): boolean {
    const result = this.battleResult();
    if (!result) return false;
    
    // Track which Pokemon positions have been defeated by simulating the battle progression
    const defeatedPositions = this.getDefeatedPokemonPositions(teamSide);
    return defeatedPositions.includes(pokemonIndex);
  }

  // Get list of defeated Pokemon positions for a team up to current round
  private getDefeatedPokemonPositions(teamSide: 'team1' | 'team2'): number[] {
    const result = this.battleResult();
    if (!result) return [];
    
    const defeatedPositions: number[] = [];
    const teamPokemon = teamSide === 'team1' ? result.team1.pokemon : result.team2.pokemon;
    let currentActiveIndex = 0; // Track which Pokemon is currently active
    
    const currentRoundIndex = this.currentRoundIndex();
    
    // Go through each round up to current round
    for (let roundIndex = 0; roundIndex <= currentRoundIndex; roundIndex++) {
      const round = result.rounds[roundIndex];
      if (!round) continue;
      
      // Skip to next available Pokemon if current one is already defeated
      while (currentActiveIndex < teamPokemon.length && defeatedPositions.includes(currentActiveIndex)) {
        currentActiveIndex++;
      }
      
      // Check if the active Pokemon was defeated in this round
      if (teamSide === 'team1' && round.pokemon1LifeAfter <= 0) {
        if (currentActiveIndex < teamPokemon.length && !defeatedPositions.includes(currentActiveIndex)) {
          defeatedPositions.push(currentActiveIndex);
          currentActiveIndex++; // Move to next Pokemon
        }
      } else if (teamSide === 'team2' && round.pokemon2LifeAfter <= 0) {
        if (currentActiveIndex < teamPokemon.length && !defeatedPositions.includes(currentActiveIndex)) {
          defeatedPositions.push(currentActiveIndex);
          currentActiveIndex++; // Move to next Pokemon
        }
      }
    }
    
    return defeatedPositions;
  }
} 