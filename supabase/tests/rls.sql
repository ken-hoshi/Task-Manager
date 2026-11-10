-- RLS のテスト。schema.sql を入れた DB の SQL Editor で、全体を1回で実行する。
-- 2人（A・B）と、それぞれのワークスペースを作り、A になりすまして読み書きを試す。
-- 最後に rollback するので、データは残らない。失敗すると「FAIL n: …」のエラーで止まる。

begin;

-- ---------------------------------------------------------------
-- 準備（postgres の権限で作る）
-- ---------------------------------------------------------------

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'rls-test-a@example.com', '{"display_name": "RLS Test A"}', now(), now()),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'rls-test-b@example.com', '{"display_name": "RLS Test B"}', now(), now());

do $$
begin
  if (select count(*) from public.users where email like 'rls-test-%@example.com' and name like 'RLS Test %') <> 2 then
    raise exception 'FAIL 0: 登録のトリガーが users の行を作っていない';
  end if;
end $$;

insert into public.workspace (workspace_name, space_id) values
  ('RLS Test WS A', 'rlstestA'),
  ('RLS Test WS B', 'rlstestB');

insert into public.workspace_users (workspace_id, user_id)
  select w.id, u.id
  from public.workspace w
  join public.users u
    on (w.space_id = 'rlstestA' and u.email = 'rls-test-a@example.com')
    or (w.space_id = 'rlstestB' and u.email = 'rls-test-b@example.com');

insert into public.projects (project_name, workspace_id)
  select 'RLS Test P ' || space_id, id from public.workspace where space_id in ('rlstestA', 'rlstestB');

insert into public.small_projects (small_project_name, project_id)
  select 'RLS Test SP ' || right(project_name, 8), id from public.projects where project_name like 'RLS Test P %';

insert into public.tasks (task_name, deadline_date, start_date, number_of_days, assigned_user_id, small_project_id)
  select 'RLS Test T ' || right(sp.small_project_name, 8), current_date, current_date, 1, u.id, sp.id
  from public.small_projects sp
  join public.users u
    on (sp.small_project_name = 'RLS Test SP rlstestA' and u.email = 'rls-test-a@example.com')
    or (sp.small_project_name = 'RLS Test SP rlstestB' and u.email = 'rls-test-b@example.com');

insert into public.comments (task_id, user_id, comment_text)
  select id, assigned_user_id, 'RLS Test comment' from public.tasks where task_name like 'RLS Test T %';

-- A からは見えない B の id を、なりすます前に控える
select set_config('rls_test.ws_b', (select id::text from public.workspace where space_id = 'rlstestB'), true);
select set_config('rls_test.user_b', (select id::text from public.users where email = 'rls-test-b@example.com'), true);
select set_config('rls_test.task_b', (select id::text from public.tasks where task_name = 'RLS Test T rlstestB'), true);
select set_config('rls_test.sp_b', (select id::text from public.small_projects where small_project_name = 'RLS Test SP rlstestB'), true);

insert into public.task_attachments (task_id, file_path, file_name)
  values (current_setting('rls_test.task_b')::integer, 'public/rls-test-b-file', 'b.txt');

-- ---------------------------------------------------------------
-- A になりすます（まだ B のワークスペースに入っていない）
-- ---------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

do $$
declare
  n integer;
