import { Routes } from '@angular/router';
import { PokemonListComponent } from './components/pokemon-list/pokemon-list.component';
import { TeamListComponent } from './components/team-list/team-list.component';
import { BattleComponent } from './components/battle/battle.component';

export const routes: Routes = [
  { path: '', redirectTo: '/pokemon', pathMatch: 'full' },
  { path: 'pokemon', component: PokemonListComponent },
  { path: 'teams', component: TeamListComponent },
  { path: 'battle', component: BattleComponent }
];
