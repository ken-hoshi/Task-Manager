"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronsUpDown, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusCounts } from "@/components/status-counts";
import { cn } from "@/lib/utils";
import SmallProjectDetails, {
  type SmallProjectGenre,
  UNNAMED,
} from "@/app/component/smallProjectDetails/smallProjectDetails";
import { AttachedFileData } from "@/app/component/taskDetails/types";
import { clientSupabase } from "@/app/lib/supabase/client";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";

interface SmallProjectStatusProps {
  smallProjectId: number;
  projectId: number;
  notStarted: number;
  processing: number;
  completed: number;
}

interface SmallProjectMembersProps {
  smallProjectId: number;
  membersDataArray: {
    id: number;
    name: string;
  }[];
}

interface SmallProjectTaskGenreProps {
  smallProjectId: number;
  taskGenreDataArray: SmallProjectGenre[];
}

interface SmallProjectAttachedFileProps {
  id: number;
  fileDataArray: AttachedFileData[];
}

// fetchProjectDetailsData が返す小プロジェクトの行のうち、帯で使う項目
interface SmallProjectRow {
  id: number;
  small_project_name: string | null;
  isFinished: boolean;
  details: string | null;
}

interface ProjectDetailsProps {
  userId: number;
  smallProjectData: SmallProjectRow[];
  smallProjectStatusData: SmallProjectStatusProps[];
  smallProjectMemberData: SmallProjectMembersProps[];
  smallProjectTaskGenreData: SmallProjectTaskGenreProps[];
  smallProjectAttachedFileData: SmallProjectAttachedFileProps[];
  smallProjectIdList: number[];
  displaySmallProjectId: number | null;
  setDisplaySmallProjectId: Dispatch<SetStateAction<number | null>>;
}