begin
  if (select count(*) from public.workspace where workspace_name like 'RLS Test %') <> 1 then
    raise exception 'FAIL 1: A に B のワークスペースが見える';
  end if;
  if (select count(*) from public.users where email like 'rls-test-%') <> 1 then
    raise exception 'FAIL 2: A に B の users の行が見える';
  end if;
  if (select count(*) from public.projects where project_name like 'RLS Test %') <> 1
     or (select count(*) from public.small_projects where small_project_name like 'RLS Test %') <> 1
     or (select count(*) from public.tasks where task_name like 'RLS Test %') <> 1
     or (select count(*) from public.comments where comment_text = 'RLS Test comment') <> 1 then
    raise exception 'FAIL 3: A に B のプロジェクト・タスク・コメントが見える';
  end if;
  if (select count(*) from public.task_status) <> 3 then
    raise exception 'FAIL 4: ログインした人が状態の一覧を読めない';
  end if;

  update public.tasks set task_name = 'hacked' where id = current_setting('rls_test.task_b')::integer;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL 5: A が B のタスクを変えられる';
  end if;

  delete from public.workspace_users where workspace_id = current_setting('rls_test.ws_b')::integer;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL 6: A が B のワークスペースのメンバーを外せる';
  end if;

  begin
    insert into public.projects (project_name, workspace_id)
      values ('RLS Test intrude', current_setting('rls_test.ws_b')::integer);
    raise exception 'FAIL 7: A が B のワークスペースにプロジェクトを足せる';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.workspace_users (workspace_id, user_id)
      values (current_setting('rls_test.ws_b')::integer, (select private.current_user_id()));
    raise exception 'FAIL 8: A が合言葉なしで B のワークスペースに入れる';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.tasks (task_name, deadline_date, start_date, number_of_days, assigned_user_id, small_project_id)
      values ('RLS Test intrude', current_date, current_date, 1,
              (select private.current_user_id()), current_setting('rls_test.sp_b')::integer);
    raise exception 'FAIL 24: 担当者を自分にすれば B の小プロジェクトにタスクを足せる';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.task_attachments (task_id, file_path, file_name)
      select id, 'public/rls-test-b-file', 'steal.txt' from public.tasks where task_name = 'RLS Test T rlstestA';
    raise exception 'FAIL 25: B のファイルと同じパスの添付の行を足せる';
  exception when unique_violation then null;
  end;

  begin
    insert into public.workspace (workspace_name, space_id) values ('RLS Test direct', 'rlsdirect');
    raise exception 'FAIL 9: RPC を通さずにワークスペースを足せる';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.mail_notifications (user_id, workspace_id, text)
      values (current_setting('rls_test.user_b')::integer, current_setting('rls_test.ws_b')::integer, 'RLS Test mail');
    raise exception 'FAIL 10: A が別のワークスペースの B に通知を送れる';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.create_workspace('RLS Test WS A');
    raise exception 'FAIL 11: 同じ名前のワークスペースを作れる';
  exception when unique_violation then null;
  end;

  if public.create_workspace('RLS Test WS new') !~ '^[A-Za-z0-9]{8}$' then
    raise exception 'FAIL 26: 作ったワークスペースの合言葉が英数字8文字でない';
  end if;

  if exists (select 1 from public.find_workspace_by_space_id('no-such-id')) then
    raise exception 'FAIL 12: 存在しない合言葉でワークスペースが引ける';
  end if;
  if (select count(*) from public.find_workspace_by_space_id('rlstestB')) <> 1 then
    raise exception 'FAIL 13: 合言葉で B のワークスペースを引けない';
  end if;

  begin
    perform public.join_workspaces(array['rlstestB', 'no-such-id']);
    raise exception 'FAIL 14: 合わない合言葉が混ざっていても参加できる';
  exception when no_data_found then null;
  end;
  if (select count(*) from public.workspace where workspace_name like 'RLS Test %') <> 1 then
    raise exception 'FAIL 15: 参加に失敗したのに一部だけ参加している';
  end if;
end $$;

-- 合言葉で B のワークスペースに参加する
select public.join_workspaces(array['rlstestB']);

do $$
declare
  n integer;
begin
  if (select count(*) from public.workspace where workspace_name like 'RLS Test %') <> 2 then
    raise exception 'FAIL 16: 参加したのに B のワークスペースが見えない';
  end if;
  if (select count(*) from public.users where email like 'rls-test-%') <> 2 then
    raise exception 'FAIL 17: 参加したのに B の users の行が見えない';
  end if;
  if (select count(*) from public.tasks where task_name like 'RLS Test %') <> 2 then
    raise exception 'FAIL 18: 参加したのに B のタスクが見えない';
  end if;

  update public.comments set comment_text = 'hacked'
    where task_id = current_setting('rls_test.task_b')::integer;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL 19: A が B のコメントを書き換えられる';
  end if;

  insert into public.mail_notifications (user_id, workspace_id, text)
    values (current_setting('rls_test.user_b')::integer, current_setting('rls_test.ws_b')::integer, 'RLS Test mail');
  if exists (select 1 from public.mail_notifications where text = 'RLS Test mail') then
    raise exception 'FAIL 20: A が B 宛ての通知を読める';
  end if;
end $$;

-- ---------------------------------------------------------------
-- ログインしていない人（anon）
-- ---------------------------------------------------------------

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

do $$
begin
  begin
    perform 1 from public.workspace limit 1;
    raise exception 'FAIL 21: ログインしていない人が workspace を読める';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.users limit 1;
    raise exception 'FAIL 22: ログインしていない人が users を読める';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.find_workspace_by_space_id('rlstestA');
    raise exception 'FAIL 23: ログインしていない人が合言葉でワークスペースを引ける';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
rollback;

select 'RLS テスト: すべて通過（テストのデータは取り消し済み）' as result;
