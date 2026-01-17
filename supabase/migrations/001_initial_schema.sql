-- Categories table: stores all game categories (editable via Supabase dashboard)
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Games table: stores active game sessions
CREATE TABLE games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  host_id UUID, -- Will be set after first player joins
  deck JSONB NOT NULL DEFAULT '[]',
  deck_index INTEGER NOT NULL DEFAULT 0,
  wild_equivalence JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players table: stores players in each game
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  card_stack JSONB NOT NULL DEFAULT '[]',  -- Stack of cards, index 0 is top/visible
  score INTEGER NOT NULL DEFAULT 0,
  is_host BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for host_id after players table exists
ALTER TABLE games ADD CONSTRAINT fk_host FOREIGN KEY (host_id) REFERENCES players(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_games_code ON games(code);
CREATE INDEX idx_players_game_id ON players(game_id);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow public read/write for game functionality
-- Categories: anyone can read
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);

-- Games: anyone can read and create, only game participants can update
CREATE POLICY "Games are viewable by everyone" ON games FOR SELECT USING (true);
CREATE POLICY "Anyone can create games" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update games" ON games FOR UPDATE USING (true);

-- Players: anyone can read and create players
CREATE POLICY "Players are viewable by everyone" ON players FOR SELECT USING (true);
CREATE POLICY "Anyone can create players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update players" ON players FOR UPDATE USING (true);

-- Enable realtime for games and players tables
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE players;

-- Seed some initial categories (you can add more via Supabase dashboard)
INSERT INTO categories (text) VALUES
  ('Dog breed'),
  ('Country in Europe'),
  ('Breakfast food'),
  ('Movie genre'),
  ('Something you find at the beach'),
  ('Musical instrument'),
  ('Tree'),
  ('Sport played with a ball'),
  ('Pizza topping'),
  ('Superhero'),
  ('Candy'),
  ('Something in your kitchen'),
  ('Board game'),
  ('Flower'),
  ('Ice cream flavor'),
  ('Car brand'),
  ('Zoo animal'),
  ('TV show'),
  ('Something you wear on your feet'),
  ('Holiday'),
  ('Fruit'),
  ('Vegetable'),
  ('Body of water'),
  ('US state'),
  ('Cheese'),
  ('Something in a bathroom'),
  ('Card game'),
  ('Bird'),
  ('Olympic sport'),
  ('Disney character'),
  ('Something you see at a wedding'),
  ('School subject'),
  ('Pasta shape'),
  ('Famous landmark'),
  ('Camping item'),
  ('Kitchen appliance'),
  ('Dance'),
  ('Magazine'),
  ('Breakfast cereal'),
  ('Farm animal'),
  ('Something you bring to a picnic'),
  ('Hat'),
  ('A dessert'),
  ('Smartphone app'),
  ('Fish'),
  ('Something in an office'),
  ('Baby name'),
  ('A winter activity'),
  ('Soup'),
  ('Something in a toolbox'),
  ('Nut'),
  ('Children''s book'),
  ('Weather'),
  ('Circus act'),
  ('Boat'),
  ('Something you pack for vacation'),
  ('Female scientist'),
  ('Cocktail'),
  ('Cleaning supply'),
  ('Snake'),
  ('Something at an amusement park'),
  ('Fairy tale'),
  ('Rap artist'),
  ('Something in a first aid kit'),
  ('Coffee drink'),
  ('Toy'),
  ('Famous inventor'),
  ('Potato dish'),
  ('Bug'),
  ('Bean'),
  ('Bread'),
  ('Planet'),
  ('Sandwich'),
  ('Halloween costume'),
  ('Something you find in a purse'),
  ('Craft supply'),
  ('Shoe'),
  ('Yoga pose'),
  ('Fabric'),
  ('Famous president'),
  ('Burger'),
  ('Mythical creature'),
  ('Famous comedian'),
  ('Winter sport'),
  ('Pizza'),
  ('Bollywood actress')