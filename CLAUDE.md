# Task-Manager

タスク管理アプリ（Next.js + Supabase）。2024年の版を、公開できる水準まで手直ししている。
画面ごとに UI を作り直している途中で、作り直していない画面には CSS Modules と英語の文言が残る。

Next.js は版が新しく、手元の知識と違うところがある。Next の API を書く前に `AGENTS.md` を読む。

## 確かめ方

変更のたびに、次の3つを通す。

1. `npx jest`
2. `npx tsc --noEmit`
3. ビルド：`.env.local` を一時フォルダへ移し、`NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy npx next build` で警告が0件であることを見て、`.env.local` を戻す

見た目や操作が変わる変更は、dev サーバー（ポート 3000）を内蔵ブラウザで開いても確かめる。jsdom にはアニメーションも配置も無いので、テストが通っても次のことは起きうる。
- Radix のメニューは、閉じる途中にフォーカスを中へ引き戻す。項目を選んだあとに別の欄へ移すなら、`onCloseAutoFocus` の中で移す
- 古い画面の CSS が、新しい部品に効く（「作り直しの決まり」）
- react-datepicker のカレンダーは、選び終えたあと jsdom の中でだけ開き直る。Escape を確かめるテストでは、カレンダーを開かずに済む形にする

## テストの書き方

- 画面に出る文字と、欄やボタンの名前（ロール）と、DB に送る値で確かめる。クラス名では確かめない
- Supabase は `test/helpers/mockSupabase.ts` で差し替える。返事は表ごとに、呼ばれる順に `setResponses` で並べる。返事に Promise を渡すと、返事が来ない状態（保存中）を作れる
- 不具合を直すときは、直す前の作りで落ちるテストを先に書き、落ちる理由が狙いどおりかを見てから直す。足したテストは、直した箇所を元に戻して落ちることも確かめる
- `act(async () => …)` の中で、開く操作と、開いたものを探す操作を続けて書かない。入れ子の act は外側を抜けるまで描画を反映しないので、開いた一覧が見つからない
- Radix の Select は、ボタンへの keyDown Enter で開く。react-select は ArrowDown で開く
- react-markdown と remark-gfm は ESM だけで配られていて Jest で読めない。使う部品のテストでは差し替える

## 作り直しの決まり

- 画面の言葉は日本語。ステータスは「未着手・進行中・完了」（DB の名前は英語のまま。`app/lib/taskStatus.ts`）
- 色は `app/globals.css` の CSS 変数（`--primary`・`--status-*`・`--overdue` など）を、Tailwind のクラスで使う
- 共通部品を先に探す：`components/ui/`（shadcn/ui）、`components/`（ConfirmDialog・FileDropzone・DateRangeField・MultiSelect・FormField・EmptyState）、`lib/dialog.ts`
- 操作できる要素は button か link にする。入力欄はすべてラベルを持つ
- 古い画面の CSS Modules は layer の外にあり、Tailwind のクラスより強い。新しい部品は、古い `dl`・`dt`・`dd`・`table` の外に置く
- 古い CSS の z-index は 40 以下にする（Sheet・Dialog が 50、通知の帯が 60）
- 1つの画面は、見た目の PR（`refactor:`）と、そのすぐあとの不具合の PR（`fix:`）に分ける。見た目の PR では保存の処理を変えず、作りを変えたことで変わる動きを説明文に書く
- 直していない不具合は README の「既知の問題」に書き、直したら消す

## PR

- PR の前に react-reviewer に差分を読ませ、指摘ごとに直すか、見送る理由を説明文に書く
- 説明文の節：目的 / 変更 / 動きが変わるところ / この PR でしないこと / 確かめたこと（Jest・tsc・build の件数と、ブラウザで見たこと）/ レビューの指摘と対応

push・デモの DB・テスト用アカウントなど個人の手順は、`CLAUDE.local.md` にある。
