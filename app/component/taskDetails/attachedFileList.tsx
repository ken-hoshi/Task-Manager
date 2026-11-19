import { Download } from "lucide-react";
import { AttachedFileData } from "./types";

interface AttachedFileListProps {
  fileDataArray: AttachedFileData[] | undefined;
}

// 詳細の「添付ファイル」欄。ファイル名を押すとダウンロードできる
const AttachedFileList: React.FC<AttachedFileListProps> = ({
  fileDataArray,
}) => {
  if (!fileDataArray || fileDataArray.length === 0) {
    return <p className="m-0 text-muted-foreground">添付ファイルはありません</p>;
  }

  return (
    <ul className="m-0 list-none space-y-1 p-0">
      {fileDataArray.map((fileData, index) => (
        <li key={index}>
          <a
            href={fileData.url || "#"}
            download={fileData.file.name}
            className="inline-flex items-center gap-1.5 text-primary no-underline hover:underline"
          >
            <Download className="size-4" aria-hidden />
            {fileData.file.name}
          </a>
        </li>
      ))}
    </ul>
  );
};

export default AttachedFileList;
