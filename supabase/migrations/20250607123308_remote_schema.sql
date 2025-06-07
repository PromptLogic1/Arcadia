create type "public"."activity_type" as enum ('login', 'logout', 'board_create', 'board_join', 'board_complete', 'submission_create', 'discussion_create', 'comment_create', 'achievement_unlock');

create type "public"."board_status" as enum ('draft', 'active', 'paused', 'completed', 'archived');

create type "public"."challenge_status" as enum ('draft', 'published', 'archived');

create type "public"."difficulty_level" as enum ('beginner', 'easy', 'medium', 'hard', 'expert');

create type "public"."event_participant_status" as enum ('interested', 'registered', 'waitlisted', 'checked_in');

create type "public"."event_status" as enum ('upcoming', 'active', 'completed', 'cancelled');

create type "public"."game_category" as enum ('All Games', 'World of Warcraft', 'Fortnite', 'Minecraft', 'Among Us', 'Apex Legends', 'League of Legends', 'Overwatch', 'Call of Duty: Warzone', 'Valorant', 'CS:GO', 'Dota 2', 'Rocket League', 'Fall Guys', 'Dead by Daylight', 'Cyberpunk 2077', 'The Witcher 3', 'Elden Ring', 'Dark Souls', 'Bloodborne', 'Sekiro', 'Hollow Knight', 'Celeste', 'Hades', 'The Binding of Isaac', 'Risk of Rain 2', 'Deep Rock Galactic', 'Valheim', 'Subnautica', 'No Man's Sky', 'Terraria', 'Stardew Valley', 'Animal Crossing', 'Splatoon 3', 'Super Mario Odyssey', 'The Legend of Zelda: Breath of the Wild', 'Super Smash Bros. Ultimate');

create type "public"."queue_status" as enum ('waiting', 'matched', 'cancelled');

create type "public"."session_event_type" as enum ('cell_marked', 'cell_unmarked', 'player_joined', 'player_left', 'game_started', 'game_ended');

create type "public"."session_status" as enum ('waiting', 'active', 'completed', 'cancelled');

create type "public"."submission_status" as enum ('pending', 'running', 'completed', 'failed');

create type "public"."tag_action" as enum ('created', 'updated', 'deleted', 'voted', 'reported', 'create', 'update', 'delete', 'vote', 'verify', 'archive');

create type "public"."tag_status" as enum ('active', 'pending', 'rejected', 'archived', 'proposed', 'verified', 'suspended');

create type "public"."tag_type" as enum ('category', 'difficulty', 'theme', 'mechanic', 'custom', 'core', 'game', 'community');

create type "public"."user_role" as enum ('user', 'premium', 'moderator', 'admin');

create type "public"."visibility_type" as enum ('public', 'friends', 'private');

create type "public"."vote_type" as enum ('up', 'down');

create sequence "public"."comments_id_seq";

create sequence "public"."discussions_id_seq";

create table "public"."bingo_boards" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text,
    "creator_id" uuid,
    "size" integer default 5,
    "status" board_status default 'draft'::board_status,
    "game_type" game_category not null,
    "difficulty" difficulty_level not null,
    "is_public" boolean default true,
    "cloned_from" uuid,
    "votes" integer default 0,
    "bookmarked_count" integer default 0,
    "version" integer default 1,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "settings" jsonb,
    "board_state" jsonb
);


alter table "public"."bingo_boards" enable row level security;

create table "public"."bingo_cards" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text,
    "game_type" game_category not null,
    "difficulty" difficulty_level not null,
    "tags" text[] default '{}'::text[],
    "is_public" boolean default true,
    "votes" integer default 0,
    "creator_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."bingo_cards" enable row level security;

create table "public"."bingo_queue_entries" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid,
    "board_id" uuid,
    "preferences" jsonb default '{}'::jsonb,
    "status" queue_status default 'waiting'::queue_status,
    "matched_session_id" uuid,
    "matched_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."bingo_queue_entries" enable row level security;

