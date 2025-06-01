#!/usr/bin/env tsx

/**
 * Demo Board Seeding Script
 * Creates high-quality bingo boards across different game categories
 * for immediate multiplayer testing and user onboarding
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database-generated';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Demo board content data
const DEMO_BOARDS = [
  {
    title: 'World of Warcraft: Classic Nostalgia',
    description:
      'Relive the golden age of Azeroth with iconic WoW moments and achievements',
    game_type: 'World of Warcraft' as const,
    difficulty: 'easy' as const,
    cells: [
      'Die to Hogger',
      'Get lost in Stranglethorn',
      'Run to Ironforge at level 1',
      'Fall off Thunder Bluff',
      'Forget to train skills',
      'Buy useless gear from vendor',
      'Get ganked in contested zone',
      'Accidentally delete an item',
      'Stand in fire during raid',
      'Train wrong weapon skill',
      'Ninja loot something',
      'Get mind controlled off cliff',
      'Hearth at wrong time',
      'FREE SPACE',
      'Pull entire dungeon by mistake',
      'Get scammed in trade',
      'Forget to repair gear',
      'Run wrong way in instance',
      'Aggro through wall',
      'Miss obvious quest giver',
      'Die to fall damage',
      'Attack wrong faction NPC',
      'Waste gold on mount training',
      'Get lost in Blackrock Depths',
      'Accidentally go AFK in PvP',
    ],
  },

  {
    title: 'Fortnite Victory Royale Speedrun',
    description: 'Fast-paced battle royale challenges for competitive players',
    game_type: 'Fortnite' as const,
    difficulty: 'medium' as const,
    cells: [
      'Land at Tilted Towers',
      'Get a Victory Royale',
      'Eliminate with pickaxe',
      'Find legendary weapon',
      'Build a sky base',
      'Win without taking damage',
      'Get 10+ eliminations',
      'Snipe someone 200m+',
      'Survive storm for 30 seconds',
      'Use a launch pad',
      'Eliminate with explosive',
      'Get supply drop',
      'Drive a vehicle',
      'Win solo squad game',
      'FREE SPACE',
      'Eliminate while dancing',
      'Get headshot elimination',
      'Use all shield types',
      'Win with gray weapons only',
      'Make top 3 in solos',
      'Eliminate streamer/content creator',
      'Build 1x1 box in 3 seconds',
      'Survive 15+ minutes',
      'Get trap elimination',
      'Win back-to-back games',
    ],
  },

  {
    title: 'Minecraft Survival Mastery',
    description: 'From punching trees to defeating the Ender Dragon',
    game_type: 'Minecraft' as const,
    difficulty: 'medium' as const,
    cells: [
      'Punch your first tree',
      'Craft a wooden pickaxe',
      'Mine your first diamonds',
      'Find a village',
      'Tame a wolf',
      'Build a house',
      'Create a farm',
      'Find the stronghold',
      'Enter the Nether',
      'Craft diamond armor',
      'Find a skeleton spawner',
      'Breed animals',
      'Make a bed',
      'Create enchanting table',
      'FREE SPACE',
      'Defeat the Ender Dragon',
      'Build a redstone contraption',
      'Find desert temple',
      'Craft a beacon',
      'Make a potion',
      'Defeat a raid',
      'Find ancient debris',
      'Build a castle',
      'Create automatic farm',
      'Reach the world height limit',
    ],
  },

  {
    title: 'Elden Ring Boss Rush Challenge',
    description: 'Face the most challenging bosses in the Lands Between',
    game_type: 'Elden Ring' as const,
    difficulty: 'expert' as const,
    cells: [
      'Defeat Margit',
      'Defeat Godrick',
      'Defeat Rennala',
      'Defeat Radahn',
      'Defeat Morgott',
      'Defeat Mohg',
      'Defeat Malenia',
      'Defeat Fire Giant',
      'Defeat Godskin Duo',
      'Defeat Maliketh',
      'Defeat Godfrey',
      'Defeat Radagon',
      'Defeat Elden Beast',
      'Die to fall damage',
      'FREE SPACE',
      'Get invaded and win',
      'Defeat crucible knight',
      'Find legendary weapon',
      'Defeat dragon',
      'Complete dungeon',
      'Use spirit summon',
      'Cast magic spell',
      'Parry an attack',
      'Backstab critical hit',
      'Level up to 100+',
    ],
  },

  {
    title: 'Among Us Social Deduction Pro',
    description: 'Master the art of deception and detection',
    game_type: 'Among Us' as const,
    difficulty: 'easy' as const,
    cells: [
      'Win as Impostor',
      'Win as Crewmate',
      'Complete all tasks',
      'Call emergency meeting',
      'Catch impostor venting',
      'Get voted out while innocent',
      'Successfully lie about location',
      'Witness a kill',
      'Fix reactor meltdown',
      'Clear yourself on scan',
      'Vote out impostor correctly',
      'Sabotage successfully',
      'Fake a task convincingly',
      'Get away with murder',
      'FREE SPACE',
      'Call out suspicious behavior',
      'Self-report a body',
      'Win by tasks completion',
      'Get impostor teammate voted out',
      'Survive entire game',
      'Make successful accusation',
      'Defend innocent player',
      'Use security cameras',
      'Fix lights quickly',
      'Win in final 3',
    ],
  },

  {
    title: 'League of Legends Ranked Climb',
    description: 'Dominate the Rift and climb the ranked ladder',
    game_type: 'League of Legends' as const,
    difficulty: 'hard' as const,
    cells: [
      'Get first blood',
      'Win your lane',
      'Get a pentakill',
      'Destroy nexus',
      'Get perfect KDA',
      'Steal baron/dragon',
      'Carry with damage',
      'Save ally with shield/heal',
      'Get fed early game',
      'Make game-winning play',
      'Ward key areas',
      'Roam successfully',
      'Win teamfight',
      'Get multi-kill',
      'FREE SPACE',
      'Counter enemy pick',
      'Farm 200+ CS by 20min',
      'Build full items',
      'Win without deaths',
      'Dominate late game',
      'Make clutch escape',
      'Solo kill enemy laner',
      'Win ranked game',
      'Achieve S rank',
      'Climb a rank tier',
    ],
  },

  {
    title: 'Apex Legends Champion Squad',
    description: 'Battle royale excellence in the Apex Games',
    game_type: 'Apex Legends' as const,
    difficulty: 'medium' as const,
    cells: [
      'Win as Champion',
      'Get 2000+ damage',
      'Get 10+ kills',
      'Win with full squad',
      'Use ultimate ability',
      'Third-party successfully',
      'Survive early game',
      'Get supply bin items',
      'Use zip line tactically',
      'Revive teammate',
      'Use legend ability combo',
      'Win final circle',
      'Get headshot kills',
      'Loot death box quickly',
      'FREE SPACE',
      'Win without taking damage',
      'Use environment kill',
      'Clutch 1v3 situation',
      'Get longbow elimination',
      'Use crafting station',
      'Rotate through zone',
      'Get care package weapon',
      'Win in tilted towers',
      'Make successful callout',
      'Get squad wipe',
    ],
  },

  {
    title: 'Cyberpunk 2077 Night City Stories',
    description: 'Navigate the dystopian future of Night City',
    game_type: 'Cyberpunk 2077' as const,
    difficulty: 'medium' as const,
    cells: [
      'Complete main mission',
      'Hack enemy systems',
      'Drive around Night City',
      'Customize character',
      'Get legendary gear',
      'Make romance choice',
      'Complete side quest',
      'Use cybernetic implants',
      'Stealth mission success',
      'Craft new items',
      'Buy from vendor',
      'Upgrade weapons',
      'Take down gang',
      'Explore different district',
      'FREE SPACE',
      'Make dialogue choice',
      'Use photo mode',
      'Complete gig mission',
      'Find easter egg',
      'Customize vehicle',
      'Meet major character',
      'Experience braindance',
      'Get street cred',
      'Find secret area',
      'Complete ending path',
    ],
  },

  {
    title: 'Fall Guys Party Royale',
    description: 'Survive the chaos and claim the crown',
    game_type: 'Fall Guys' as const,
    difficulty: 'easy' as const,
    cells: [
      'Win a Crown',
      'Qualify first round',
      'Fall off the map',
      'Get grabbed by player',
      'Survive final round',
      'Complete obstacle course',
      'Win team game',
      'Get eliminated first',
      'Qualify by one second',
      'Jump through hoops',
      'Avoid spinning hammers',
      'Cross finish line',
      'Survive sudden death',
      'Get perfect qualifying',
      'FREE SPACE',
      'Help another player',
      'Get revenge elimination',
      'Win with style',
      'Survive chaos mode',
      'Make impossible jump',
      'Grab tail successfully',
      'Score in team sport',
      'Avoid getting grabbed',
      'Win multiple rounds',
      'Get lucky bounce',
    ],
  },

  {
    title: 'The Witcher 3: Monster Hunter',
    description: 'Hunt monsters and solve mysteries across the Continent',
    game_type: 'The Witcher 3' as const,
    difficulty: 'hard' as const,
    cells: [
      'Kill first griffin',
      'Complete Bloody Baron quest',
      'Find Ciri',
      'Defeat Wild Hunt rider',
      'Win Gwent match',
      'Complete treasure hunt',
      'Discover new location',
      'Craft witcher gear',
      'Romance someone',
      'Make moral choice',
      'Defeat higher level enemy',
      'Use correct potion',
      'Complete contract',
      'Find rare diagram',
      'FREE SPACE',
      'Explore underwater',
      'Defeat boss monster',
      'Complete DLC quest',
      'Max character level',
      'Collect all cards',
      'Make allies for battle',
      'Choose ending path',
      'Complete side quest chain',
      'Find easter egg',
      'Achieve 100% area',
    ],
  },
];

// Helper functions
function generateId(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createBoardCells(cellTexts: string[]) {
  return cellTexts.map((text, index) => ({
    text,
    colors: [] as string[],
    completed_by: [] as string[],
    blocked: false,
    is_marked: false,
    cell_id: `cell-${index}`,
    version: 1,
    last_updated: Date.now(),
    last_modified_by: null,
  }));
}

async function createDemoUser() {
  const { data: existingUsers } = await supabase
    .from('users')
    .select('id')
    .eq('username', 'demo-creator')
    .single();

  if (existingUsers) {
    return existingUsers.id;
  }

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      id: generateId(),
      username: 'demo-creator',
      full_name: 'Demo Board Creator',
      bio: 'Official demo content creator for Arcadia Gaming Platform',
      role: 'admin',
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating demo user:', error);
    throw error;
  }

  return newUser.id;
}

async function seedDemoBoards() {
  console.log('🎮 Starting demo board seeding...');

  try {
    // Create demo user
    console.log('👤 Creating demo user...');
    const demoUserId = await createDemoUser();
    console.log(`✅ Demo user created: ${demoUserId}`);

    // Clear existing demo boards
    console.log('🧹 Clearing existing demo boards...');
    const { error: deleteError } = await supabase
      .from('bingo_boards')
      .delete()
      .eq('creator_id', demoUserId);

    if (deleteError) {
      console.warn('⚠️ Error clearing demo boards:', deleteError);
    }

    // Create demo boards
    console.log(`📋 Creating ${DEMO_BOARDS.length} demo boards...`);

    for (const [index, boardData] of DEMO_BOARDS.entries()) {
      const boardCells = createBoardCells(boardData.cells);

      const { data: board, error } = await supabase
        .from('bingo_boards')
        .insert({
          id: generateId(),
          title: boardData.title,
          description: boardData.description,
          game_type: boardData.game_type,
          difficulty: boardData.difficulty,
          creator_id: demoUserId,
          board_state: boardCells,
          size: 25,
          status: 'active',
          is_public: true,
          version: 1,
          votes: Math.floor(Math.random() * 50) + 10, // Random votes between 10-60
          settings: {
            team_mode: false,
            lockout: false,
            sound_enabled: true,
            win_conditions: {
              line: true,
              diagonal: true,
              corners: true,
              majority: false,
            },
          },
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Error creating board ${index + 1}:`, error);
        continue;
      }

      console.log(`✅ Created: "${board.title}" (${board.game_type})`);
    }

    console.log('🎉 Demo board seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   • ${DEMO_BOARDS.length} demo boards created`);
    console.log(
      `   • Covering ${new Set(DEMO_BOARDS.map(b => b.game_type)).size} different game types`
    );
    console.log(`   • Difficulty range: beginner to expert`);
    console.log(`   • All boards are public and active`);

    // Verify the seeding
    const { data: createdBoards, error: verifyError } = await supabase
      .from('bingo_boards')
      .select('id, title, game_type, difficulty, status')
      .eq('creator_id', demoUserId);

    if (verifyError) {
      console.error('❌ Error verifying boards:', verifyError);
    } else {
      console.log(
        `\n📋 Verification: ${createdBoards?.length || 0} boards in database`
      );
      createdBoards?.forEach(board => {
        console.log(
          `   • ${board.title} (${board.game_type}, ${board.difficulty})`
        );
      });
    }
  } catch (error) {
    console.error('💥 Fatal error during seeding:', error);
    process.exit(1);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'seed':
      await seedDemoBoards();
      break;
    case 'clear':
      console.log('🧹 Clearing all demo boards...');
      const demoUserId = await createDemoUser();
      const { error } = await supabase
        .from('bingo_boards')
        .delete()
        .eq('creator_id', demoUserId);

      if (error) {
        console.error('❌ Error clearing boards:', error);
      } else {
        console.log('✅ Demo boards cleared');
      }
      break;
    case 'verify':
      console.log('🔍 Verifying demo boards...');
      const { data: boards } = await supabase
        .from('bingo_boards')
        .select('*')
        .eq('status', 'active');

      console.log(`📊 Found ${boards?.length || 0} active boards`);
      boards?.forEach(board => {
        console.log(`   • ${board.title} (${board.game_type})`);
      });
      break;
    default:
      console.log(`
🎮 Demo Board Seeding Tool

Usage:
  npm run seed-demo seed     # Create demo boards
  npm run seed-demo clear    # Clear demo boards  
  npm run seed-demo verify   # Verify existing boards

Examples:
  npm run seed-demo seed     # Populate with ${DEMO_BOARDS.length} demo boards
  npm run seed-demo verify   # Check what's currently in the database
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { seedDemoBoards, DEMO_BOARDS };
