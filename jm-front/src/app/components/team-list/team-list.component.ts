import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Team, TeamService } from '../../services/team.service';
import { PokemonTypeService } from '../../services/pokemon-type.service';
import { TeamFormComponent } from '../team-form/team-form.component';

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
  selector: 'app-team-list',
  standalone: true,
  imports: [CommonModule, TeamFormComponent],
  templateUrl: './team-list.component.html',
  styleUrls: ['./team-list.component.scss']
})
export class TeamListComponent implements OnInit {
  teams = signal<TeamWithTypeNames[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  
  // Modal state
  showCreateModal = signal<boolean>(false);

  constructor(
    private readonly teamService: TeamService,
    private readonly pokemonTypeService: PokemonTypeService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadTeams();
  }

  async loadTeams(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);
      
      const data = await this.teamService.getAllTeams();
      
      // Transform team data to include Pokemon type names
      const teamsWithTypeNames: TeamWithTypeNames[] = await Promise.all(
        (data || []).map(async (team) => {
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
      
      this.teams.set(teamsWithTypeNames);
      
      console.log('Teams data loaded:', teamsWithTypeNames);
    } catch (err) {
      console.error('Error loading teams:', err);
      this.error.set('Failed to load teams data. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async retry(): Promise<void> {
    await this.loadTeams();
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  async onTeamCreated(newTeam: Team): Promise<void> {
    console.log('New team created:', newTeam);
    // Reload teams to include the new one
    await this.loadTeams();
  }
} 