create table "public"."bingo_session_cells" (
    "id" uuid not null default gen_random_uuid(),
    "board_id" uuid,
    "session_id" uuid,
    "cell_data" jsonb,
    "version" integer default 1,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."bingo_session_cells" enable row level security;

create table "public"."bingo_session_events" (
    "id" uuid not null default gen_random_uuid(),
    "board_id" uuid,
    "session_id" uuid,
    "event_type" session_event_type not null,
    "player_id" uuid,
    "data" jsonb,
    "timestamp" bigint not null,
    "version" integer default 1,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "user_id" uuid,
    "event_data" jsonb,
    "cell_position" integer
);


alter table "public"."bingo_session_events" enable row level security;

create table "public"."bingo_session_players" (
    "session_id" uuid not null,
    "user_id" uuid not null,
    "color" text not null,
    "team" integer,
    "joined_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "display_name" text not null,
    "avatar_url" text,
    "is_ready" boolean default false,
    "is_host" boolean default false,
    "score" integer default 0,
    "position" integer,
    "left_at" timestamp with time zone,
    "id" uuid default gen_random_uuid()
);


alter table "public"."bingo_session_players" enable row level security;

create table "public"."bingo_session_queue" (
    "id" uuid not null default gen_random_uuid(),
    "session_id" uuid,
    "user_id" uuid,
    "player_name" text not null,
    "color" text not null,
    "team" integer,
    "requested_at" timestamp with time zone default now(),
    "status" queue_status default 'waiting'::queue_status,
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."bingo_session_queue" enable row level security;

create table "public"."bingo_sessions" (
    "id" uuid not null default gen_random_uuid(),
    "board_id" uuid,
    "host_id" uuid,
    "status" session_status default 'waiting'::session_status,
    "current_state" jsonb,
    "winner_id" uuid,
    "settings" session_settings,
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "version" integer default 1,
    "session_code" text
);


alter table "public"."bingo_sessions" enable row level security;

create table "public"."board_bookmarks" (
    "user_id" uuid not null,
    "board_id" uuid not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."board_bookmarks" enable row level security;

create table "public"."board_votes" (
    "user_id" uuid not null,
    "board_id" uuid not null,
    "vote" vote_type not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."board_votes" enable row level security;

create table "public"."card_votes" (
    "user_id" uuid not null,
    "card_id" uuid not null,
    "vote" vote_type not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."card_votes" enable row level security;

create table "public"."categories" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "icon_url" text,
    "color" text,
    "sort_order" integer default 0,
    "is_active" boolean default true
);


alter table "public"."categories" enable row level security;

create table "public"."challenge_tags" (
    "challenge_id" uuid not null,
    "tag_id" uuid not null
);


alter table "public"."challenge_tags" enable row level security;

create table "public"."challenges" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "slug" text not null,
    "description" text not null,
    "difficulty" difficulty_level not null,
    "category_id" uuid,
    "created_by" uuid,
    "status" challenge_status default 'draft'::challenge_status,
    "test_cases" jsonb,
    "initial_code" text,
    "solution_code" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."challenges" enable row level security;

create table "public"."comments" (
    "id" bigint not null default nextval('comments_id_seq'::regclass),
    "content" text not null,
    "upvotes" integer default 0,
    "author_id" uuid,
    "discussion_id" bigint,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."comments" enable row level security;

create table "public"."community_event_participants" (
    "event_id" uuid not null,
    "user_id" uuid not null,
    "status" event_participant_status not null default 'interested'::event_participant_status,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."community_event_participants" enable row level security;

create table "public"."community_event_tags" (
    "event_id" uuid not null,
    "tag_id" uuid not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."community_event_tags" enable row level security;

create table "public"."community_events" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text,
    "game_type" game_category not null,
    "status" event_status not null default 'upcoming'::event_status,
    "start_date" timestamp with time zone not null,
    "end_date" timestamp with time zone,
    "max_participants" integer,
    "prize_pool" text,
    "organizer_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."community_events" enable row level security;

create table "public"."discussions" (
    "id" bigint not null default nextval('discussions_id_seq'::regclass),
    "title" text not null,
    "content" text not null,
    "game" text not null,
    "challenge_type" text,
    "tags" text[] default '{}'::text[],
    "upvotes" integer default 0,
    "author_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."discussions" enable row level security;

create table "public"."game_results" (
    "id" uuid not null default uuid_generate_v4(),
    "session_id" uuid,
    "user_id" uuid,
    "final_score" integer not null default 0,
    "patterns_achieved" jsonb default '[]'::jsonb,
    "time_to_win" integer,
    "placement" integer default 1,
    "mistake_count" integer default 0,
    "bonus_points" integer default 0,
    "created_at" timestamp with time zone default now()
);


alter table "public"."game_results" enable row level security;

create table "public"."submissions" (
    "id" uuid not null default gen_random_uuid(),
    "challenge_id" uuid,
    "user_id" uuid,
    "code" text not null,
    "language" text not null,
    "status" submission_status default 'pending'::submission_status,
    "results" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."submissions" enable row level security;

create table "public"."tag_history" (
    "id" uuid not null default gen_random_uuid(),
    "tag_id" uuid,
    "action" tag_action not null,
    "changes" jsonb,
    "performed_by" uuid,
    "created_at" timestamp with time zone default now()
);


alter table "public"."tag_history" enable row level security;

create table "public"."tag_reports" (
    "id" uuid not null default gen_random_uuid(),
    "tag_id" uuid,
    "user_id" uuid,
    "reason" text not null,
    "timestamp" timestamp with time zone default now()
);


alter table "public"."tag_reports" enable row level security;

create table "public"."tag_votes" (
    "id" uuid not null default gen_random_uuid(),
    "tag_id" uuid,
    "user_id" uuid,
    "vote" vote_type not null,
    "timestamp" timestamp with time zone default now()
);


alter table "public"."tag_votes" enable row level security;

create table "public"."tags" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "type" tag_type not null default 'custom'::tag_type,
    "category" tag_category,
    "status" tag_status default 'active'::tag_status,
    "description" text not null,
    "game" text,
    "usage_count" integer default 0,
    "votes" integer default 0,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "color" text
);


alter table "public"."tags" enable row level security;

create table "public"."user_achievements" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "achievement_type" text not null,
    "achievement_name" text not null,
    "description" text,
    "points" integer default 0,
    "unlocked_at" timestamp with time zone default now(),
    "metadata" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."user_achievements" enable row level security;

create table "public"."user_activity" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "activity_type" activity_type not null,
    "data" jsonb default '{}'::jsonb,
    "timestamp" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now()
);


alter table "public"."user_activity" enable row level security;

create table "public"."user_bookmarks" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "board_id" uuid not null,
    "created_at" timestamp with time zone default timezone('utc'::text, now())
);


alter table "public"."user_bookmarks" enable row level security;

create table "public"."user_friends" (
    "user_id" uuid not null,
    "friend_id" uuid not null,
    "status" text default 'pending'::text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."user_friends" enable row level security;

create table "public"."user_sessions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "session_token" text not null,
    "device_info" jsonb,
    "ip_address" inet,
    "last_activity" timestamp with time zone default now(),
    "expires_at" timestamp with time zone not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."user_sessions" enable row level security;

create table "public"."user_statistics" (
    "user_id" uuid not null,
    "total_games" integer default 0,
    "games_won" integer default 0,
    "games_completed" integer default 0,
    "total_score" integer default 0,
    "highest_score" integer default 0,
    "average_score" numeric(10,2) default 0,
    "fastest_win" integer,
    "total_playtime" integer default 0,
    "patterns_completed" jsonb default '{}'::jsonb,
    "favorite_pattern" text,
    "current_win_streak" integer default 0,
    "longest_win_streak" integer default 0,
    "last_game_at" timestamp with time zone,
    "updated_at" timestamp with time zone default now()
);


alter table "public"."user_statistics" enable row level security;

create table "public"."users" (
    "id" uuid not null default gen_random_uuid(),
    "auth_id" uuid,
    "username" text not null,
    "full_name" text,
    "avatar_url" text,
    "role" user_role default 'user'::user_role,
    "experience_points" integer default 0,
    "land" text,
    "region" text,
    "city" text,
    "bio" text,
    "last_login_at" timestamp with time zone,
    "profile_visibility" visibility_type default 'public'::visibility_type,
    "achievements_visibility" visibility_type default 'public'::visibility_type,
    "submissions_visibility" visibility_type default 'public'::visibility_type,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."users" enable row level security;

alter sequence "public"."comments_id_seq" owned by "public"."comments"."id";

alter sequence "public"."discussions_id_seq" owned by "public"."discussions"."id";

CREATE UNIQUE INDEX bingo_boards_pkey ON public.bingo_boards USING btree (id);

CREATE UNIQUE INDEX bingo_cards_pkey ON public.bingo_cards USING btree (id);

CREATE UNIQUE INDEX bingo_queue_entries_pkey ON public.bingo_queue_entries USING btree (id);

CREATE UNIQUE INDEX bingo_queue_entries_user_id_board_id_status_key ON public.bingo_queue_entries USING btree (user_id, board_id, status);

CREATE UNIQUE INDEX bingo_session_cells_pkey ON public.bingo_session_cells USING btree (id);

CREATE UNIQUE INDEX bingo_session_events_pkey ON public.bingo_session_events USING btree (id);

CREATE UNIQUE INDEX bingo_session_players_id_key ON public.bingo_session_players USING btree (id);

CREATE UNIQUE INDEX bingo_session_players_pkey ON public.bingo_session_players USING btree (session_id, user_id);

CREATE UNIQUE INDEX bingo_session_queue_pkey ON public.bingo_session_queue USING btree (id);

CREATE UNIQUE INDEX bingo_session_queue_session_id_user_id_key ON public.bingo_session_queue USING btree (session_id, user_id);

CREATE UNIQUE INDEX bingo_sessions_pkey ON public.bingo_sessions USING btree (id);

CREATE UNIQUE INDEX bingo_sessions_session_code_key ON public.bingo_sessions USING btree (session_code);

CREATE UNIQUE INDEX board_bookmarks_pkey ON public.board_bookmarks USING btree (user_id, board_id);

CREATE UNIQUE INDEX board_votes_pkey ON public.board_votes USING btree (user_id, board_id);

CREATE UNIQUE INDEX card_votes_pkey ON public.card_votes USING btree (user_id, card_id);

CREATE UNIQUE INDEX categories_name_key ON public.categories USING btree (name);

CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id);

CREATE UNIQUE INDEX challenge_tags_pkey ON public.challenge_tags USING btree (challenge_id, tag_id);

CREATE UNIQUE INDEX challenges_pkey ON public.challenges USING btree (id);

CREATE UNIQUE INDEX challenges_slug_key ON public.challenges USING btree (slug);

CREATE UNIQUE INDEX comments_pkey ON public.comments USING btree (id);

CREATE UNIQUE INDEX community_event_participants_pkey ON public.community_event_participants USING btree (event_id, user_id);

CREATE UNIQUE INDEX community_event_tags_pkey ON public.community_event_tags USING btree (event_id, tag_id);

CREATE UNIQUE INDEX community_events_pkey ON public.community_events USING btree (id);

CREATE UNIQUE INDEX discussions_pkey ON public.discussions USING btree (id);

CREATE UNIQUE INDEX game_results_pkey ON public.game_results USING btree (id);

CREATE INDEX idx_bingo_boards_bookmarked_count ON public.bingo_boards USING btree (bookmarked_count DESC);

CREATE INDEX idx_bingo_boards_cloned_from ON public.bingo_boards USING btree (cloned_from);

CREATE INDEX idx_bingo_boards_created_at ON public.bingo_boards USING btree (created_at);

CREATE INDEX idx_bingo_boards_creator_id ON public.bingo_boards USING btree (creator_id);

CREATE INDEX idx_bingo_boards_difficulty ON public.bingo_boards USING btree (difficulty);

CREATE INDEX idx_bingo_boards_game_type ON public.bingo_boards USING btree (game_type);

CREATE INDEX idx_bingo_boards_is_public ON public.bingo_boards USING btree (is_public);

CREATE INDEX idx_bingo_boards_public_game_difficulty ON public.bingo_boards USING btree (is_public, game_type, difficulty) WHERE (is_public = true);

CREATE INDEX idx_bingo_boards_status ON public.bingo_boards USING btree (status);

CREATE INDEX idx_bingo_boards_votes_desc ON public.bingo_boards USING btree (votes DESC);

CREATE INDEX idx_bingo_cards_created_at ON public.bingo_cards USING btree (created_at);

CREATE INDEX idx_bingo_cards_creator_id ON public.bingo_cards USING btree (creator_id);

CREATE INDEX idx_bingo_cards_difficulty ON public.bingo_cards USING btree (difficulty);

CREATE INDEX idx_bingo_cards_game_type ON public.bingo_cards USING btree (game_type);

CREATE INDEX idx_bingo_cards_is_public ON public.bingo_cards USING btree (is_public);

CREATE INDEX idx_bingo_cards_tags_gin ON public.bingo_cards USING gin (tags);

CREATE INDEX idx_bingo_cards_votes_desc ON public.bingo_cards USING btree (votes DESC);

CREATE INDEX idx_bingo_session_cells_board_id ON public.bingo_session_cells USING btree (board_id);

CREATE INDEX idx_bingo_session_cells_session_id ON public.bingo_session_cells USING btree (session_id);

CREATE INDEX idx_bingo_session_events_board_id ON public.bingo_session_events USING btree (board_id);

CREATE INDEX idx_bingo_session_events_event_type ON public.bingo_session_events USING btree (event_type);

CREATE INDEX idx_bingo_session_events_player_id ON public.bingo_session_events USING btree (player_id);

CREATE INDEX idx_bingo_session_events_session_id ON public.bingo_session_events USING btree (session_id);

CREATE INDEX idx_bingo_session_events_timestamp ON public.bingo_session_events USING btree ("timestamp");

CREATE INDEX idx_bingo_session_players_joined_at ON public.bingo_session_players USING btree (joined_at);

CREATE INDEX idx_bingo_session_players_user_id ON public.bingo_session_players USING btree (user_id);

CREATE INDEX idx_bingo_session_queue_requested_at ON public.bingo_session_queue USING btree (requested_at);

CREATE INDEX idx_bingo_session_queue_status ON public.bingo_session_queue USING btree (status);

CREATE INDEX idx_bingo_session_queue_user_id ON public.bingo_session_queue USING btree (user_id);

CREATE INDEX idx_bingo_sessions_board_id ON public.bingo_sessions USING btree (board_id);

CREATE INDEX idx_bingo_sessions_created_at ON public.bingo_sessions USING btree (created_at);

CREATE INDEX idx_bingo_sessions_host_id ON public.bingo_sessions USING btree (host_id);

CREATE INDEX idx_bingo_sessions_session_code ON public.bingo_sessions USING btree (session_code);

CREATE INDEX idx_bingo_sessions_started_at ON public.bingo_sessions USING btree (started_at);

CREATE INDEX idx_bingo_sessions_status ON public.bingo_sessions USING btree (status);

CREATE INDEX idx_bingo_sessions_version ON public.bingo_sessions USING btree (version);

CREATE INDEX idx_bingo_sessions_winner_id ON public.bingo_sessions USING btree (winner_id);

CREATE INDEX idx_challenges_category_id ON public.challenges USING btree (category_id);

CREATE INDEX idx_challenges_created_at ON public.challenges USING btree (created_at);

CREATE INDEX idx_challenges_created_by ON public.challenges USING btree (created_by);

CREATE INDEX idx_challenges_difficulty ON public.challenges USING btree (difficulty);

CREATE INDEX idx_challenges_slug ON public.challenges USING btree (slug);

CREATE INDEX idx_challenges_status ON public.challenges USING btree (status);

CREATE INDEX idx_comments_author_id ON public.comments USING btree (author_id);

CREATE INDEX idx_comments_created_at ON public.comments USING btree (created_at);

CREATE INDEX idx_comments_discussion_id ON public.comments USING btree (discussion_id);

CREATE INDEX idx_comments_upvotes ON public.comments USING btree (upvotes DESC);

CREATE INDEX idx_discussions_author_id ON public.discussions USING btree (author_id);

CREATE INDEX idx_discussions_created_at ON public.discussions USING btree (created_at);

CREATE INDEX idx_discussions_created_at_desc ON public.discussions USING btree (created_at DESC);

CREATE INDEX idx_discussions_game ON public.discussions USING btree (game);

CREATE INDEX idx_discussions_game_created ON public.discussions USING btree (game, created_at);

CREATE INDEX idx_discussions_tags_gin ON public.discussions USING gin (tags);

CREATE INDEX idx_discussions_upvotes_desc ON public.discussions USING btree (upvotes DESC);

CREATE INDEX idx_game_results_created ON public.game_results USING btree (created_at DESC);

CREATE INDEX idx_game_results_placement ON public.game_results USING btree (placement, final_score DESC);

CREATE INDEX idx_game_results_session ON public.game_results USING btree (session_id);

CREATE INDEX idx_game_results_user_score ON public.game_results USING btree (user_id, final_score DESC);

CREATE INDEX idx_queue_entries_board_id ON public.bingo_queue_entries USING btree (board_id, status);

CREATE INDEX idx_queue_entries_created_at ON public.bingo_queue_entries USING btree (created_at);

CREATE INDEX idx_queue_entries_status ON public.bingo_queue_entries USING btree (status);

CREATE INDEX idx_queue_entries_user_id ON public.bingo_queue_entries USING btree (user_id);

CREATE INDEX idx_session_events_session_timestamp ON public.bingo_session_events USING btree (session_id, "timestamp");

CREATE INDEX idx_session_players_is_host ON public.bingo_session_players USING btree (session_id, is_host);

CREATE INDEX idx_session_players_score ON public.bingo_session_players USING btree (session_id, score DESC);

CREATE INDEX idx_submissions_challenge_id ON public.submissions USING btree (challenge_id);

CREATE INDEX idx_submissions_created_at ON public.submissions USING btree (created_at);

CREATE INDEX idx_submissions_status ON public.submissions USING btree (status);

CREATE INDEX idx_submissions_user_challenge ON public.submissions USING btree (user_id, challenge_id);

CREATE INDEX idx_submissions_user_id ON public.submissions USING btree (user_id);

CREATE INDEX idx_tag_history_action ON public.tag_history USING btree (action);

CREATE INDEX idx_tag_history_created_at ON public.tag_history USING btree (created_at);

CREATE INDEX idx_tag_history_performed_by ON public.tag_history USING btree (performed_by);

CREATE INDEX idx_tag_history_tag_id ON public.tag_history USING btree (tag_id);

CREATE INDEX idx_tag_reports_tag_id ON public.tag_reports USING btree (tag_id);

CREATE INDEX idx_tag_reports_timestamp ON public.tag_reports USING btree ("timestamp");

CREATE INDEX idx_tag_reports_user_id ON public.tag_reports USING btree (user_id);

CREATE INDEX idx_tag_votes_tag_id ON public.tag_votes USING btree (tag_id);

CREATE INDEX idx_tag_votes_timestamp ON public.tag_votes USING btree ("timestamp");

CREATE INDEX idx_tags_created_by ON public.tags USING btree (created_by);

CREATE INDEX idx_tags_game ON public.tags USING btree (game);

CREATE INDEX idx_tags_name ON public.tags USING btree (name);

CREATE INDEX idx_tags_status ON public.tags USING btree (status);

CREATE INDEX idx_tags_type ON public.tags USING btree (type);

CREATE INDEX idx_tags_usage_count_desc ON public.tags USING btree (usage_count DESC);

CREATE INDEX idx_tags_votes ON public.tags USING btree (votes DESC);

CREATE INDEX idx_user_achievements_achievement_type ON public.user_achievements USING btree (achievement_type);

CREATE INDEX idx_user_achievements_unlocked_at ON public.user_achievements USING btree (unlocked_at);

CREATE INDEX idx_user_achievements_user_id ON public.user_achievements USING btree (user_id);

CREATE INDEX idx_user_activity_created_at_desc ON public.user_activity USING btree (created_at DESC);

CREATE INDEX idx_user_activity_timestamp ON public.user_activity USING btree ("timestamp");

CREATE INDEX idx_user_activity_type ON public.user_activity USING btree (activity_type);

CREATE INDEX idx_user_activity_user_id ON public.user_activity USING btree (user_id);

CREATE INDEX idx_user_bookmarks_board_id ON public.user_bookmarks USING btree (board_id);

CREATE INDEX idx_user_bookmarks_user_id ON public.user_bookmarks USING btree (user_id);

CREATE INDEX idx_user_friends_friend_id ON public.user_friends USING btree (friend_id);

CREATE INDEX idx_user_friends_status ON public.user_friends USING btree (status);

CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions USING btree (expires_at);

CREATE INDEX idx_user_sessions_last_activity ON public.user_sessions USING btree (last_activity);

CREATE INDEX idx_user_sessions_session_token ON public.user_sessions USING btree (session_token);

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);

CREATE INDEX idx_user_statistics_games_played ON public.user_statistics USING btree (total_games DESC);

CREATE INDEX idx_user_statistics_total_score ON public.user_statistics USING btree (total_score DESC);

CREATE INDEX idx_user_statistics_user_id ON public.user_statistics USING btree (user_id);

CREATE INDEX idx_user_statistics_win_rate ON public.user_statistics USING btree ((((games_won)::numeric / (NULLIF(total_games, 0))::numeric)) DESC);

CREATE INDEX idx_users_auth_id ON public.users USING btree (auth_id);

CREATE INDEX idx_users_created_at ON public.users USING btree (created_at);

CREATE INDEX idx_users_role ON public.users USING btree (role);

CREATE INDEX idx_users_username ON public.users USING btree (username);

CREATE UNIQUE INDEX submissions_pkey ON public.submissions USING btree (id);

CREATE UNIQUE INDEX tag_history_pkey ON public.tag_history USING btree (id);

CREATE UNIQUE INDEX tag_reports_pkey ON public.tag_reports USING btree (id);

CREATE UNIQUE INDEX tag_votes_pkey ON public.tag_votes USING btree (id);

CREATE UNIQUE INDEX tag_votes_tag_id_user_id_key ON public.tag_votes USING btree (tag_id, user_id);

CREATE UNIQUE INDEX tags_name_key ON public.tags USING btree (name);

CREATE UNIQUE INDEX tags_pkey ON public.tags USING btree (id);

CREATE UNIQUE INDEX user_achievements_pkey ON public.user_achievements USING btree (id);

CREATE UNIQUE INDEX user_achievements_user_id_achievement_name_type_key ON public.user_achievements USING btree (user_id, achievement_name, achievement_type);

CREATE UNIQUE INDEX user_activity_pkey ON public.user_activity USING btree (id);

CREATE UNIQUE INDEX user_bookmarks_pkey ON public.user_bookmarks USING btree (id);

CREATE UNIQUE INDEX user_bookmarks_unique ON public.user_bookmarks USING btree (user_id, board_id);

CREATE UNIQUE INDEX user_friends_pkey ON public.user_friends USING btree (user_id, friend_id);

CREATE UNIQUE INDEX user_sessions_pkey ON public.user_sessions USING btree (id);

CREATE UNIQUE INDEX user_sessions_session_token_key ON public.user_sessions USING btree (session_token);

CREATE UNIQUE INDEX user_statistics_pkey ON public.user_statistics USING btree (user_id);

CREATE UNIQUE INDEX users_auth_id_key ON public.users USING btree (auth_id);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);

alter table "public"."bingo_boards" add constraint "bingo_boards_pkey" PRIMARY KEY using index "bingo_boards_pkey";

alter table "public"."bingo_cards" add constraint "bingo_cards_pkey" PRIMARY KEY using index "bingo_cards_pkey";

alter table "public"."bingo_queue_entries" add constraint "bingo_queue_entries_pkey" PRIMARY KEY using index "bingo_queue_entries_pkey";

alter table "public"."bingo_session_cells" add constraint "bingo_session_cells_pkey" PRIMARY KEY using index "bingo_session_cells_pkey";

alter table "public"."bingo_session_events" add constraint "bingo_session_events_pkey" PRIMARY KEY using index "bingo_session_events_pkey";

alter table "public"."bingo_session_players" add constraint "bingo_session_players_pkey" PRIMARY KEY using index "bingo_session_players_pkey";

alter table "public"."bingo_session_queue" add constraint "bingo_session_queue_pkey" PRIMARY KEY using index "bingo_session_queue_pkey";

alter table "public"."bingo_sessions" add constraint "bingo_sessions_pkey" PRIMARY KEY using index "bingo_sessions_pkey";

alter table "public"."board_bookmarks" add constraint "board_bookmarks_pkey" PRIMARY KEY using index "board_bookmarks_pkey";

alter table "public"."board_votes" add constraint "board_votes_pkey" PRIMARY KEY using index "board_votes_pkey";

alter table "public"."card_votes" add constraint "card_votes_pkey" PRIMARY KEY using index "card_votes_pkey";

alter table "public"."categories" add constraint "categories_pkey" PRIMARY KEY using index "categories_pkey";

alter table "public"."challenge_tags" add constraint "challenge_tags_pkey" PRIMARY KEY using index "challenge_tags_pkey";

alter table "public"."challenges" add constraint "challenges_pkey" PRIMARY KEY using index "challenges_pkey";

alter table "public"."comments" add constraint "comments_pkey" PRIMARY KEY using index "comments_pkey";

alter table "public"."community_event_participants" add constraint "community_event_participants_pkey" PRIMARY KEY using index "community_event_participants_pkey";

alter table "public"."community_event_tags" add constraint "community_event_tags_pkey" PRIMARY KEY using index "community_event_tags_pkey";

alter table "public"."community_events" add constraint "community_events_pkey" PRIMARY KEY using index "community_events_pkey";

alter table "public"."discussions" add constraint "discussions_pkey" PRIMARY KEY using index "discussions_pkey";

alter table "public"."game_results" add constraint "game_results_pkey" PRIMARY KEY using index "game_results_pkey";

alter table "public"."submissions" add constraint "submissions_pkey" PRIMARY KEY using index "submissions_pkey";

alter table "public"."tag_history" add constraint "tag_history_pkey" PRIMARY KEY using index "tag_history_pkey";

alter table "public"."tag_reports" add constraint "tag_reports_pkey" PRIMARY KEY using index "tag_reports_pkey";

alter table "public"."tag_votes" add constraint "tag_votes_pkey" PRIMARY KEY using index "tag_votes_pkey";

alter table "public"."tags" add constraint "tags_pkey" PRIMARY KEY using index "tags_pkey";

alter table "public"."user_achievements" add constraint "user_achievements_pkey" PRIMARY KEY using index "user_achievements_pkey";

alter table "public"."user_activity" add constraint "user_activity_pkey" PRIMARY KEY using index "user_activity_pkey";

alter table "public"."user_bookmarks" add constraint "user_bookmarks_pkey" PRIMARY KEY using index "user_bookmarks_pkey";

alter table "public"."user_friends" add constraint "user_friends_pkey" PRIMARY KEY using index "user_friends_pkey";

alter table "public"."user_sessions" add constraint "user_sessions_pkey" PRIMARY KEY using index "user_sessions_pkey";

alter table "public"."user_statistics" add constraint "user_statistics_pkey" PRIMARY KEY using index "user_statistics_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."bingo_boards" add constraint "bingo_boards_cloned_from_fkey" FOREIGN KEY (cloned_from) REFERENCES bingo_boards(id) ON DELETE SET NULL not valid;

alter table "public"."bingo_boards" validate constraint "bingo_boards_cloned_from_fkey";

alter table "public"."bingo_boards" add constraint "bingo_boards_creator_id_fkey" FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."bingo_boards" validate constraint "bingo_boards_creator_id_fkey";

alter table "public"."bingo_boards" add constraint "bingo_boards_size_check" CHECK (((size >= 3) AND (size <= 6))) not valid;

alter table "public"."bingo_boards" validate constraint "bingo_boards_size_check";

alter table "public"."bingo_cards" add constraint "bingo_cards_creator_id_fkey" FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."bingo_cards" validate constraint "bingo_cards_creator_id_fkey";

alter table "public"."bingo_queue_entries" add constraint "bingo_queue_entries_board_id_fkey" FOREIGN KEY (board_id) REFERENCES bingo_boards(id) ON DELETE CASCADE not valid;

alter table "public"."bingo_queue_entries" validate constraint "bingo_queue_entries_board_id_fkey";

alter table "public"."bingo_queue_entries" add constraint "bingo_queue_entries_matched_session_id_fkey" FOREIGN KEY (matched_session_id) REFERENCES bingo_sessions(id) ON DELETE SET NULL not valid;

alter table "public"."bingo_queue_entries" validate constraint "bingo_queue_entries_matched_session_id_fkey";

alter table "public"."bingo_queue_entries" add constraint "bingo_queue_entries_user_id_board_id_status_key" UNIQUE using index "bingo_queue_entries_user_id_board_id_status_key";

alter table "public"."bingo_queue_entries" add constraint "bingo_queue_entries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."bingo_queue_entries" validate constraint "bingo_queue_entries_user_id_fkey";

alter table "public"."bingo_session_cells" add constraint "bingo_session_cells_board_id_fkey" FOREIGN KEY (board_id) REFERENCES bingo_boards(id) ON DELETE CASCADE not valid;

alter table "public"."bingo_session_cells" validate constraint "bingo_session_cells_board_id_fkey";

alter table "public"."bingo_session_cells" add constraint "bingo_session_cells_session_id_fkey" FOREIGN KEY (session_id) REFERENCES bingo_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."bingo_session_cells" validate constraint "bingo_session_cells_session_id_fkey";

alter table "public"."bingo_session_events" add constraint "bingo_session_events_board_id_fkey" FOREIGN KEY (board_id) REFERENCES bingo_boards(id) ON DELETE CASCADE not valid;

alter table "public"."bingo_session_events" validate constraint "bingo_session_events_board_id_fkey";

alter table "public"."bingo_session_events" add constraint "bingo_session_events_player_id_fkey" FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."bingo_session_events" validate constraint "bingo_session_events_player_id_fkey";

alter table "public"."bingo_session_events" add constraint "bingo_session_events_session_id_fkey" FOREIGN KEY (session_id) REFERENCES bingo_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."bingo_session_events" validate constraint "bingo_session_events_session_id_fkey";

alter table "public"."bingo_session_events" add constraint "bingo_session_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."bingo_session_events" validate constraint "bingo_session_events_user_id_fkey";

alter table "public"."bingo_session_players" add constraint "bingo_session_players_id_key" UNIQUE using index "bingo_session_players_id_key";

alter table "public"."bingo_session_players" add constraint "bingo_session_players_session_id_fkey" FOREIGN KEY (session_id) REFERENCES bingo_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."bingo_session_players" validate constraint "bingo_session_players_session_id_fkey";

alter table "public"."bingo_session_players" add constraint "bingo_session_players_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."bingo_session_players" validate constraint "bingo_session_players_user_id_fkey";

alter table "public"."bingo_session_queue" add constraint "bingo_session_queue_session_id_fkey" FOREIGN KEY (session_id) REFERENCES bingo_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."bingo_session_queue" validate constraint "bingo_session_queue_session_id_fkey";

alter table "public"."bingo_session_queue" add constraint "bingo_session_queue_session_id_user_id_key" UNIQUE using index "bingo_session_queue_session_id_user_id_key";

alter table "public"."bingo_session_queue" add constraint "bingo_session_queue_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."bingo_session_queue" validate constraint "bingo_session_queue_user_id_fkey";

alter table "public"."bingo_sessions" add constraint "bingo_sessions_board_id_fkey" FOREIGN KEY (board_id) REFERENCES bingo_boards(id) ON DELETE CASCADE not valid;

alter table "public"."bingo_sessions" validate constraint "bingo_sessions_board_id_fkey";

alter table "public"."bingo_sessions" add constraint "bingo_sessions_host_id_fkey" FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."bingo_sessions" validate constraint "bingo_sessions_host_id_fkey";

alter table "public"."bingo_sessions" add constraint "bingo_sessions_session_code_key" UNIQUE using index "bingo_sessions_session_code_key";

alter table "public"."bingo_sessions" add constraint "bingo_sessions_winner_id_fkey" FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."bingo_sessions" validate constraint "bingo_sessions_winner_id_fkey";

alter table "public"."board_bookmarks" add constraint "board_bookmarks_board_id_fkey" FOREIGN KEY (board_id) REFERENCES bingo_boards(id) ON DELETE CASCADE not valid;

alter table "public"."board_bookmarks" validate constraint "board_bookmarks_board_id_fkey";

alter table "public"."board_bookmarks" add constraint "board_bookmarks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."board_bookmarks" validate constraint "board_bookmarks_user_id_fkey";

alter table "public"."board_votes" add constraint "board_votes_board_id_fkey" FOREIGN KEY (board_id) REFERENCES bingo_boards(id) ON DELETE CASCADE not valid;

alter table "public"."board_votes" validate constraint "board_votes_board_id_fkey";

alter table "public"."board_votes" add constraint "board_votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."board_votes" validate constraint "board_votes_user_id_fkey";

alter table "public"."card_votes" add constraint "card_votes_card_id_fkey" FOREIGN KEY (card_id) REFERENCES bingo_cards(id) ON DELETE CASCADE not valid;

alter table "public"."card_votes" validate constraint "card_votes_card_id_fkey";

alter table "public"."card_votes" add constraint "card_votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."card_votes" validate constraint "card_votes_user_id_fkey";

alter table "public"."categories" add constraint "categories_name_key" UNIQUE using index "categories_name_key";

alter table "public"."challenge_tags" add constraint "challenge_tags_challenge_id_fkey" FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE not valid;

alter table "public"."challenge_tags" validate constraint "challenge_tags_challenge_id_fkey";

alter table "public"."challenge_tags" add constraint "challenge_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE not valid;

alter table "public"."challenge_tags" validate constraint "challenge_tags_tag_id_fkey";

alter table "public"."challenges" add constraint "challenges_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL not valid;

alter table "public"."challenges" validate constraint "challenges_category_id_fkey";

alter table "public"."challenges" add constraint "challenges_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."challenges" validate constraint "challenges_created_by_fkey";

alter table "public"."challenges" add constraint "challenges_slug_key" UNIQUE using index "challenges_slug_key";

alter table "public"."comments" add constraint "comments_author_id_fkey" FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_author_id_fkey";

alter table "public"."comments" add constraint "comments_discussion_id_fkey" FOREIGN KEY (discussion_id) REFERENCES discussions(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_discussion_id_fkey";

alter table "public"."community_event_participants" add constraint "community_event_participants_event_id_fkey" FOREIGN KEY (event_id) REFERENCES community_events(id) ON DELETE CASCADE not valid;

alter table "public"."community_event_participants" validate constraint "community_event_participants_event_id_fkey";

alter table "public"."community_event_participants" add constraint "community_event_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."community_event_participants" validate constraint "community_event_participants_user_id_fkey";

alter table "public"."community_event_tags" add constraint "community_event_tags_event_id_fkey" FOREIGN KEY (event_id) REFERENCES community_events(id) ON DELETE CASCADE not valid;

alter table "public"."community_event_tags" validate constraint "community_event_tags_event_id_fkey";

alter table "public"."community_event_tags" add constraint "community_event_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE not valid;

alter table "public"."community_event_tags" validate constraint "community_event_tags_tag_id_fkey";

alter table "public"."community_events" add constraint "community_events_organizer_id_fkey" FOREIGN KEY (organizer_id) REFERENCES users(id) not valid;

alter table "public"."community_events" validate constraint "community_events_organizer_id_fkey";

alter table "public"."discussions" add constraint "discussions_author_id_fkey" FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."discussions" validate constraint "discussions_author_id_fkey";

alter table "public"."game_results" add constraint "game_results_session_id_fkey" FOREIGN KEY (session_id) REFERENCES bingo_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."game_results" validate constraint "game_results_session_id_fkey";

alter table "public"."game_results" add constraint "game_results_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."game_results" validate constraint "game_results_user_id_fkey";

alter table "public"."game_results" add constraint "valid_placement" CHECK ((placement > 0)) not valid;

alter table "public"."game_results" validate constraint "valid_placement";

alter table "public"."game_results" add constraint "valid_score" CHECK ((final_score >= 0)) not valid;

alter table "public"."game_results" validate constraint "valid_score";

alter table "public"."game_results" add constraint "valid_time" CHECK (((time_to_win IS NULL) OR (time_to_win >= 0))) not valid;

alter table "public"."game_results" validate constraint "valid_time";

alter table "public"."submissions" add constraint "submissions_challenge_id_fkey" FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE not valid;

alter table "public"."submissions" validate constraint "submissions_challenge_id_fkey";

alter table "public"."submissions" add constraint "submissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."submissions" validate constraint "submissions_user_id_fkey";

alter table "public"."tag_history" add constraint "tag_history_performed_by_fkey" FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."tag_history" validate constraint "tag_history_performed_by_fkey";

alter table "public"."tag_history" add constraint "tag_history_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE not valid;

alter table "public"."tag_history" validate constraint "tag_history_tag_id_fkey";

alter table "public"."tag_reports" add constraint "tag_reports_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE not valid;

alter table "public"."tag_reports" validate constraint "tag_reports_tag_id_fkey";

alter table "public"."tag_reports" add constraint "tag_reports_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."tag_reports" validate constraint "tag_reports_user_id_fkey";

alter table "public"."tag_votes" add constraint "tag_votes_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE not valid;

alter table "public"."tag_votes" validate constraint "tag_votes_tag_id_fkey";

alter table "public"."tag_votes" add constraint "tag_votes_tag_id_user_id_key" UNIQUE using index "tag_votes_tag_id_user_id_key";

alter table "public"."tag_votes" add constraint "tag_votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."tag_votes" validate constraint "tag_votes_user_id_fkey";

alter table "public"."tags" add constraint "tags_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."tags" validate constraint "tags_created_by_fkey";

alter table "public"."tags" add constraint "tags_name_key" UNIQUE using index "tags_name_key";

alter table "public"."user_achievements" add constraint "user_achievements_user_id_achievement_name_type_key" UNIQUE using index "user_achievements_user_id_achievement_name_type_key";

alter table "public"."user_achievements" add constraint "user_achievements_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."user_achievements" validate constraint "user_achievements_user_id_fkey";

alter table "public"."user_activity" add constraint "user_activity_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."user_activity" validate constraint "user_activity_user_id_fkey";

alter table "public"."user_bookmarks" add constraint "user_bookmarks_board_id_fkey" FOREIGN KEY (board_id) REFERENCES bingo_boards(id) ON DELETE CASCADE not valid;

alter table "public"."user_bookmarks" validate constraint "user_bookmarks_board_id_fkey";

alter table "public"."user_bookmarks" add constraint "user_bookmarks_unique" UNIQUE using index "user_bookmarks_unique";

alter table "public"."user_bookmarks" add constraint "user_bookmarks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."user_bookmarks" validate constraint "user_bookmarks_user_id_fkey";

alter table "public"."user_friends" add constraint "user_friends_check" CHECK ((user_id <> friend_id)) not valid;

alter table "public"."user_friends" validate constraint "user_friends_check";

alter table "public"."user_friends" add constraint "user_friends_friend_id_fkey" FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."user_friends" validate constraint "user_friends_friend_id_fkey";

alter table "public"."user_friends" add constraint "user_friends_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'blocked'::text]))) not valid;

alter table "public"."user_friends" validate constraint "user_friends_status_check";

alter table "public"."user_friends" add constraint "user_friends_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."user_friends" validate constraint "user_friends_user_id_fkey";

alter table "public"."user_sessions" add constraint "user_sessions_session_token_key" UNIQUE using index "user_sessions_session_token_key";

alter table "public"."user_sessions" add constraint "user_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."user_sessions" validate constraint "user_sessions_user_id_fkey";

alter table "public"."user_statistics" add constraint "user_statistics_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."user_statistics" validate constraint "user_statistics_user_id_fkey";

alter table "public"."user_statistics" add constraint "valid_completions" CHECK ((games_completed <= total_games)) not valid;

alter table "public"."user_statistics" validate constraint "valid_completions";

alter table "public"."user_statistics" add constraint "valid_games" CHECK ((total_games >= 0)) not valid;

alter table "public"."user_statistics" validate constraint "valid_games";

alter table "public"."user_statistics" add constraint "valid_streaks" CHECK (((current_win_streak >= 0) AND (longest_win_streak >= 0))) not valid;

alter table "public"."user_statistics" validate constraint "valid_streaks";

alter table "public"."user_statistics" add constraint "valid_wins" CHECK ((games_won <= total_games)) not valid;

alter table "public"."user_statistics" validate constraint "valid_wins";

alter table "public"."users" add constraint "users_auth_id_fkey" FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."users" validate constraint "users_auth_id_fkey";

alter table "public"."users" add constraint "users_auth_id_key" UNIQUE using index "users_auth_id_key";

alter table "public"."users" add constraint "users_username_key" UNIQUE using index "users_username_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.add_comment(p_discussion_id bigint, p_content text, p_author_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  new_comment_id BIGINT;
BEGIN
  INSERT INTO comments (discussion_id, content, author_id)
  VALUES (p_discussion_id, p_content, p_author_id)
  RETURNING id INTO new_comment_id;
  
  RETURN new_comment_id;
END;
$function$
;

create type "public"."board_cell" as ("cell_id" uuid, "text" text, "colors" text[], "completed_by" uuid[], "blocked" boolean, "is_marked" boolean, "version" integer, "last_updated" bigint, "last_modified_by" uuid);

create type "public"."board_settings" as ("team_mode" boolean, "lockout" boolean, "sound_enabled" boolean, "win_conditions" win_conditions);

CREATE OR REPLACE FUNCTION public.cleanup_expired_queue_entries()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Mark entries older than 10 minutes as expired
    UPDATE bingo_queue_entries
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'waiting' 
    AND created_at < NOW() - INTERVAL '10 minutes';
    
    -- Delete very old entries (older than 1 hour)
    DELETE FROM bingo_queue_entries
    WHERE status = 'expired' 
    AND updated_at < NOW() - INTERVAL '1 hour';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_session_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.session_code IS NULL THEN
        -- Generate 6-character alphanumeric code
        NEW.session_code := UPPER(LEFT(MD5(RANDOM()::TEXT || NEW.id::TEXT), 6));
        
        -- Ensure uniqueness (retry up to 10 times if collision)
        -- Use a counter to prevent infinite loops
        DECLARE
            attempts INT := 0;
        BEGIN
            WHILE attempts < 10 AND EXISTS (
                SELECT 1 FROM bingo_sessions 
                WHERE session_code = NEW.session_code AND id != NEW.id
            ) LOOP
                NEW.session_code := UPPER(LEFT(MD5(RANDOM()::TEXT || NEW.id::TEXT || attempts::TEXT), 6));
                attempts := attempts + 1;
            END LOOP;
        END;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.users (
    auth_id,
    username,
    full_name,
    avatar_url
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_discussion_upvotes(discussion_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  UPDATE discussions 
  SET upvotes = upvotes + 1 
  WHERE id = discussion_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_session_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Only increment version when current_state changes
    IF NEW.current_state IS DISTINCT FROM OLD.current_state THEN
        NEW.version := COALESCE(OLD.version, 0) + 1;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Use a security definer function to bypass RLS when checking admin status
  -- This approach directly checks the role without triggering RLS on users table
  RETURN EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE auth_id = auth.uid() 
    AND role = 'admin'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$function$
;

create or replace view "public"."leaderboards" as  SELECT u.id,
    u.username,
    u.avatar_url,
    COALESCE(stats.total_score, (0)::bigint) AS total_score,
    COALESCE(stats.games_played, (0)::bigint) AS games_played,
    COALESCE(stats.wins, (0)::bigint) AS wins,
        CASE
            WHEN (COALESCE(stats.games_played, (0)::bigint) > 0) THEN round((((COALESCE(stats.wins, (0)::bigint))::numeric / (stats.games_played)::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS win_rate,
    COALESCE(stats.avg_score, (0)::numeric) AS avg_score,
        CASE
            WHEN (COALESCE(stats.games_played, (0)::bigint) > 0) THEN round(((COALESCE(stats.total_score, (0)::bigint))::numeric / (stats.games_played)::numeric), 2)
            ELSE (0)::numeric
        END AS points_per_game,
    COALESCE(stats.best_score, 0) AS best_streak,
    COALESCE(stats.fastest_win, (0)::numeric) AS fastest_win,
    stats.last_game_at,
    u.updated_at
   FROM (users u
     LEFT JOIN ( SELECT p.user_id,
            sum(p.score) AS total_score,
            count(DISTINCT s.id) AS games_played,
            count(DISTINCT
                CASE
                    WHEN (s.winner_id = p.user_id) THEN s.id
                    ELSE NULL::uuid
                END) AS wins,
            round(avg(p.score), 2) AS avg_score,
            max(p.score) AS best_score,
            min(
                CASE
                    WHEN (s.winner_id = p.user_id) THEN EXTRACT(epoch FROM (s.ended_at - s.started_at))
                    ELSE NULL::numeric
                END) AS fastest_win,
            max(s.ended_at) AS last_game_at
           FROM (bingo_session_players p
             JOIN bingo_sessions s ON ((p.session_id = s.id)))
          WHERE (s.status = 'completed'::session_status)
          GROUP BY p.user_id) stats ON ((u.id = stats.user_id)));


CREATE OR REPLACE FUNCTION public.log_user_activity(p_user_id uuid, p_activity_type activity_type, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO user_activity (user_id, activity_type, data)
  VALUES (p_user_id, p_activity_type, p_data)
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$function$
;

create or replace view "public"."public_boards" as  SELECT b.id,
    b.title,
    b.description,
    b.creator_id,
    b.size,
    b.settings,
    b.game_type,
    b.difficulty,
    b.is_public,
    b.status,
    b.votes,
    b.bookmarked_count,
    b.version,
    b.cloned_from,
    b.created_at,
    b.updated_at,
    b.board_state,
    u.username AS creator_username,
    u.avatar_url AS creator_avatar,
    count(bb.board_id) AS bookmark_count
   FROM ((bingo_boards b
     LEFT JOIN users u ON ((b.creator_id = u.id)))
     LEFT JOIN board_bookmarks bb ON ((b.id = bb.board_id)))
  WHERE ((b.is_public = true) AND (b.status = 'active'::board_status))
  GROUP BY b.id, u.username, u.avatar_url;


create type "public"."session_settings" as ("max_players" integer, "allow_spectators" boolean, "auto_start" boolean, "time_limit" integer, "require_approval" boolean, "password" text);

create or replace view "public"."session_stats" as  SELECT s.id,
    s.board_id,
    s.host_id,
    s.session_code,
    s.settings,
    s.status,
    s.winner_id,
    s.started_at,
    s.ended_at,
    s.created_at,
    s.updated_at,
    s.version,
    s.current_state,
    b.title AS board_title,
    h.username AS host_username,
    count(sp.id) AS current_player_count
   FROM (((bingo_sessions s
     LEFT JOIN bingo_boards b ON ((s.board_id = b.id)))
     LEFT JOIN users h ON ((s.host_id = h.id)))
     LEFT JOIN bingo_session_players sp ON (((s.id = sp.session_id) AND (sp.left_at IS NULL))))
  GROUP BY s.id, b.title, h.username;


create type "public"."tag_category" as ("id" text, "name" text, "is_required" boolean, "allow_multiple" boolean, "valid_for_games" text[]);

CREATE OR REPLACE FUNCTION public.update_board_votes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bingo_boards 
    SET votes = votes + CASE WHEN NEW.vote = 'up' THEN 1 ELSE -1 END
    WHERE id = NEW.board_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE bingo_boards 
    SET votes = votes - CASE WHEN OLD.vote = 'up' THEN 1 ELSE -1 END + CASE WHEN NEW.vote = 'up' THEN 1 ELSE -1 END
    WHERE id = NEW.board_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bingo_boards 
    SET votes = votes - CASE WHEN OLD.vote = 'up' THEN 1 ELSE -1 END
    WHERE id = OLD.board_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_bookmark_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bingo_boards 
    SET bookmarked_count = bookmarked_count + 1
    WHERE id = NEW.board_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bingo_boards 
    SET bookmarked_count = bookmarked_count - 1
    WHERE id = OLD.board_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_tag_votes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags 
    SET votes = votes + CASE WHEN NEW.vote = 'up' THEN 1 ELSE -1 END
    WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse old vote and apply new vote
    UPDATE tags 
    SET votes = votes - CASE WHEN OLD.vote = 'up' THEN 1 ELSE -1 END + CASE WHEN NEW.vote = 'up' THEN 1 ELSE -1 END
    WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags 
    SET votes = votes - CASE WHEN OLD.vote = 'up' THEN 1 ELSE -1 END
    WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_statistics()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    was_winner BOOLEAN;
    prev_stats RECORD;
    new_win_streak INTEGER;
BEGIN
    -- Check if this user won the game
    was_winner := (
        SELECT winner_id = NEW.user_id 
        FROM bingo_sessions 
        WHERE id = NEW.session_id
    );
    
    -- Get current stats
    SELECT * INTO prev_stats 
    FROM user_statistics 
    WHERE user_id = NEW.user_id;
    
    -- Calculate new win streak
    IF was_winner THEN
        new_win_streak := COALESCE(prev_stats.current_win_streak, 0) + 1;
    ELSE
        new_win_streak := 0;
    END IF;
    
    -- Insert or update statistics
    INSERT INTO user_statistics (
        user_id,
        total_games,
        games_won,
        games_completed,
        total_score,
        highest_score,
        average_score,
        fastest_win,
        total_playtime,
        current_win_streak,
        longest_win_streak,
        last_game_at
    )
    VALUES (
        NEW.user_id,
        1,
        CASE WHEN was_winner THEN 1 ELSE 0 END,
        1,
        NEW.final_score,
        NEW.final_score,
        NEW.final_score,
        CASE WHEN was_winner THEN NEW.time_to_win ELSE NULL END,
        COALESCE(NEW.time_to_win, 0),
        new_win_streak,
        new_win_streak,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_games = user_statistics.total_games + 1,
        games_won = user_statistics.games_won + CASE WHEN was_winner THEN 1 ELSE 0 END,
        games_completed = user_statistics.games_completed + 1,
        total_score = user_statistics.total_score + NEW.final_score,
        highest_score = GREATEST(user_statistics.highest_score, NEW.final_score),
        average_score = (user_statistics.total_score + NEW.final_score) / (user_statistics.total_games + 1),
        fastest_win = CASE 
            WHEN was_winner AND NEW.time_to_win IS NOT NULL THEN 
                CASE 
                    WHEN user_statistics.fastest_win IS NULL THEN NEW.time_to_win
                    ELSE LEAST(user_statistics.fastest_win, NEW.time_to_win)
                END
            ELSE user_statistics.fastest_win
        END,
        total_playtime = user_statistics.total_playtime + COALESCE(NEW.time_to_win, 0),
        current_win_streak = new_win_streak,
        longest_win_streak = GREATEST(user_statistics.longest_win_streak, new_win_streak),
        last_game_at = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_statistics_updated_at_func()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
        BEGIN
            NEW.updated_at = timezone('utc'::text, now());
            RETURN NEW;
        END;
        $function$
;

create type "public"."win_conditions" as ("line" boolean, "majority" boolean, "diagonal" boolean, "corners" boolean);

grant delete on table "public"."bingo_boards" to "anon";

grant insert on table "public"."bingo_boards" to "anon";

grant references on table "public"."bingo_boards" to "anon";

grant select on table "public"."bingo_boards" to "anon";

grant trigger on table "public"."bingo_boards" to "anon";

grant truncate on table "public"."bingo_boards" to "anon";

grant update on table "public"."bingo_boards" to "anon";

grant delete on table "public"."bingo_boards" to "authenticated";

grant insert on table "public"."bingo_boards" to "authenticated";

grant references on table "public"."bingo_boards" to "authenticated";

grant select on table "public"."bingo_boards" to "authenticated";

grant trigger on table "public"."bingo_boards" to "authenticated";

grant truncate on table "public"."bingo_boards" to "authenticated";

grant update on table "public"."bingo_boards" to "authenticated";

grant delete on table "public"."bingo_boards" to "service_role";

grant insert on table "public"."bingo_boards" to "service_role";

grant references on table "public"."bingo_boards" to "service_role";

grant select on table "public"."bingo_boards" to "service_role";

grant trigger on table "public"."bingo_boards" to "service_role";

grant truncate on table "public"."bingo_boards" to "service_role";

grant update on table "public"."bingo_boards" to "service_role";

grant delete on table "public"."bingo_cards" to "anon";

grant insert on table "public"."bingo_cards" to "anon";

grant references on table "public"."bingo_cards" to "anon";

grant select on table "public"."bingo_cards" to "anon";

grant trigger on table "public"."bingo_cards" to "anon";

grant truncate on table "public"."bingo_cards" to "anon";

grant update on table "public"."bingo_cards" to "anon";

grant delete on table "public"."bingo_cards" to "authenticated";

grant insert on table "public"."bingo_cards" to "authenticated";

grant references on table "public"."bingo_cards" to "authenticated";

grant select on table "public"."bingo_cards" to "authenticated";

grant trigger on table "public"."bingo_cards" to "authenticated";

grant truncate on table "public"."bingo_cards" to "authenticated";

grant update on table "public"."bingo_cards" to "authenticated";

grant delete on table "public"."bingo_cards" to "service_role";

grant insert on table "public"."bingo_cards" to "service_role";

grant references on table "public"."bingo_cards" to "service_role";

grant select on table "public"."bingo_cards" to "service_role";

grant trigger on table "public"."bingo_cards" to "service_role";

grant truncate on table "public"."bingo_cards" to "service_role";

grant update on table "public"."bingo_cards" to "service_role";

grant delete on table "public"."bingo_queue_entries" to "anon";

grant insert on table "public"."bingo_queue_entries" to "anon";

grant references on table "public"."bingo_queue_entries" to "anon";

grant select on table "public"."bingo_queue_entries" to "anon";

grant trigger on table "public"."bingo_queue_entries" to "anon";

grant truncate on table "public"."bingo_queue_entries" to "anon";

grant update on table "public"."bingo_queue_entries" to "anon";

grant delete on table "public"."bingo_queue_entries" to "authenticated";

grant insert on table "public"."bingo_queue_entries" to "authenticated";

grant references on table "public"."bingo_queue_entries" to "authenticated";

grant select on table "public"."bingo_queue_entries" to "authenticated";

grant trigger on table "public"."bingo_queue_entries" to "authenticated";

grant truncate on table "public"."bingo_queue_entries" to "authenticated";

grant update on table "public"."bingo_queue_entries" to "authenticated";

grant delete on table "public"."bingo_queue_entries" to "service_role";

grant insert on table "public"."bingo_queue_entries" to "service_role";

grant references on table "public"."bingo_queue_entries" to "service_role";

grant select on table "public"."bingo_queue_entries" to "service_role";

grant trigger on table "public"."bingo_queue_entries" to "service_role";

grant truncate on table "public"."bingo_queue_entries" to "service_role";

grant update on table "public"."bingo_queue_entries" to "service_role";

grant delete on table "public"."bingo_session_cells" to "anon";

grant insert on table "public"."bingo_session_cells" to "anon";

grant references on table "public"."bingo_session_cells" to "anon";

grant select on table "public"."bingo_session_cells" to "anon";

grant trigger on table "public"."bingo_session_cells" to "anon";

grant truncate on table "public"."bingo_session_cells" to "anon";

grant update on table "public"."bingo_session_cells" to "anon";

grant delete on table "public"."bingo_session_cells" to "authenticated";

grant insert on table "public"."bingo_session_cells" to "authenticated";

grant references on table "public"."bingo_session_cells" to "authenticated";

grant select on table "public"."bingo_session_cells" to "authenticated";

grant trigger on table "public"."bingo_session_cells" to "authenticated";

grant truncate on table "public"."bingo_session_cells" to "authenticated";

grant update on table "public"."bingo_session_cells" to "authenticated";

grant delete on table "public"."bingo_session_cells" to "service_role";

grant insert on table "public"."bingo_session_cells" to "service_role";

grant references on table "public"."bingo_session_cells" to "service_role";

grant select on table "public"."bingo_session_cells" to "service_role";

grant trigger on table "public"."bingo_session_cells" to "service_role";

grant truncate on table "public"."bingo_session_cells" to "service_role";

grant update on table "public"."bingo_session_cells" to "service_role";

grant delete on table "public"."bingo_session_events" to "anon";

grant insert on table "public"."bingo_session_events" to "anon";

grant references on table "public"."bingo_session_events" to "anon";

grant select on table "public"."bingo_session_events" to "anon";

grant trigger on table "public"."bingo_session_events" to "anon";

grant truncate on table "public"."bingo_session_events" to "anon";

grant update on table "public"."bingo_session_events" to "anon";

grant delete on table "public"."bingo_session_events" to "authenticated";

grant insert on table "public"."bingo_session_events" to "authenticated";

grant references on table "public"."bingo_session_events" to "authenticated";

grant select on table "public"."bingo_session_events" to "authenticated";

grant trigger on table "public"."bingo_session_events" to "authenticated";

grant truncate on table "public"."bingo_session_events" to "authenticated";

grant update on table "public"."bingo_session_events" to "authenticated";

grant delete on table "public"."bingo_session_events" to "service_role";

grant insert on table "public"."bingo_session_events" to "service_role";

grant references on table "public"."bingo_session_events" to "service_role";

grant select on table "public"."bingo_session_events" to "service_role";

grant trigger on table "public"."bingo_session_events" to "service_role";

grant truncate on table "public"."bingo_session_events" to "service_role";

grant update on table "public"."bingo_session_events" to "service_role";

grant delete on table "public"."bingo_session_players" to "anon";

grant insert on table "public"."bingo_session_players" to "anon";

grant references on table "public"."bingo_session_players" to "anon";

grant select on table "public"."bingo_session_players" to "anon";

grant trigger on table "public"."bingo_session_players" to "anon";

grant truncate on table "public"."bingo_session_players" to "anon";

grant update on table "public"."bingo_session_players" to "anon";

grant delete on table "public"."bingo_session_players" to "authenticated";

grant insert on table "public"."bingo_session_players" to "authenticated";

grant references on table "public"."bingo_session_players" to "authenticated";

grant select on table "public"."bingo_session_players" to "authenticated";

grant trigger on table "public"."bingo_session_players" to "authenticated";

grant truncate on table "public"."bingo_session_players" to "authenticated";

grant update on table "public"."bingo_session_players" to "authenticated";

grant delete on table "public"."bingo_session_players" to "service_role";

grant insert on table "public"."bingo_session_players" to "service_role";

grant references on table "public"."bingo_session_players" to "service_role";

grant select on table "public"."bingo_session_players" to "service_role";

grant trigger on table "public"."bingo_session_players" to "service_role";

grant truncate on table "public"."bingo_session_players" to "service_role";

grant update on table "public"."bingo_session_players" to "service_role";

grant delete on table "public"."bingo_session_queue" to "anon";

grant insert on table "public"."bingo_session_queue" to "anon";

grant references on table "public"."bingo_session_queue" to "anon";

grant select on table "public"."bingo_session_queue" to "anon";

grant trigger on table "public"."bingo_session_queue" to "anon";

grant truncate on table "public"."bingo_session_queue" to "anon";

grant update on table "public"."bingo_session_queue" to "anon";

grant delete on table "public"."bingo_session_queue" to "authenticated";

grant insert on table "public"."bingo_session_queue" to "authenticated";

grant references on table "public"."bingo_session_queue" to "authenticated";

grant select on table "public"."bingo_session_queue" to "authenticated";

grant trigger on table "public"."bingo_session_queue" to "authenticated";

grant truncate on table "public"."bingo_session_queue" to "authenticated";

grant update on table "public"."bingo_session_queue" to "authenticated";

grant delete on table "public"."bingo_session_queue" to "service_role";

grant insert on table "public"."bingo_session_queue" to "service_role";

grant references on table "public"."bingo_session_queue" to "service_role";

grant select on table "public"."bingo_session_queue" to "service_role";

grant trigger on table "public"."bingo_session_queue" to "service_role";

grant truncate on table "public"."bingo_session_queue" to "service_role";

grant update on table "public"."bingo_session_queue" to "service_role";

grant delete on table "public"."bingo_sessions" to "anon";

grant insert on table "public"."bingo_sessions" to "anon";

grant references on table "public"."bingo_sessions" to "anon";

grant select on table "public"."bingo_sessions" to "anon";

grant trigger on table "public"."bingo_sessions" to "anon";

grant truncate on table "public"."bingo_sessions" to "anon";

grant update on table "public"."bingo_sessions" to "anon";

grant delete on table "public"."bingo_sessions" to "authenticated";

grant insert on table "public"."bingo_sessions" to "authenticated";

grant references on table "public"."bingo_sessions" to "authenticated";

grant select on table "public"."bingo_sessions" to "authenticated";

grant trigger on table "public"."bingo_sessions" to "authenticated";

grant truncate on table "public"."bingo_sessions" to "authenticated";

grant update on table "public"."bingo_sessions" to "authenticated";

grant delete on table "public"."bingo_sessions" to "service_role";

grant insert on table "public"."bingo_sessions" to "service_role";

grant references on table "public"."bingo_sessions" to "service_role";

grant select on table "public"."bingo_sessions" to "service_role";

grant trigger on table "public"."bingo_sessions" to "service_role";

grant truncate on table "public"."bingo_sessions" to "service_role";

grant update on table "public"."bingo_sessions" to "service_role";

grant delete on table "public"."board_bookmarks" to "anon";

grant insert on table "public"."board_bookmarks" to "anon";

grant references on table "public"."board_bookmarks" to "anon";

grant select on table "public"."board_bookmarks" to "anon";

grant trigger on table "public"."board_bookmarks" to "anon";

grant truncate on table "public"."board_bookmarks" to "anon";

grant update on table "public"."board_bookmarks" to "anon";

grant delete on table "public"."board_bookmarks" to "authenticated";

grant insert on table "public"."board_bookmarks" to "authenticated";

grant references on table "public"."board_bookmarks" to "authenticated";

grant select on table "public"."board_bookmarks" to "authenticated";

grant trigger on table "public"."board_bookmarks" to "authenticated";

grant truncate on table "public"."board_bookmarks" to "authenticated";

grant update on table "public"."board_bookmarks" to "authenticated";

grant delete on table "public"."board_bookmarks" to "service_role";

grant insert on table "public"."board_bookmarks" to "service_role";

grant references on table "public"."board_bookmarks" to "service_role";

grant select on table "public"."board_bookmarks" to "service_role";

grant trigger on table "public"."board_bookmarks" to "service_role";

grant truncate on table "public"."board_bookmarks" to "service_role";

grant update on table "public"."board_bookmarks" to "service_role";

grant delete on table "public"."board_votes" to "anon";

grant insert on table "public"."board_votes" to "anon";

grant references on table "public"."board_votes" to "anon";

grant select on table "public"."board_votes" to "anon";

grant trigger on table "public"."board_votes" to "anon";

grant truncate on table "public"."board_votes" to "anon";

grant update on table "public"."board_votes" to "anon";

grant delete on table "public"."board_votes" to "authenticated";

grant insert on table "public"."board_votes" to "authenticated";

grant references on table "public"."board_votes" to "authenticated";

grant select on table "public"."board_votes" to "authenticated";

grant trigger on table "public"."board_votes" to "authenticated";

grant truncate on table "public"."board_votes" to "authenticated";

grant update on table "public"."board_votes" to "authenticated";

grant delete on table "public"."board_votes" to "service_role";

grant insert on table "public"."board_votes" to "service_role";

grant references on table "public"."board_votes" to "service_role";

grant select on table "public"."board_votes" to "service_role";

grant trigger on table "public"."board_votes" to "service_role";

grant truncate on table "public"."board_votes" to "service_role";

grant update on table "public"."board_votes" to "service_role";

grant delete on table "public"."card_votes" to "anon";

grant insert on table "public"."card_votes" to "anon";

grant references on table "public"."card_votes" to "anon";

grant select on table "public"."card_votes" to "anon";

grant trigger on table "public"."card_votes" to "anon";

grant truncate on table "public"."card_votes" to "anon";

grant update on table "public"."card_votes" to "anon";

grant delete on table "public"."card_votes" to "authenticated";

grant insert on table "public"."card_votes" to "authenticated";

grant references on table "public"."card_votes" to "authenticated";

grant select on table "public"."card_votes" to "authenticated";

grant trigger on table "public"."card_votes" to "authenticated";

grant truncate on table "public"."card_votes" to "authenticated";

grant update on table "public"."card_votes" to "authenticated";

grant delete on table "public"."card_votes" to "service_role";

grant insert on table "public"."card_votes" to "service_role";

grant references on table "public"."card_votes" to "service_role";

grant select on table "public"."card_votes" to "service_role";

grant trigger on table "public"."card_votes" to "service_role";

grant truncate on table "public"."card_votes" to "service_role";

grant update on table "public"."card_votes" to "service_role";

grant delete on table "public"."categories" to "anon";

grant insert on table "public"."categories" to "anon";

grant references on table "public"."categories" to "anon";

grant select on table "public"."categories" to "anon";

grant trigger on table "public"."categories" to "anon";

grant truncate on table "public"."categories" to "anon";

grant update on table "public"."categories" to "anon";

grant delete on table "public"."categories" to "authenticated";

grant insert on table "public"."categories" to "authenticated";

grant references on table "public"."categories" to "authenticated";

grant select on table "public"."categories" to "authenticated";

grant trigger on table "public"."categories" to "authenticated";

grant truncate on table "public"."categories" to "authenticated";

grant update on table "public"."categories" to "authenticated";

grant delete on table "public"."categories" to "service_role";

grant insert on table "public"."categories" to "service_role";

grant references on table "public"."categories" to "service_role";

grant select on table "public"."categories" to "service_role";

grant trigger on table "public"."categories" to "service_role";

grant truncate on table "public"."categories" to "service_role";

grant update on table "public"."categories" to "service_role";

grant delete on table "public"."challenge_tags" to "anon";

grant insert on table "public"."challenge_tags" to "anon";

grant references on table "public"."challenge_tags" to "anon";

grant select on table "public"."challenge_tags" to "anon";

grant trigger on table "public"."challenge_tags" to "anon";

grant truncate on table "public"."challenge_tags" to "anon";

grant update on table "public"."challenge_tags" to "anon";

grant delete on table "public"."challenge_tags" to "authenticated";

grant insert on table "public"."challenge_tags" to "authenticated";

grant references on table "public"."challenge_tags" to "authenticated";

grant select on table "public"."challenge_tags" to "authenticated";

grant trigger on table "public"."challenge_tags" to "authenticated";

grant truncate on table "public"."challenge_tags" to "authenticated";

grant update on table "public"."challenge_tags" to "authenticated";

grant delete on table "public"."challenge_tags" to "service_role";

grant insert on table "public"."challenge_tags" to "service_role";

grant references on table "public"."challenge_tags" to "service_role";

grant select on table "public"."challenge_tags" to "service_role";

grant trigger on table "public"."challenge_tags" to "service_role";

grant truncate on table "public"."challenge_tags" to "service_role";

grant update on table "public"."challenge_tags" to "service_role";

grant delete on table "public"."challenges" to "anon";

grant insert on table "public"."challenges" to "anon";

grant references on table "public"."challenges" to "anon";

grant select on table "public"."challenges" to "anon";

grant trigger on table "public"."challenges" to "anon";

grant truncate on table "public"."challenges" to "anon";

grant update on table "public"."challenges" to "anon";

grant delete on table "public"."challenges" to "authenticated";

grant insert on table "public"."challenges" to "authenticated";

grant references on table "public"."challenges" to "authenticated";

grant select on table "public"."challenges" to "authenticated";

grant trigger on table "public"."challenges" to "authenticated";

grant truncate on table "public"."challenges" to "authenticated";

grant update on table "public"."challenges" to "authenticated";

grant delete on table "public"."challenges" to "service_role";

grant insert on table "public"."challenges" to "service_role";

grant references on table "public"."challenges" to "service_role";

grant select on table "public"."challenges" to "service_role";

grant trigger on table "public"."challenges" to "service_role";

grant truncate on table "public"."challenges" to "service_role";

grant update on table "public"."challenges" to "service_role";

grant delete on table "public"."comments" to "anon";

grant insert on table "public"."comments" to "anon";

grant references on table "public"."comments" to "anon";

grant select on table "public"."comments" to "anon";

grant trigger on table "public"."comments" to "anon";

grant truncate on table "public"."comments" to "anon";

grant update on table "public"."comments" to "anon";

grant delete on table "public"."comments" to "authenticated";

grant insert on table "public"."comments" to "authenticated";

grant references on table "public"."comments" to "authenticated";

grant select on table "public"."comments" to "authenticated";

grant trigger on table "public"."comments" to "authenticated";

grant truncate on table "public"."comments" to "authenticated";

grant update on table "public"."comments" to "authenticated";

grant delete on table "public"."comments" to "service_role";

grant insert on table "public"."comments" to "service_role";

grant references on table "public"."comments" to "service_role";

grant select on table "public"."comments" to "service_role";

grant trigger on table "public"."comments" to "service_role";

grant truncate on table "public"."comments" to "service_role";

grant update on table "public"."comments" to "service_role";

grant delete on table "public"."community_event_participants" to "anon";

grant insert on table "public"."community_event_participants" to "anon";

grant references on table "public"."community_event_participants" to "anon";

grant select on table "public"."community_event_participants" to "anon";

grant trigger on table "public"."community_event_participants" to "anon";

grant truncate on table "public"."community_event_participants" to "anon";

grant update on table "public"."community_event_participants" to "anon";

grant delete on table "public"."community_event_participants" to "authenticated";

grant insert on table "public"."community_event_participants" to "authenticated";

grant references on table "public"."community_event_participants" to "authenticated";

grant select on table "public"."community_event_participants" to "authenticated";

grant trigger on table "public"."community_event_participants" to "authenticated";

grant truncate on table "public"."community_event_participants" to "authenticated";

grant update on table "public"."community_event_participants" to "authenticated";

grant delete on table "public"."community_event_participants" to "service_role";

grant insert on table "public"."community_event_participants" to "service_role";

grant references on table "public"."community_event_participants" to "service_role";

grant select on table "public"."community_event_participants" to "service_role";

grant trigger on table "public"."community_event_participants" to "service_role";

grant truncate on table "public"."community_event_participants" to "service_role";

grant update on table "public"."community_event_participants" to "service_role";

grant delete on table "public"."community_event_tags" to "anon";

grant insert on table "public"."community_event_tags" to "anon";

grant references on table "public"."community_event_tags" to "anon";

grant select on table "public"."community_event_tags" to "anon";

grant trigger on table "public"."community_event_tags" to "anon";

grant truncate on table "public"."community_event_tags" to "anon";

grant update on table "public"."community_event_tags" to "anon";

grant delete on table "public"."community_event_tags" to "authenticated";

grant insert on table "public"."community_event_tags" to "authenticated";

grant references on table "public"."community_event_tags" to "authenticated";

grant select on table "public"."community_event_tags" to "authenticated";

grant trigger on table "public"."community_event_tags" to "authenticated";

grant truncate on table "public"."community_event_tags" to "authenticated";

grant update on table "public"."community_event_tags" to "authenticated";

grant delete on table "public"."community_event_tags" to "service_role";

grant insert on table "public"."community_event_tags" to "service_role";

grant references on table "public"."community_event_tags" to "service_role";

grant select on table "public"."community_event_tags" to "service_role";

grant trigger on table "public"."community_event_tags" to "service_role";

grant truncate on table "public"."community_event_tags" to "service_role";

grant update on table "public"."community_event_tags" to "service_role";

grant delete on table "public"."community_events" to "anon";

grant insert on table "public"."community_events" to "anon";

grant references on table "public"."community_events" to "anon";

grant select on table "public"."community_events" to "anon";

grant trigger on table "public"."community_events" to "anon";

grant truncate on table "public"."community_events" to "anon";

grant update on table "public"."community_events" to "anon";

grant delete on table "public"."community_events" to "authenticated";

grant insert on table "public"."community_events" to "authenticated";

grant references on table "public"."community_events" to "authenticated";

grant select on table "public"."community_events" to "authenticated";

grant trigger on table "public"."community_events" to "authenticated";

grant truncate on table "public"."community_events" to "authenticated";

grant update on table "public"."community_events" to "authenticated";

grant delete on table "public"."community_events" to "service_role";

grant insert on table "public"."community_events" to "service_role";

grant references on table "public"."community_events" to "service_role";

grant select on table "public"."community_events" to "service_role";

grant trigger on table "public"."community_events" to "service_role";

grant truncate on table "public"."community_events" to "service_role";

grant update on table "public"."community_events" to "service_role";

grant delete on table "public"."discussions" to "anon";

grant insert on table "public"."discussions" to "anon";

grant references on table "public"."discussions" to "anon";

grant select on table "public"."discussions" to "anon";

grant trigger on table "public"."discussions" to "anon";

grant truncate on table "public"."discussions" to "anon";

grant update on table "public"."discussions" to "anon";

grant delete on table "public"."discussions" to "authenticated";

grant insert on table "public"."discussions" to "authenticated";

grant references on table "public"."discussions" to "authenticated";

grant select on table "public"."discussions" to "authenticated";

grant trigger on table "public"."discussions" to "authenticated";

grant truncate on table "public"."discussions" to "authenticated";

grant update on table "public"."discussions" to "authenticated";

grant delete on table "public"."discussions" to "service_role";

grant insert on table "public"."discussions" to "service_role";

grant references on table "public"."discussions" to "service_role";

grant select on table "public"."discussions" to "service_role";

grant trigger on table "public"."discussions" to "service_role";

grant truncate on table "public"."discussions" to "service_role";

grant update on table "public"."discussions" to "service_role";

grant delete on table "public"."game_results" to "anon";

grant insert on table "public"."game_results" to "anon";

grant references on table "public"."game_results" to "anon";

grant select on table "public"."game_results" to "anon";

grant trigger on table "public"."game_results" to "anon";

grant truncate on table "public"."game_results" to "anon";

grant update on table "public"."game_results" to "anon";

grant delete on table "public"."game_results" to "authenticated";

grant insert on table "public"."game_results" to "authenticated";

grant references on table "public"."game_results" to "authenticated";

grant select on table "public"."game_results" to "authenticated";

grant trigger on table "public"."game_results" to "authenticated";

grant truncate on table "public"."game_results" to "authenticated";

grant update on table "public"."game_results" to "authenticated";

grant delete on table "public"."game_results" to "service_role";

grant insert on table "public"."game_results" to "service_role";

grant references on table "public"."game_results" to "service_role";

grant select on table "public"."game_results" to "service_role";

grant trigger on table "public"."game_results" to "service_role";

grant truncate on table "public"."game_results" to "service_role";

grant update on table "public"."game_results" to "service_role";

grant delete on table "public"."submissions" to "anon";

grant insert on table "public"."submissions" to "anon";

grant references on table "public"."submissions" to "anon";

grant select on table "public"."submissions" to "anon";

grant trigger on table "public"."submissions" to "anon";

grant truncate on table "public"."submissions" to "anon";

grant update on table "public"."submissions" to "anon";

grant delete on table "public"."submissions" to "authenticated";

grant insert on table "public"."submissions" to "authenticated";

grant references on table "public"."submissions" to "authenticated";

grant select on table "public"."submissions" to "authenticated";

grant trigger on table "public"."submissions" to "authenticated";

grant truncate on table "public"."submissions" to "authenticated";

grant update on table "public"."submissions" to "authenticated";

grant delete on table "public"."submissions" to "service_role";

grant insert on table "public"."submissions" to "service_role";

grant references on table "public"."submissions" to "service_role";

grant select on table "public"."submissions" to "service_role";

grant trigger on table "public"."submissions" to "service_role";

grant truncate on table "public"."submissions" to "service_role";

grant update on table "public"."submissions" to "service_role";

grant delete on table "public"."tag_history" to "anon";

grant insert on table "public"."tag_history" to "anon";

grant references on table "public"."tag_history" to "anon";

grant select on table "public"."tag_history" to "anon";

grant trigger on table "public"."tag_history" to "anon";

grant truncate on table "public"."tag_history" to "anon";

grant update on table "public"."tag_history" to "anon";

grant delete on table "public"."tag_history" to "authenticated";

grant insert on table "public"."tag_history" to "authenticated";

grant references on table "public"."tag_history" to "authenticated";

grant select on table "public"."tag_history" to "authenticated";

grant trigger on table "public"."tag_history" to "authenticated";

grant truncate on table "public"."tag_history" to "authenticated";

grant update on table "public"."tag_history" to "authenticated";

grant delete on table "public"."tag_history" to "service_role";

grant insert on table "public"."tag_history" to "service_role";

grant references on table "public"."tag_history" to "service_role";

grant select on table "public"."tag_history" to "service_role";

grant trigger on table "public"."tag_history" to "service_role";

grant truncate on table "public"."tag_history" to "service_role";

grant update on table "public"."tag_history" to "service_role";

grant delete on table "public"."tag_reports" to "anon";

grant insert on table "public"."tag_reports" to "anon";

grant references on table "public"."tag_reports" to "anon";

grant select on table "public"."tag_reports" to "anon";

grant trigger on table "public"."tag_reports" to "anon";

grant truncate on table "public"."tag_reports" to "anon";

grant update on table "public"."tag_reports" to "anon";

grant delete on table "public"."tag_reports" to "authenticated";

grant insert on table "public"."tag_reports" to "authenticated";

grant references on table "public"."tag_reports" to "authenticated";

grant select on table "public"."tag_reports" to "authenticated";

grant trigger on table "public"."tag_reports" to "authenticated";

grant truncate on table "public"."tag_reports" to "authenticated";

grant update on table "public"."tag_reports" to "authenticated";

grant delete on table "public"."tag_reports" to "service_role";

grant insert on table "public"."tag_reports" to "service_role";

grant references on table "public"."tag_reports" to "service_role";

grant select on table "public"."tag_reports" to "service_role";

grant trigger on table "public"."tag_reports" to "service_role";

grant truncate on table "public"."tag_reports" to "service_role";

grant update on table "public"."tag_reports" to "service_role";

grant delete on table "public"."tag_votes" to "anon";

grant insert on table "public"."tag_votes" to "anon";

grant references on table "public"."tag_votes" to "anon";

grant select on table "public"."tag_votes" to "anon";

grant trigger on table "public"."tag_votes" to "anon";

grant truncate on table "public"."tag_votes" to "anon";

grant update on table "public"."tag_votes" to "anon";

grant delete on table "public"."tag_votes" to "authenticated";

grant insert on table "public"."tag_votes" to "authenticated";

grant references on table "public"."tag_votes" to "authenticated";

grant select on table "public"."tag_votes" to "authenticated";

grant trigger on table "public"."tag_votes" to "authenticated";

grant truncate on table "public"."tag_votes" to "authenticated";

grant update on table "public"."tag_votes" to "authenticated";

grant delete on table "public"."tag_votes" to "service_role";

grant insert on table "public"."tag_votes" to "service_role";

grant references on table "public"."tag_votes" to "service_role";

grant select on table "public"."tag_votes" to "service_role";

grant trigger on table "public"."tag_votes" to "service_role";

grant truncate on table "public"."tag_votes" to "service_role";

grant update on table "public"."tag_votes" to "service_role";

grant delete on table "public"."tags" to "anon";

grant insert on table "public"."tags" to "anon";

grant references on table "public"."tags" to "anon";

grant select on table "public"."tags" to "anon";

grant trigger on table "public"."tags" to "anon";

grant truncate on table "public"."tags" to "anon";

grant update on table "public"."tags" to "anon";

grant delete on table "public"."tags" to "authenticated";

grant insert on table "public"."tags" to "authenticated";

grant references on table "public"."tags" to "authenticated";

grant select on table "public"."tags" to "authenticated";

grant trigger on table "public"."tags" to "authenticated";

grant truncate on table "public"."tags" to "authenticated";

grant update on table "public"."tags" to "authenticated";

grant delete on table "public"."tags" to "service_role";

grant insert on table "public"."tags" to "service_role";

grant references on table "public"."tags" to "service_role";

grant select on table "public"."tags" to "service_role";

grant trigger on table "public"."tags" to "service_role";

grant truncate on table "public"."tags" to "service_role";

grant update on table "public"."tags" to "service_role";

grant delete on table "public"."user_achievements" to "anon";

grant insert on table "public"."user_achievements" to "anon";

grant references on table "public"."user_achievements" to "anon";

grant select on table "public"."user_achievements" to "anon";

grant trigger on table "public"."user_achievements" to "anon";

grant truncate on table "public"."user_achievements" to "anon";

grant update on table "public"."user_achievements" to "anon";

grant delete on table "public"."user_achievements" to "authenticated";

grant insert on table "public"."user_achievements" to "authenticated";

grant references on table "public"."user_achievements" to "authenticated";

grant select on table "public"."user_achievements" to "authenticated";

grant trigger on table "public"."user_achievements" to "authenticated";

grant truncate on table "public"."user_achievements" to "authenticated";

grant update on table "public"."user_achievements" to "authenticated";

grant delete on table "public"."user_achievements" to "service_role";

grant insert on table "public"."user_achievements" to "service_role";

grant references on table "public"."user_achievements" to "service_role";

grant select on table "public"."user_achievements" to "service_role";

grant trigger on table "public"."user_achievements" to "service_role";

grant truncate on table "public"."user_achievements" to "service_role";

grant update on table "public"."user_achievements" to "service_role";

grant delete on table "public"."user_activity" to "anon";

grant insert on table "public"."user_activity" to "anon";

grant references on table "public"."user_activity" to "anon";

grant select on table "public"."user_activity" to "anon";

grant trigger on table "public"."user_activity" to "anon";

grant truncate on table "public"."user_activity" to "anon";

grant update on table "public"."user_activity" to "anon";

grant delete on table "public"."user_activity" to "authenticated";

grant insert on table "public"."user_activity" to "authenticated";

grant references on table "public"."user_activity" to "authenticated";

grant select on table "public"."user_activity" to "authenticated";

grant trigger on table "public"."user_activity" to "authenticated";

grant truncate on table "public"."user_activity" to "authenticated";

grant update on table "public"."user_activity" to "authenticated";

grant delete on table "public"."user_activity" to "service_role";

grant insert on table "public"."user_activity" to "service_role";

grant references on table "public"."user_activity" to "service_role";

grant select on table "public"."user_activity" to "service_role";

grant trigger on table "public"."user_activity" to "service_role";

grant truncate on table "public"."user_activity" to "service_role";

grant update on table "public"."user_activity" to "service_role";

grant delete on table "public"."user_bookmarks" to "anon";

grant insert on table "public"."user_bookmarks" to "anon";

grant references on table "public"."user_bookmarks" to "anon";

grant select on table "public"."user_bookmarks" to "anon";

grant trigger on table "public"."user_bookmarks" to "anon";

grant truncate on table "public"."user_bookmarks" to "anon";

grant update on table "public"."user_bookmarks" to "anon";

grant delete on table "public"."user_bookmarks" to "authenticated";

grant insert on table "public"."user_bookmarks" to "authenticated";

grant references on table "public"."user_bookmarks" to "authenticated";

grant select on table "public"."user_bookmarks" to "authenticated";

grant trigger on table "public"."user_bookmarks" to "authenticated";

grant truncate on table "public"."user_bookmarks" to "authenticated";

grant update on table "public"."user_bookmarks" to "authenticated";

grant delete on table "public"."user_bookmarks" to "service_role";

grant insert on table "public"."user_bookmarks" to "service_role";

grant references on table "public"."user_bookmarks" to "service_role";

grant select on table "public"."user_bookmarks" to "service_role";

grant trigger on table "public"."user_bookmarks" to "service_role";

grant truncate on table "public"."user_bookmarks" to "service_role";

grant update on table "public"."user_bookmarks" to "service_role";

grant delete on table "public"."user_friends" to "anon";

grant insert on table "public"."user_friends" to "anon";

grant references on table "public"."user_friends" to "anon";

grant select on table "public"."user_friends" to "anon";

grant trigger on table "public"."user_friends" to "anon";

grant truncate on table "public"."user_friends" to "anon";

grant update on table "public"."user_friends" to "anon";

grant delete on table "public"."user_friends" to "authenticated";

grant insert on table "public"."user_friends" to "authenticated";

grant references on table "public"."user_friends" to "authenticated";

grant select on table "public"."user_friends" to "authenticated";

grant trigger on table "public"."user_friends" to "authenticated";

grant truncate on table "public"."user_friends" to "authenticated";

grant update on table "public"."user_friends" to "authenticated";

grant delete on table "public"."user_friends" to "service_role";

grant insert on table "public"."user_friends" to "service_role";

grant references on table "public"."user_friends" to "service_role";

grant select on table "public"."user_friends" to "service_role";

grant trigger on table "public"."user_friends" to "service_role";

grant truncate on table "public"."user_friends" to "service_role";

grant update on table "public"."user_friends" to "service_role";

grant delete on table "public"."user_sessions" to "anon";

grant insert on table "public"."user_sessions" to "anon";

grant references on table "public"."user_sessions" to "anon";

grant select on table "public"."user_sessions" to "anon";

grant trigger on table "public"."user_sessions" to "anon";

grant truncate on table "public"."user_sessions" to "anon";

grant update on table "public"."user_sessions" to "anon";

grant delete on table "public"."user_sessions" to "authenticated";

grant insert on table "public"."user_sessions" to "authenticated";

grant references on table "public"."user_sessions" to "authenticated";

grant select on table "public"."user_sessions" to "authenticated";

grant trigger on table "public"."user_sessions" to "authenticated";

grant truncate on table "public"."user_sessions" to "authenticated";

grant update on table "public"."user_sessions" to "authenticated";

grant delete on table "public"."user_sessions" to "service_role";

grant insert on table "public"."user_sessions" to "service_role";

grant references on table "public"."user_sessions" to "service_role";

grant select on table "public"."user_sessions" to "service_role";

grant trigger on table "public"."user_sessions" to "service_role";

grant truncate on table "public"."user_sessions" to "service_role";

grant update on table "public"."user_sessions" to "service_role";

grant delete on table "public"."user_statistics" to "anon";

grant insert on table "public"."user_statistics" to "anon";

grant references on table "public"."user_statistics" to "anon";

grant select on table "public"."user_statistics" to "anon";

grant trigger on table "public"."user_statistics" to "anon";

grant truncate on table "public"."user_statistics" to "anon";

grant update on table "public"."user_statistics" to "anon";

grant delete on table "public"."user_statistics" to "authenticated";

grant insert on table "public"."user_statistics" to "authenticated";

grant references on table "public"."user_statistics" to "authenticated";

grant select on table "public"."user_statistics" to "authenticated";

grant trigger on table "public"."user_statistics" to "authenticated";

grant truncate on table "public"."user_statistics" to "authenticated";

grant update on table "public"."user_statistics" to "authenticated";

grant delete on table "public"."user_statistics" to "service_role";

grant insert on table "public"."user_statistics" to "service_role";

grant references on table "public"."user_statistics" to "service_role";

grant select on table "public"."user_statistics" to "service_role";

grant trigger on table "public"."user_statistics" to "service_role";

grant truncate on table "public"."user_statistics" to "service_role";

grant update on table "public"."user_statistics" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

create policy "Public bingo boards are viewable by everyone"
on "public"."bingo_boards"
as permissive
for select
to public
using (((is_public = true) OR (creator_id = ( SELECT auth.uid() AS uid))));


create policy "Users can create bingo boards"
on "public"."bingo_boards"
as permissive
for insert
to public
with check ((creator_id = ( SELECT auth.uid() AS uid)));


create policy "Users can delete their own bingo boards"
on "public"."bingo_boards"
as permissive
for delete
to public
using ((creator_id = ( SELECT auth.uid() AS uid)));


create policy "Users can update their own bingo boards"
on "public"."bingo_boards"
as permissive
for update
to public
using ((creator_id = ( SELECT auth.uid() AS uid)));


create policy "bingo_cards_delete"
on "public"."bingo_cards"
as permissive
for delete
to public
using ((creator_id = auth.uid()));


create policy "bingo_cards_insert"
on "public"."bingo_cards"
as permissive
for insert
to public
with check ((creator_id = auth.uid()));


create policy "bingo_cards_unified_select"
on "public"."bingo_cards"
as permissive
for select
to public
using (((is_public = true) OR (creator_id = auth.uid())));


create policy "bingo_cards_update"
on "public"."bingo_cards"
as permissive
for update
to public
using ((creator_id = auth.uid()));


create policy "Users can delete their own queue entries"
on "public"."bingo_queue_entries"
as permissive
for delete
to public
using ((user_id = ( SELECT auth.uid() AS uid)));


create policy "Users can insert their own queue entries"
on "public"."bingo_queue_entries"
as permissive
for insert
to public
with check ((user_id = ( SELECT auth.uid() AS uid)));


create policy "Users can update their own queue entries"
on "public"."bingo_queue_entries"
as permissive
for update
to public
using ((user_id = ( SELECT auth.uid() AS uid)));


create policy "Users can view their own queue entries"
on "public"."bingo_queue_entries"
as permissive
for select
to public
using ((user_id = ( SELECT auth.uid() AS uid)));


create policy "Session cells viewable by participants"
on "public"."bingo_session_cells"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM bingo_session_players bsp
  WHERE ((bsp.session_id = bingo_session_cells.session_id) AND (bsp.user_id = ( SELECT auth.uid() AS uid))))));


create policy "Session participants can update cells"
on "public"."bingo_session_cells"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM bingo_session_players bsp
  WHERE ((bsp.session_id = bingo_session_cells.session_id) AND (bsp.user_id = ( SELECT auth.uid() AS uid))))));


create policy "Session events viewable by participants"
on "public"."bingo_session_events"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM bingo_session_players bsp
  WHERE ((bsp.session_id = bingo_session_events.session_id) AND (bsp.user_id = ( SELECT auth.uid() AS uid))))));


create policy "Session participants can create events"
on "public"."bingo_session_events"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM bingo_session_players bsp
  WHERE ((bsp.session_id = bingo_session_events.session_id) AND (bsp.user_id = ( SELECT auth.uid() AS uid))))));


create policy "Allow session players access"
on "public"."bingo_session_players"
as permissive
for select
to public
using (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM bingo_sessions
  WHERE ((bingo_sessions.id = bingo_session_players.session_id) AND (bingo_sessions.host_id = ( SELECT auth.uid() AS uid)))))));


