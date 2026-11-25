import { Dispatch, SetStateAction } from "react";
import { ChevronRight, KeyRound, UserRound, UserRoundPen } from "lucide-react";
import { Button } from "@/components/ui/button";

export const EDIT_USER_BUTTON_ID = "account-edit-user";
export const EDIT_PASSWORD_BUTTON_ID = "account-edit-password";

interface ProfileProps {
  profileData: {
    name: string;
    email: string;
  };
  setSwitchDisplay: Dispatch<
    SetStateAction<{
      profile: boolean;
      userDataForm: boolean;
      passwordForm: boolean;
    }>
  >;
}

const ROW_CLASSES = "h-auto w-full justify-start gap-2 rounded-none px-4 py-3 font-normal";

// 「アカウントを削除」は、ブラウザから管理者用の API を呼んでいて必ず失敗していたので置かない（台帳 決定28）
const Profile: React.FC<ProfileProps> = ({ profileData, setSwitchDisplay }) => {
  return (
    <section aria-label="プロフィール" className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center gap-3 p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UserRound className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="m-0 font-semibold [overflow-wrap:anywhere]">{profileData.name}</p>
          <p className="m-0 mt-0.5 text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {profileData.email}
          </p>
        </div>
      </div>

      <div className="divide-y border-t">
        <Button
          id={EDIT_USER_BUTTON_ID}
          type="button"
          variant="ghost"
          className={ROW_CLASSES}
          onClick={() =>
            setSwitchDisplay({
              profile: false,
              userDataForm: true,
              passwordForm: false,
            })
          }
        >
          <UserRoundPen aria-hidden />
          <span className="flex-1 text-left">名前を編集</span>
          <ChevronRight className="text-muted-foreground" aria-hidden />
        </Button>
        <Button
          id={EDIT_PASSWORD_BUTTON_ID}
          type="button"
          variant="ghost"
          className={ROW_CLASSES}
          onClick={() =>
            setSwitchDisplay({
              profile: false,
              userDataForm: false,
              passwordForm: true,
            })
          }
        >
          <KeyRound aria-hidden />
          <span className="flex-1 text-left">パスワードを編集</span>
          <ChevronRight className="text-muted-foreground" aria-hidden />
        </Button>
      </div>
    </section>
  );
};

export default Profile;
