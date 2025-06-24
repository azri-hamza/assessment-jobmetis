# Pokémon Battle Application

This is a Pokémon battle application built with Angular 18 and Bootstrap 5. The application allows users to manage Pokémon, create teams, and simulate battles between teams.

## Features

- **Pokémon Management**: View and update Pokémon information (name, type, power, life, image)
- **Team Management**: Create teams of 6 Pokémon from your collection
- **Battle Simulation**: Simulate battles between two teams with:
  - Round-by-round battle progression
  - Type effectiveness calculations
  - Visual battle interface with life bars
  - Team overview showing active Pokémon
  - Battle results and winner declaration

## Battle Rules

- Each battle is 1 vs 1 combat between Pokémon from each team
- Battles are divided into rounds with life calculation after each round
- Life calculation: `remaining_life = current_life - opponent_power * type_factor`
- Type effectiveness is based on the weakness chart (Fire vs Water, etc.)
- Defeated Pokémon are switched out for the next available team member
- The team with remaining Pokémon wins the battle

## Setup and Installation

### Prerequisites
- Node.js (version 18 or higher)
- npm (comes with Node.js)
- Angular CLI: `npm install -g @angular/cli`

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/azri-hamza/assessment-jobmetis.git
   cd assessment-jobmetis/jm-front
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   The application uses Supabase as the backend service. You'll need to configure the environment variables:
   
   - Create a `environment.ts` file in the `jm-front/src/environments` directory (if not already present)
   - The sensitive data (Supabase URL and API keys) will be sent via email
   - Required environment variables:
     - `SUPABASE_URL`: Your Supabase project URL
     - `SUPABASE_ANON_KEY`: Your Supabase anonymous key

   **Environment File Structure:**
   ```typescript
   // jm-front/src/environments/environment.ts
   export const environment = {
     production: false,
     supabaseUrl: 'YOUR_SUPABASE_URL_HERE',
     supabaseKey: 'YOUR_SUPABASE_ANON_KEY_HERE'
   };
   ```

   **Note**: The actual sensitive values will be provided separately via email for security purposes.

4. **Run the application**
   ```bash
   npm start
   # or alternatively
   ng serve
   ```

5. **Access the application**
   
   Open your browser and navigate to `http://localhost:4200`

## Technical Decisions and Architecture

### Data Structure and Schema Design

**Schema Design Rationale:**

1. **Normalized Structure**: Separate tables for `pokemon_type`, `pokemon`, `weakness`, `team`, and `team_pokemon` to eliminate data redundancy and maintain consistency

2. **UUID Primary Keys**: Better for distributed systems and security (no sequential ID guessing)

3. **Constraint Validation**: Database-level constraints ensure data integrity (power/life ranges, team size limits)

4. **Weakness Table**: Flexible design allowing for complex type relationships and custom effectiveness factors

## Database Schema and PostgreSQL Script

### 1. Database Schema

```sql
-- Create pokemon_type table
CREATE TABLE pokemon_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE
);

-- Create pokemon table
CREATE TABLE pokemon (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type UUID NOT NULL REFERENCES pokemon_type(id),
    image TEXT,
    power INTEGER NOT NULL CHECK (power >= 10 AND power <= 100),
    life INTEGER NOT NULL CHECK (life >= 10 AND life <= 100)
);

-- Create weakness table
CREATE TABLE weakness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type1 UUID NOT NULL REFERENCES pokemon_type(id),
    type2 UUID NOT NULL REFERENCES pokemon_type(id),
    factor FLOAT NOT NULL
);

-- Create team table for Requirement 4
CREATE TABLE team (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team_pokemon table to store 6 pokemon per team
CREATE TABLE team_pokemon (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE,
    pokemon_id UUID NOT NULL REFERENCES pokemon(id),
    position INTEGER NOT NULL CHECK (position >= 1 AND position <= 6),
    UNIQUE(team_id, position)
);
```

### 2. PostgreSQL Script

```sql
-- Requirement 5: PostgreSQL Functions

-- Function 1: Insert a team of 6 Pokémon
CREATE OR REPLACE FUNCTION insert_pokemon_team(
    team_name TEXT,
    pokemon_ids UUID[]
)
RETURNS UUID AS $$
DECLARE
    new_team_id UUID;
    i INTEGER;
BEGIN
    -- Validate that exactly 6 pokemon are provided
    IF array_length(pokemon_ids, 1) != 6 THEN
        RAISE EXCEPTION 'A team must have exactly 6 Pokemon. Provided: %', array_length(pokemon_ids, 1);
    END IF;
    
    -- Validate that all provided pokemon IDs exist
    FOR i IN 1..6 LOOP
        IF NOT EXISTS (SELECT 1 FROM pokemon WHERE id = pokemon_ids[i]) THEN
            RAISE EXCEPTION 'Pokemon with ID % does not exist', pokemon_ids[i];
        END IF;
    END LOOP;
    
    -- Create the team
    INSERT INTO team (name) VALUES (team_name) RETURNING id INTO new_team_id;
    
    -- Insert each pokemon into the team with their position
    FOR i IN 1..6 LOOP
        INSERT INTO team_pokemon (team_id, pokemon_id, position)
        VALUES (new_team_id, pokemon_ids[i], i);
    END LOOP;
    
    RETURN new_team_id;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Get all teams ordered by team power (sum of each Pokémon's power)
CREATE OR REPLACE FUNCTION get_teams_by_power()
RETURNS TABLE(
    team_id UUID,
    team_name TEXT,
    total_power BIGINT,
    pokemon_count BIGINT,
    pokemon_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as team_id,
        t.name as team_name,
        SUM(p.power) as total_power,
        COUNT(tp.pokemon_id) as pokemon_count,
        -- Include detailed pokemon info as JSON
        jsonb_agg(
            jsonb_build_object(
                'position', tp.position,
                'pokemon_id', p.id,
                'pokemon_name', p.name,
                'power', p.power,
                'life', p.life,
                'type_name', pt.name,
                'image', p.image
            ) ORDER BY tp.position
        ) as pokemon_details,
        t.created_at
    FROM team t
    JOIN team_pokemon tp ON t.id = tp.team_id
    JOIN pokemon p ON tp.pokemon_id = p.id
    JOIN pokemon_type pt ON p.type = pt.id
    GROUP BY t.id, t.name, t.created_at
    HAVING COUNT(tp.pokemon_id) = 6  -- Ensure only complete teams are returned
    ORDER BY SUM(p.power) DESC;  -- Ordered by team power (highest first)
END;
$$ LANGUAGE plpgsql;

-- Optional: Helper function to get pokemon IDs by name (makes testing easier)
CREATE OR REPLACE FUNCTION get_pokemon_ids_by_names(pokemon_names TEXT[])
RETURNS UUID[] AS $$
DECLARE
    result_ids UUID[];
    pokemon_name TEXT;
    pokemon_id UUID;
BEGIN
    result_ids := ARRAY[]::UUID[];
    
    FOREACH pokemon_name IN ARRAY pokemon_names
    LOOP
        SELECT id INTO pokemon_id 
        FROM pokemon 
        WHERE LOWER(name) = LOWER(pokemon_name)
        LIMIT 1;
        
        IF pokemon_id IS NULL THEN
            RAISE EXCEPTION 'Pokemon with name "%" not found', pokemon_name;
        END IF;
        
        result_ids := array_append(result_ids, pokemon_id);
    END LOOP;
    
    RETURN result_ids;
END;
$$ LANGUAGE plpgsql;
```