create policy "Users can join sessions"
on "public"."bingo_session_players"
as permissive
for insert
to public
with check ((user_id = ( SELECT auth.uid() AS uid)));


create policy "Users can leave sessions"
on "public"."bingo_session_players"
as permissive
for delete
to public
using (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM bingo_sessions
  WHERE ((bingo_sessions.id = bingo_session_players.session_id) AND (bingo_sessions.host_id = ( SELECT auth.uid() AS uid)))))));


create policy "session_queue_delete"
on "public"."bingo_session_queue"
as permissive
for delete
to public
using ((user_id = auth.uid()));


create policy "session_queue_insert"
on "public"."bingo_session_queue"
as permissive
for insert
to public
with check ((user_id = auth.uid()));


create policy "session_queue_unified_select"
on "public"."bingo_session_queue"
as permissive
for select
to public
using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM bingo_sessions
  WHERE ((bingo_sessions.id = bingo_session_queue.session_id) AND (bingo_sessions.host_id = auth.uid()))))));


create policy "session_queue_update"
on "public"."bingo_session_queue"
as permissive
for update
to public
using ((user_id = auth.uid()));


create policy "Session hosts can update their sessions"
on "public"."bingo_sessions"
as permissive
for update
to public
using ((host_id = ( SELECT auth.uid() AS uid)));


