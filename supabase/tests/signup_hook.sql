-- 登録前フック（hook_restrict_signup_by_email_domain）のテスト。
-- schema.sql を入れた DB の SQL Editor で、全体を1回で実行する。
-- 最後に rollback するので、許すドメインの表は元のまま残る。失敗すると「FAIL n: …」のエラーで止まり、
-- すべて通ると結果の欄に「14項目すべて通った」の1行が出る。

begin;

-- 表を空にして始める（rollback で元に戻る）
delete from private.signup_allowed_domains;

do $$
declare
  ok jsonb := '{}'::jsonb;
  rejected jsonb := jsonb_build_object(
    'error', jsonb_build_object('http_code', 403, 'message', 'このメールアドレスは使用できません。')
  );
  hook text := 'public.hook_restrict_signup_by_email_domain(jsonb)';
begin
  -- 表が空なら、どのドメインも通す
  if public.hook_restrict_signup_by_email_domain('{"user": {"email": "someone@gmail.com"}}') <> ok then
    raise exception 'FAIL 1: 表が空なのに断った';
  end if;

  insert into private.signup_allowed_domains (domain) values ('example.com');

  if public.hook_restrict_signup_by_email_domain('{"user": {"email": "someone@example.com"}}') <> ok then
    raise exception 'FAIL 2: 許すドメインを断った';
  end if;
  if public.hook_restrict_signup_by_email_domain('{"user": {"email": "Someone@EXAMPLE.com"}}') <> ok then
    raise exception 'FAIL 3: 大文字のドメインを断った';
  end if;
  if public.hook_restrict_signup_by_email_domain('{"user": {"email": "someone@gmail.com"}}') <> rejected then
    raise exception 'FAIL 4: 違うドメインを通した';
  end if;
  -- 画面の判定（@example.com で終わるか）と同じく、サブドメインは別のドメインとして扱う
  if public.hook_restrict_signup_by_email_domain('{"user": {"email": "someone@sub.example.com"}}') <> rejected then
    raise exception 'FAIL 5: サブドメインを通した';
  end if;
  if public.hook_restrict_signup_by_email_domain('{"user": {"email": "someone@example.com.evil.test"}}') <> rejected then
    raise exception 'FAIL 6: 許すドメインで始まる別のドメインを通した';
  end if;
  if public.hook_restrict_signup_by_email_domain('{"user": {}}') <> rejected then
    raise exception 'FAIL 7: メールの無い登録を通した';
  end if;
  -- @ が2つあるときは、最後の @ のあとで判定する（画面の判定と同じ）
  if public.hook_restrict_signup_by_email_domain('{"user": {"email": "a@example.com@evil.test"}}') <> rejected then
    raise exception 'FAIL 12: @ が2つあるアドレスを、途中のドメインで通した';
  end if;
  if public.hook_restrict_signup_by_email_domain('{"user": {"email": "a@evil.test@example.com"}}') <> ok then
    raise exception 'FAIL 13: @ が2つあるアドレスを、最後のドメインで断った';
  end if;

  -- 呼べるのは Supabase の認証だけ
  if has_function_privilege('anon', hook, 'execute') then
    raise exception 'FAIL 8: anon が呼べる';
  end if;
  if has_function_privilege('authenticated', hook, 'execute') then
    raise exception 'FAIL 9: authenticated が呼べる';
  end if;
  if not has_function_privilege('supabase_auth_admin', hook, 'execute') then
    raise exception 'FAIL 10: supabase_auth_admin が呼べない';
  end if;
  -- どれか1つでも権限があれば true になる
  if has_table_privilege('authenticated', 'private.signup_allowed_domains', 'SELECT, INSERT, UPDATE, DELETE') then
    raise exception 'FAIL 11: authenticated が許すドメインの表を読み書きできる';
  end if;
  if has_table_privilege('anon', 'private.signup_allowed_domains', 'SELECT, INSERT, UPDATE, DELETE') then
    raise exception 'FAIL 14: anon が許すドメインの表を読み書きできる';
  end if;

end $$;

rollback;

-- SQL Editor は notice を出さないので、最後まで進んだことを結果の1行で見せる
select '登録前フックのテスト: 14項目すべて通った' as result;
