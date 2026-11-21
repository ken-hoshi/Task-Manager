"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppShell from "@/app/component/appShell/appShell";
import Loading from "@/app/component/loading/loading";
import NotificationBanner from "@/app/component/notificationBanner/notificationBanner";
import { getSession } from "@/app/hooks/getSession";
import { useSessionTimeout } from "@/app/hooks/sessionTimeout";
import { getUserId } from "@/app/lib/api/getUserId";
import { clientSupabase } from "@/app/lib/supabase/client";
import { useDisplayWorkspaceIdContext } from "@/app/provider/displayWorkspaceIdProvider";
import { useFormContext } from "@/app/provider/formProvider";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import MemberSection from "./memberSection";
import TaskGenreSection from "./taskGenreSection";
import type { ActiveForm, WorkspaceData, WorkspaceMember, WorkspaceTaskGenre } from "./types";
import WorkspaceInfoSection from "./workspaceInfoSection";

// workspace の select が返す行
interface WorkspaceRow {
  id: number;
  workspace_name: string;
  space_id: string;
  workspace_task_genre: { id: number; task_genre_name: string; sort_id: number }[];
  workspace_users: { users: { id: number; name: string } }[];
}

interface WorkspaceSettingsProps {
  workspaceId: number;
  userId: number;
  onUserResolved: (userId: number) => void;
}

// 1つのワークスペースの設定。切り替えると key で作り直すので、前のワークスペースの保存の返事はこの画面に届かない
const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = ({
  workspaceId,
  userId,
  onUserResolved,
}) => {
  const { setNotificationValue } = useNotificationContext();
  const { setBackForm } = useFormContext();
  const { setDisplayWorkspaceId } = useDisplayWorkspaceIdContext();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData>({
    id: 0,
    name: "",
    spaceId: "",
  });
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [genres, setGenres] = useState<WorkspaceTaskGenre[]>([]);
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);
  const [tab, setTab] = useState("genre");

  useEffect(() => {
    let ignore = false;

    (async () => {
      const session = await getSession();
      // URL ではなくログイン中の人から決める（他人の id を渡されても使わない）
      const sessionUserId = session ? await getUserId(session.user.id) : null;
      if (ignore) return;
      if (!workspaceId || !sessionUserId) {
        console.error("Fetch Data: User ID couldn't get.");
        setBackForm(true);
        alert("データの取得に失敗しました。");
        router.push("/");
        return;
      }
      onUserResolved(sessionUserId);

      try {
        const { data, error: selectWorkspaceDataError } = await clientSupabase
          .from("workspace")
          .select(
            "id, workspace_name, space_id, workspace_task_genre(id, task_genre_name, sort_id), workspace_users(users(id, name))"
          )
          .eq("id", workspaceId)
          .single();

        if (ignore) return;
        if (selectWorkspaceDataError) {
          throw selectWorkspaceDataError;
        }
        if (!data) {
          throw new Error("Workspace Data couldn't get.");
        }

        const row = data as unknown as WorkspaceRow;
        // 読めたワークスペースだけをサイドバーの表示中にする（外されたワークスペースを残すと、タスク画面が空になる）
        setDisplayWorkspaceId(workspaceId);
        setWorkspaceData({
          id: row.id,
          name: row.workspace_name,
          spaceId: row.space_id,
        });
        setMembers(row.workspace_users.map(({ users }) => ({ id: users.id, name: users.name })));
        setGenres(
          row.workspace_task_genre
            .map((taskGenre) => ({
              id: taskGenre.id,
              taskGenreName: taskGenre.task_genre_name,
              sortId: taskGenre.sort_id,
            }))
            .sort((a, b) => a.sortId - b.sortId)
        );
        setLoading(false);
      } catch (error) {
        console.error("Fetch Workspace Data", error);
        // タスク画面が最初のワークスペースを開くよう、表示中を空にする。移るまで読み込み中のままにする
        setDisplayWorkspaceId(null);
        router.push("/task");
        setNotificationValue({
          message: "ワークスペースを読めませんでした。",
          color: 1,
        });
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const handleTabChange = (value: string) => {
    setActiveForm(null);
    setTab(value);
  };

  if (loading) return <Loading />;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-6 py-6">
      <h1 className="text-xl font-semibold">ワークスペースの設定</h1>

      <WorkspaceInfoSection
        workspaceData={workspaceData}
        setWorkspaceData={setWorkspaceData}
        activeForm={activeForm}
        setActiveForm={setActiveForm}
      />

      <section aria-label="ジャンルとメンバー" className="rounded-lg border bg-card p-4">
        <Tabs value={tab} onValueChange={handleTabChange} className="gap-3">
          <TabsList>
            <TabsTrigger value="genre" className="px-3">
              ジャンル
            </TabsTrigger>
            <TabsTrigger value="member" className="px-3">
              メンバー
            </TabsTrigger>
          </TabsList>
          <TabsContent value="genre">
            <TaskGenreSection
              workspaceId={workspaceData.id}
              genres={genres}
              setGenres={setGenres}
              activeForm={activeForm}
              setActiveForm={setActiveForm}
            />
          </TabsContent>
          <TabsContent value="member">
            <MemberSection
              workspaceId={workspaceData.id}
              userId={userId}
              members={members}
              setMembers={setMembers}
              onOpenConfirm={() => setActiveForm(null)}
            />
          </TabsContent>
        </Tabs>
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/createWorkspace?atSignUp=false&workspaceId=${workspaceId}`)}
        >
          <Plus aria-hidden />
          ワークスペースを作成する
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/joinWorkspace?atSignUp=false&workspaceId=${workspaceId}`)}
        >
          <UserPlus aria-hidden />
          他のワークスペースに参加する
        </Button>
      </div>
    </div>
  );
};

// ワークスペースの設定の画面。サイドバーの枠の中に、URL のワークスペースの設定を置く（台帳 決定27）
const SuspenseEditWorkspace: React.FC = () => {
  const { notificationValue } = useNotificationContext();
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const searchParams = useSearchParams();
  const paramsWorkspaceId = Number(searchParams.get("workspaceId"));
  const [userId, setUserId] = useState(0);

  // 名前を変えたときの読み直しは、サイドバー（AppShell）が受け取る。この画面は読み直さないので、すぐ戻す
  useEffect(() => {
    if (pageUpdated) setPageUpdated(false);
  }, [pageUpdated]);

  useSessionTimeout();

  return (
    <>
      {notificationValue.message && (
        <NotificationBanner
          message={notificationValue.message}
          color={notificationValue.color}
        />
      )}
      <AppShell userId={userId} current={{ kind: "workspaceSettings" }}>
        <WorkspaceSettings
          key={paramsWorkspaceId}
          workspaceId={paramsWorkspaceId}
          userId={userId}
          onUserResolved={setUserId}
        />
      </AppShell>
    </>
  );
};

export default SuspenseEditWorkspace;