create policy "Users can create bingo sessions"
on "public"."bingo_sessions"
as permissive
for insert
to public
with check ((host_id = ( SELECT auth.uid() AS uid)));


create policy "Users can view sessions they're involved in"
on "public"."bingo_sessions"
as permissive
for select
to public
using (((status = ANY (ARRAY['waiting'::session_status, 'active'::session_status])) OR (host_id = ( SELECT auth.uid() AS uid))));


create policy "Users can manage their own bookmarks"
on "public"."board_bookmarks"
as permissive
for all
to public
using ((user_id = ( SELECT auth.uid() AS uid)));


create policy "Users can manage their own votes"
on "public"."board_votes"
as permissive
for all
to public
using ((user_id = ( SELECT auth.uid() AS uid)));


create policy "Users can manage their own card votes"
on "public"."card_votes"
as permissive
for all
to public
using ((user_id = ( SELECT auth.uid() AS uid)));


create policy "categories_admin_manage"
on "public"."categories"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role)))));


create policy "categories_unified_select"
on "public"."categories"
as permissive
for select
to public
using (true);


create policy "challenge_tags_manage"
on "public"."challenge_tags"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM challenges c
  WHERE ((c.id = challenge_tags.challenge_id) AND (c.created_by = auth.uid())))));


create policy "challenge_tags_unified_select"
on "public"."challenge_tags"
as permissive
for select
to public
using (true);


