import { DetailSection } from "@/components/detail-section";
import AttachedFileList from "@/app/component/taskDetails/attachedFileList";
import TaskGenreSummary from "@/app/component/taskDetails/taskGenreSummary";
import { AttachedFileData } from "@/app/component/taskDetails/types";

// 名前の無い小プロジェクトを、見出し・ボタンの名前・読み上げで指すときの言い方
export const UNNAMED = "（名前なし）";

export interface SmallProjectGenre {
  taskGenreId: number;
  taskGenreName: string;
  numberOfPersons: number;
  startDate: string;
  deadlineDate: string;
  numberOfDays: number;
}

interface SmallProjectDetailsProps {
  members: { id: number; name: string }[];
  genres: SmallProjectGenre[];
  details: string | null;
  attachedFiles: AttachedFileData[] | undefined;
}

// 小プロジェクトの詳細。メンバー・ジャンル・詳細・添付。
// タスク画面のプロジェクトの表と、プロジェクト画面の小プロジェクトの帯で使う
const SmallProjectDetails: React.FC<SmallProjectDetailsProps> = ({
  members,
  genres,
  details,
  attachedFiles,
}) => (
  <div className="grid gap-5 bg-muted/40 px-6 py-5 md:grid-cols-2">
    <DetailSection title="メンバー">
      {members.length > 0 ? (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {members.map((member) => (
            <li key={member.id} className="rounded-full bg-background px-2.5 py-0.5 text-xs ring-1 ring-border">
              {member.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-muted-foreground">メンバーはいません</p>
      )}
    </DetailSection>
    <DetailSection title="ジャンル">
      {genres.length > 0 ? (
        <div className="space-y-4">
          {genres.map((genre) => (
            <TaskGenreSummary key={genre.taskGenreId} taskGenre={genre} />
          ))}
        </div>
      ) : (
        <p className="m-0 text-muted-foreground">ジャンルはありません</p>
      )}
    </DetailSection>
    <DetailSection title="詳細">
      {details ? (
        <p className="m-0 whitespace-pre-wrap">{details}</p>
      ) : (
        <p className="m-0 text-muted-foreground">詳細はありません</p>
      )}
    </DetailSection>
    <DetailSection title="添付ファイル">
      <AttachedFileList fileDataArray={attachedFiles} />
    </DetailSection>
  </div>
);

export default SmallProjectDetails;