// プロジェクト画面のタブの上の帯。表示している小プロジェクトの名前・切り替え・件数・「完了にする」と、開くと出る詳細
const ProjectDetails: React.FC<ProjectDetailsProps> = ({
  smallProjectData,
  smallProjectStatusData,
  smallProjectMemberData,
  smallProjectTaskGenreData,
  smallProjectAttachedFileData,
  smallProjectIdList,
  displaySmallProjectId,
  setDisplaySmallProjectId,
}) => {
  // 最初の描画（データを選ぶ前）とデータが見つからないときは undefined にして、帯を描かない
  const [displaySmallProject, setDisplaySmallProject] = useState<
    SmallProjectRow | undefined
  >(undefined);
  const [smallProjectStatus, setSmallProjectStatus] =
    useState<SmallProjectStatusProps>({
      smallProjectId: 0,
      projectId: 0,
      notStarted: 0,
      processing: 0,
      completed: 0,
    });
  const [smallProjectMemberListData, setSmallProjectMemberListData] =
    useState<SmallProjectMembersProps>({
      smallProjectId: 0,
      membersDataArray: [],
    });
  const [smallProjectTaskGenreListData, setSmallProjectTaskGenreListData] =
    useState<SmallProjectTaskGenreProps>({
      smallProjectId: 0,
      taskGenreDataArray: [],
    });
  const [
    smallProjectAttachedFileListData,
    setSmallProjectAttachedFileListData,
  ] = useState<SmallProjectAttachedFileProps>({
    id: 0,
    fileDataArray: [],
  });
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { setNotificationValue } = useNotificationContext();
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const router = useRouter();

  useEffect(() => {
    const changedDisplaySmallProjectId =
      displaySmallProjectId &&
      smallProjectIdList.includes(displaySmallProjectId)
        ? displaySmallProjectId!
        : smallProjectIdList[0];

    const displaySmallProjectData = smallProjectData.find(
      (smallProject) => smallProject.id === changedDisplaySmallProjectId
    );

    const smallProjectStatus = smallProjectStatusData.find(
      (smallProjectStatus) =>
        smallProjectStatus.smallProjectId === changedDisplaySmallProjectId
    );

    const smallProjectMemberListData = smallProjectMemberData.find(
      (smallProjectMemberListData) =>
        smallProjectMemberListData.smallProjectId ===
        changedDisplaySmallProjectId
    );

    const smallProjectTaskGenreListData = smallProjectTaskGenreData.find(
      (projectTaskGenre) =>
        projectTaskGenre.smallProjectId === changedDisplaySmallProjectId
    );

    const smallProjectAttachedFileListData = smallProjectAttachedFileData.find(
      (smallProjectAttachedFileListData) =>
        smallProjectAttachedFileListData.id === changedDisplaySmallProjectId
    );

    if (
      !displaySmallProjectData ||
      !smallProjectStatus ||
      !smallProjectMemberListData ||
      !smallProjectTaskGenreListData ||
      !smallProjectAttachedFileListData
    ) {
      console.error("Data associated with displaySmallProjectId not found.");
      setNotificationValue({
        message: "プロジェクトのデータを読めませんでした。",
        color: 1,
      });
      router.push("/task");
    }
    setDisplaySmallProject(displaySmallProjectData);
    setSmallProjectStatus(smallProjectStatus!);
    setSmallProjectMemberListData(smallProjectMemberListData!);
    setSmallProjectTaskGenreListData(smallProjectTaskGenreListData!);
    setSmallProjectAttachedFileListData(smallProjectAttachedFileListData!);
  }, [pageUpdated, displaySmallProjectId]);

  const handleFinishedSmallProject = (
    smallProjectId: number,
    boolValue: boolean
  ) => {
    (async () => {
      const { error: updateSmallProjectError } = await clientSupabase
        .from("small_projects")
        .update({
          isFinished: !boolValue,
        })
        .eq("id", smallProjectId);

      if (updateSmallProjectError) {
        console.error("Update Small Projects", updateSmallProjectError);
        setNotificationValue({
          message: "小プロジェクトを更新できませんでした。",
          color: 1,
        });
      }
    })();
    setPageUpdated(true);
  };

  // データが見つからないとき（タスク画面へ戻る途中）は何も描かない
  if (!displaySmallProject || !smallProjectStatus) return null;

  const name = displaySmallProject.small_project_name || UNNAMED;
  const isFinished = Boolean(displaySmallProject.isFinished);

  return (
    <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} asChild>
      <section
        aria-labelledby="small-project-title"
        className="overflow-hidden rounded-xl border bg-card text-sm text-card-foreground shadow-xs"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h2
              id="small-project-title"
              className="m-0 truncate text-base font-semibold"
            >
              {name}
            </h2>
            {smallProjectData.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <ChevronsUpDown className="size-4" aria-hidden />
                    小プロジェクトを切り替える
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-56">
                  <DropdownMenuLabel>小プロジェクト</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={String(displaySmallProject.id)}
                    onValueChange={(value) =>
                      setDisplaySmallProjectId(Number(value))
                    }
                  >
                    {smallProjectData.map((smallProject) => (
                      <DropdownMenuRadioItem
                        key={smallProject.id}
                        value={String(smallProject.id)}
                      >
                        {smallProject.small_project_name || UNNAMED}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <StatusCounts counts={smallProjectStatus} label="タスクの件数" />
          {/* 押されているか（完了か）は aria-pressed と色で伝え、文字と名前は押しても変えない */}
          <Button
            variant={isFinished ? "secondary" : "outline"}
            size="sm"
            aria-pressed={isFinished}
            aria-label={`「${name}」を完了にする`}
            className={cn(isFinished && "text-status-done")}
            onClick={() =>
              handleFinishedSmallProject(displaySmallProject.id, isFinished)
            }
          >
            <CircleCheck className="size-4" aria-hidden />
            完了
          </Button>
          {/* 開いているかは aria-expanded と矢印の向きで伝え、名前は変えない */}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              詳細
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  detailsOpen && "rotate-180"
                )}
                aria-hidden
              />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="border-t">
          <SmallProjectDetails
            members={smallProjectMemberListData?.membersDataArray ?? []}
            genres={smallProjectTaskGenreListData?.taskGenreDataArray ?? []}
            details={displaySmallProject.details}
            attachedFiles={smallProjectAttachedFileListData?.fileDataArray}
          />
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
};

export default ProjectDetails;