create policy "challenges_manage"
on "public"."challenges"
as permissive
for all
to public
using (((created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role))))));


create policy "challenges_unified_select"
on "public"."challenges"
as permissive
for select
to public
using (((status = 'published'::challenge_status) OR (created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role))))));


create policy "comments_unified_access"
on "public"."comments"
as permissive
for all
to public
using (true);


create policy "Allow event organizers to manage participants"
on "public"."community_event_participants"
as permissive
for all
to public
using ((( SELECT community_events.organizer_id
   FROM community_events
  WHERE (community_events.id = community_event_participants.event_id)) = auth.uid()));


create policy "Allow public read access to event participants"
on "public"."community_event_participants"
as permissive
for select
to public
using (true);


create policy "Allow users to manage their own participation"
on "public"."community_event_participants"
as permissive
for all
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Allow event organizers to manage tags"
on "public"."community_event_tags"
as permissive
for all
to public
using ((( SELECT community_events.organizer_id
   FROM community_events
  WHERE (community_events.id = community_event_tags.event_id)) = auth.uid()));


create policy "Allow public read access to event tags"
on "public"."community_event_tags"
as permissive
for select
to public
using (true);


create policy "Allow authenticated users to create events"
on "public"."community_events"
as permissive
for insert
to public
with check ((auth.role() = 'authenticated'::text));


