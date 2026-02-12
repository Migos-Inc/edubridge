-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  username text unique,
  full_name text,
  avatar_url text,
  preferred_language text default 'en' not null,
  is_educator boolean default false not null
);

-- Row Level Security (RLS) for profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Courses table
create table public.courses (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  description text,
  thumbnail_url text,
  category text not null,
  difficulty_level text check (difficulty_level in ('beginner', 'intermediate', 'advanced')) default 'beginner' not null,
  estimated_hours integer,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  is_published boolean default false not null,
  languages text[] default array['en']::text[] not null
);

-- RLS for courses
alter table public.courses enable row level security;

create policy "Published courses are viewable by everyone"
  on public.courses for select
  using (is_published = true or auth.uid() = creator_id);

create policy "Educators can create courses"
  on public.courses for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_educator = true
    )
  );

create policy "Educators can update their own courses"
  on public.courses for update
  using (auth.uid() = creator_id);

create policy "Educators can delete their own courses"
  on public.courses for delete
  using (auth.uid() = creator_id);

-- Lessons table
create table public.lessons (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  description text,
  content jsonb default '{}'::jsonb not null,
  video_url text,
  video_size_mb numeric(10,2),
  compressed_video_url text,
  order_index integer not null,
  duration_minutes integer,
  is_free boolean default true not null
);

-- RLS for lessons
alter table public.lessons enable row level security;

create policy "Lessons from published courses are viewable by everyone"
  on public.lessons for select
  using (
    exists (
      select 1 from public.courses
      where id = course_id and (is_published = true or creator_id = auth.uid())
    )
  );

create policy "Educators can create lessons for their courses"
  on public.lessons for insert
  with check (
    exists (
      select 1 from public.courses
      where id = course_id and creator_id = auth.uid()
    )
  );

create policy "Educators can update lessons in their courses"
  on public.lessons for update
  using (
    exists (
      select 1 from public.courses
      where id = course_id and creator_id = auth.uid()
    )
  );

create policy "Educators can delete lessons from their courses"
  on public.lessons for delete
  using (
    exists (
      select 1 from public.courses
      where id = course_id and creator_id = auth.uid()
    )
  );

-- Translations table (for multi-language support)
create table public.translations (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  entity_type text check (entity_type in ('course', 'lesson')) not null,
  entity_id uuid not null,
  language_code text not null,
  field_name text not null,
  translated_text text not null,
  unique(entity_type, entity_id, language_code, field_name)
);

-- RLS for translations
alter table public.translations enable row level security;

create policy "Translations are viewable by everyone"
  on public.translations for select
  using (true);

create policy "Educators can create translations for their content"
  on public.translations for insert
  with check (
    (entity_type = 'course' and exists (
      select 1 from public.courses
      where id = entity_id and creator_id = auth.uid()
    )) or
    (entity_type = 'lesson' and exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = entity_id and c.creator_id = auth.uid()
    ))
  );

-- User Progress table
create table public.user_progress (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  completed boolean default false not null,
  progress_percentage integer default 0 not null check (progress_percentage >= 0 and progress_percentage <= 100),
  time_spent_minutes integer default 0 not null,
  last_position_seconds integer,
  unique(user_id, lesson_id)
);

-- RLS for user_progress
alter table public.user_progress enable row level security;

create policy "Users can view their own progress"
  on public.user_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own progress"
  on public.user_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own progress"
  on public.user_progress for update
  using (auth.uid() = user_id);

-- Downloaded content tracking table
create table public.downloaded_content (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  local_path text not null,
  file_size_mb numeric(10,2) not null,
  download_completed boolean default false not null,
  unique(user_id, lesson_id)
);

-- RLS for downloaded_content
alter table public.downloaded_content enable row level security;

create policy "Users can view their own downloaded content"
  on public.downloaded_content for select
  using (auth.uid() = user_id);

create policy "Users can track their own downloads"
  on public.downloaded_content for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own download records"
  on public.downloaded_content for update
  using (auth.uid() = user_id);

create policy "Users can delete their own download records"
  on public.downloaded_content for delete
  using (auth.uid() = user_id);

-- Indexes for better performance
create index courses_creator_id_idx on public.courses(creator_id);
create index courses_is_published_idx on public.courses(is_published);
create index lessons_course_id_idx on public.lessons(course_id);
create index lessons_order_index_idx on public.lessons(order_index);
create index translations_entity_idx on public.translations(entity_type, entity_id);
create index translations_language_idx on public.translations(language_code);
create index user_progress_user_id_idx on public.user_progress(user_id);
create index user_progress_lesson_id_idx on public.user_progress(lesson_id);
create index downloaded_content_user_id_idx on public.downloaded_content(user_id);

-- Function to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name)
  values (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers for updated_at
create trigger handle_profiles_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_courses_updated_at before update on public.courses
  for each row execute procedure public.handle_updated_at();

create trigger handle_lessons_updated_at before update on public.lessons
  for each row execute procedure public.handle_updated_at();

create trigger handle_user_progress_updated_at before update on public.user_progress
  for each row execute procedure public.handle_updated_at();