create policy "Allow organizers to delete their own events"
on "public"."community_events"
as permissive
for delete
to public
using ((auth.uid() = organizer_id));


create policy "Allow organizers to update their own events"
on "public"."community_events"
as permissive
for update
to public
using ((auth.uid() = organizer_id))
with check ((auth.uid() = organizer_id));


create policy "Allow public read access for active/upcoming events"
on "public"."community_events"
as permissive
for select
to public
using ((status = ANY (ARRAY['upcoming'::event_status, 'active'::event_status])));


create policy "discussions_unified_access"
on "public"."discussions"
as permissive
for all
to public
using (true);


create policy "Game results unified access"
on "public"."game_results"
as permissive
for select
to public
using (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM bingo_session_players bsp
  WHERE ((bsp.session_id = game_results.session_id) AND (bsp.user_id = ( SELECT auth.uid() AS uid)))))));


create policy "submissions_manage"
on "public"."submissions"
as permissive
for all
to public
using (((user_id = auth.uid()) OR ( SELECT is_admin() AS is_admin)));


create policy "submissions_unified_select"
on "public"."submissions"
as permissive
for select
to public
using (((status = 'completed'::submission_status) OR (user_id = auth.uid()) OR ( SELECT is_admin() AS is_admin)));


create policy "System can create tag history"
on "public"."tag_history"
as permissive
for insert
to public
with check (true);


create policy "Tag history is viewable by moderators"
on "public"."tag_history"
as permissive
for select
to public
using (( SELECT is_admin() AS is_admin));


create policy "Moderators can view tag reports"
on "public"."tag_reports"
as permissive
for select
to public
using (( SELECT is_admin() AS is_admin));


create policy "Users can create tag reports"
on "public"."tag_reports"
as permissive
for insert
to public
with check ((user_id = ( SELECT auth.uid() AS uid)));


create policy "tag_votes_manage"
on "public"."tag_votes"
as permissive
for all
to public
using ((user_id = auth.uid()));


create policy "tag_votes_unified_select"
on "public"."tag_votes"
as permissive
for select
to public
using (true);


create policy "tags_manage"
on "public"."tags"
as permissive
for all
to public
using (((created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role))))));


create policy "tags_unified_select"
on "public"."tags"
as permissive
for select
to public
using ((status = ANY (ARRAY['active'::tag_status, 'verified'::tag_status])));


create policy "System can create user achievements"
on "public"."user_achievements"
as permissive
for insert
to public
with check (true);


create policy "Users can view their own achievements"
on "public"."user_achievements"
as permissive
for select
to public
using ((user_id = ( SELECT auth.uid() AS uid)));


create policy "Users can insert own activity"
on "public"."user_activity"
as permissive
for insert
to public
with check ((user_id = ( SELECT auth.uid() AS uid)));


create policy "Users can read own activity"
on "public"."user_activity"
as permissive
for select
to public
using ((user_id = ( SELECT auth.uid() AS uid)));


create policy "Users can delete their own bookmarks"
on "public"."user_bookmarks"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own bookmarks"
on "public"."user_bookmarks"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can view their own bookmarks"
on "public"."user_bookmarks"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can create friend requests"
on "public"."user_friends"
as permissive
for insert
to public
with check ((user_id = ( SELECT auth.uid() AS uid)));


create policy "Users can delete friend relationships they're part of"
on "public"."user_friends"
as permissive
for delete
to public
using (((user_id = ( SELECT auth.uid() AS uid)) OR (friend_id = ( SELECT auth.uid() AS uid))));


create policy "Users can update friend relationships they're part of"
on "public"."user_friends"
as permissive
for update
to public
using (((user_id = ( SELECT auth.uid() AS uid)) OR (friend_id = ( SELECT auth.uid() AS uid))));


create policy "Users can view their friend relationships"
on "public"."user_friends"
as permissive
for select
to public
using (((user_id = ( SELECT auth.uid() AS uid)) OR (friend_id = ( SELECT auth.uid() AS uid))));


create policy "Users can create their own sessions"
on "public"."user_sessions"
as permissive
for insert
to public
with check ((user_id = ( SELECT auth.uid() AS uid)));


create policy "Users can delete their own sessions"
on "public"."user_sessions"
as permissive
for delete
to public
using ((user_id = ( SELECT auth.uid() AS uid)));


create policy "Users can update their own sessions"
on "public"."user_sessions"
as permissive
for update
to public
using ((user_id = ( SELECT auth.uid() AS uid)));


create policy "Users can view their own sessions"
on "public"."user_sessions"
as permissive
for select
to public
using ((user_id = ( SELECT auth.uid() AS uid)));


create policy "Anyone can view user statistics"
on "public"."user_statistics"
as permissive
for select
to public
using (true);


create policy "user_statistics_select"
on "public"."user_statistics"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "user_statistics_select_policy"
on "public"."user_statistics"
as permissive
for select
to public
using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::user_role, 'moderator'::user_role])))))));


create policy "user_statistics_update"
on "public"."user_statistics"
as permissive
for update
to public
using ((user_id = auth.uid()));


create policy "user_statistics_update_policy"
on "public"."user_statistics"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::user_role, 'moderator'::user_role]))))));


create policy "Users can insert their own profile"
on "public"."users"
as permissive
for insert
to public
with check ((id = ( SELECT auth.uid() AS uid)));


create policy "Users can update their own profile"
on "public"."users"
as permissive
for update
to public
using ((id = ( SELECT auth.uid() AS uid)));


create policy "Users unified access"
on "public"."users"
as permissive
for select
to public
using ((( SELECT is_admin() AS is_admin) OR (profile_visibility = 'public'::visibility_type) OR (id = ( SELECT auth.uid() AS uid)) OR ((profile_visibility = 'friends'::visibility_type) AND (EXISTS ( SELECT 1
   FROM user_friends uf
  WHERE ((((uf.user_id = ( SELECT auth.uid() AS uid)) AND (uf.friend_id = users.id)) OR ((uf.friend_id = ( SELECT auth.uid() AS uid)) AND (uf.user_id = users.id))) AND (uf.status = 'accepted'::text)))))));


CREATE TRIGGER trigger_bingo_boards_updated_at BEFORE UPDATE ON public.bingo_boards FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_bingo_cards_updated_at BEFORE UPDATE ON public.bingo_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_bingo_session_cells_updated_at BEFORE UPDATE ON public.bingo_session_cells FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_bingo_session_events_updated_at BEFORE UPDATE ON public.bingo_session_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_bingo_session_players_updated_at BEFORE UPDATE ON public.bingo_session_players FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_bingo_session_queue_updated_at BEFORE UPDATE ON public.bingo_session_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bingo_session_queue_updated_at BEFORE UPDATE ON public.bingo_session_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER generate_session_code_trigger BEFORE INSERT ON public.bingo_sessions FOR EACH ROW EXECUTE FUNCTION generate_session_code();

CREATE TRIGGER increment_session_version_trigger BEFORE UPDATE ON public.bingo_sessions FOR EACH ROW EXECUTE FUNCTION increment_session_version();

CREATE TRIGGER trigger_bingo_sessions_updated_at BEFORE UPDATE ON public.bingo_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_bookmark_count_update AFTER INSERT OR DELETE ON public.board_bookmarks FOR EACH ROW EXECUTE FUNCTION update_bookmark_count();

CREATE TRIGGER trigger_board_votes_update AFTER INSERT OR DELETE OR UPDATE ON public.board_votes FOR EACH ROW EXECUTE FUNCTION update_board_votes();

CREATE TRIGGER trigger_board_votes_updated_at BEFORE UPDATE ON public.board_votes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_card_votes_updated_at BEFORE UPDATE ON public.card_votes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_challenges_updated_at BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_discussions_updated_at BEFORE UPDATE ON public.discussions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_stats_trigger AFTER INSERT ON public.game_results FOR EACH ROW EXECUTE FUNCTION update_user_statistics();

CREATE TRIGGER trigger_submissions_updated_at BEFORE UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_tag_votes_update AFTER INSERT OR DELETE OR UPDATE ON public.tag_votes FOR EACH ROW EXECUTE FUNCTION update_tag_votes();

CREATE TRIGGER trigger_tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_user_friends_updated_at BEFORE UPDATE ON public.user_friends FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_friends_updated_at BEFORE UPDATE ON public.user_friends FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_statistics_updated_at BEFORE UPDATE ON public.user_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_statistics_updated_at_trigger BEFORE UPDATE ON public.user_statistics FOR EACH ROW EXECUTE FUNCTION update_user_statistics_updated_at_func();

CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at();


